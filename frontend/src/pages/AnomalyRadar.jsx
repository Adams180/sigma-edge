import { useState, useEffect } from 'react';
import { AlertTriangle, TrendingUp, ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react';
import api from '../api';

export default function AnomalyRadar() {
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [minGap, setMinGap] = useState(5);

  useEffect(() => {
    (async () => {
      try {
        const bt = await api.v2Backtest();
        const bets = bt.bets || [];
        // Find bets where model probability diverges from implied odds probability
        const found = bets.map(b => {
          const impliedProb = b.odds ? (1 / b.odds) * 100 : 50;
          const modelProb = b.ev ? (impliedProb + b.ev * 100) : impliedProb;
          const gap = modelProb - impliedProb;
          return {
            match: `${b.home_team || 'Home'} vs ${b.away_team || 'Away'}`,
            league: b.league || '—',
            market: b.market || 'H2H',
            odds: b.odds || 2.0,
            impliedProb: impliedProb.toFixed(1),
            modelProb: modelProb.toFixed(1),
            gap: gap.toFixed(1),
            absGap: Math.abs(gap),
            direction: gap > 0 ? 'overvalued' : 'undervalued',
            result: b.result,
            ev: b.ev ? (b.ev * 100).toFixed(1) : '0',
          };
        })
        .filter(a => a.absGap >= minGap)
        .sort((a, b) => b.absGap - a.absGap);
        setAnomalies(found);
      } catch { setAnomalies([]); }
      setLoading(false);
    })();
  }, [minGap]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            <AlertTriangle size={24} className="inline mr-2 text-[var(--color-warning)]" />
            Anomaly Radar
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Fixtures where bookmaker odds diverge from the model. Bigger gap = bigger potential edge.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} style={{ color: 'var(--color-text-muted)' }} />
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Min gap:</span>
          {[3, 5, 8, 12].map(g => (
            <button key={g} onClick={() => setMinGap(g)}
              className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
              style={{
                background: minGap === g ? 'var(--color-primary)' : 'var(--color-bg-elevated)',
                color: minGap === g ? '#fff' : 'var(--color-text-secondary)',
                border: '1px solid ' + (minGap === g ? 'var(--color-primary)' : 'var(--color-border-subtle)'),
              }}>{g}%+</button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex gap-6 mb-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        <span><strong style={{ color: 'var(--color-text-primary)' }}>{anomalies.length}</strong> anomalies detected</span>
        <span><strong style={{ color: 'var(--color-success)' }}>{anomalies.filter(a => a.direction === 'overvalued').length}</strong> overvalued by market</span>
        <span><strong style={{ color: 'var(--color-danger)' }}>{anomalies.filter(a => a.direction === 'undervalued').length}</strong> undervalued</span>
      </div>

      <div className="fs-card">
        <div style={{ overflowX: 'auto' }}>
          <table className="fs-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                {['MATCH', 'LEAGUE', 'ODDS', 'IMPLIED %', 'MODEL %', 'GAP', 'EV%', 'RESULT'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '0.6rem 0.75rem', fontSize: '0.7rem', color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {anomalies.slice(0, 50).map((a, i) => (
                <tr key={i}>
                  <td style={{ padding: '0.6rem 0.75rem', fontSize: '0.82rem', color: 'var(--color-text-primary)', fontWeight: 500 }}>{a.match}</td>
                  <td style={{ padding: '0.6rem 0.75rem', fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>{a.league}</td>
                  <td style={{ padding: '0.6rem 0.75rem', fontSize: '0.82rem', color: 'var(--color-text-primary)', fontWeight: 600 }}>{a.odds.toFixed(2)}</td>
                  <td style={{ padding: '0.6rem 0.75rem', fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>{a.impliedProb}%</td>
                  <td style={{ padding: '0.6rem 0.75rem', fontSize: '0.82rem', color: 'var(--color-info)', fontWeight: 600 }}>{a.modelProb}%</td>
                  <td style={{ padding: '0.6rem 0.75rem' }}>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{
                      background: a.direction === 'overvalued' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                      color: a.direction === 'overvalued' ? 'var(--color-success)' : 'var(--color-danger)',
                    }}>
                      {a.direction === 'overvalued' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      {a.gap}%
                    </span>
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem', fontSize: '0.82rem', color: 'var(--color-info)' }}>{a.ev}%</td>
                  <td style={{ padding: '0.6rem 0.75rem' }}>
                    {a.result && <span className={`fs-status ${a.result === 'Win' ? 'won' : 'lost'}`}>{a.result}</span>}
                  </td>
                </tr>
              ))}
              {anomalies.length === 0 && (
                <tr><td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No anomalies at this threshold.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
