import { useState, useEffect } from 'react';
import { Ghost, TrendingUp, TrendingDown, Eye, DollarSign, BarChart3, RefreshCw } from 'lucide-react';
import { BackendLoading, BackendError } from '../components/ui/BackendStatus';
import api from '../api';

const VIRTUAL_BANKROLL = 1000;

export default function GhostModel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const bt = await api.v2Backtest();
        // Simulate ghost model — same signals, but none actually placed
        const signals = bt.bets || [];
        let bank = VIRTUAL_BANKROLL;
        let wins = 0, losses = 0, peak = VIRTUAL_BANKROLL;
        const history = [];

        signals.forEach((s, i) => {
          const stake = Math.max(5, Math.round(bank * 0.02));
          const won = s.result === 'Win';
          const pnl = won ? stake * ((s.odds || 2.0) - 1) : -stake;
          bank += pnl;
          if (won) wins++; else losses++;
          if (bank > peak) peak = bank;
          history.push({
            day: i + 1,
            match: `${s.home_team || 'Home'} vs ${s.away_team || 'Away'}`,
            league: s.league || '—',
            market: s.market || 'H2H',
            odds: s.odds || 2.0,
            ev: s.ev ? (s.ev * 100).toFixed(1) : '—',
            stake,
            pnl: Math.round(pnl),
            bank: Math.round(bank),
            won,
          });
        });

        const maxDD = peak > 0 ? (((peak - Math.min(...history.map(h => h.bank))) / peak) * 100).toFixed(1) : '0';
        setData({
          bankroll: Math.round(bank),
          roi: (((bank - VIRTUAL_BANKROLL) / VIRTUAL_BANKROLL) * 100).toFixed(1),
          wins, losses,
          hitRate: signals.length ? ((wins / signals.length) * 100).toFixed(1) : '0',
          maxDrawdown: maxDD,
          totalSignals: signals.length,
          history: history.slice(-30), // last 30
        });
      } catch (err) { setError(err.message); setData(null); }
      setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <BackendLoading label="Running ghost simulation…" />;
  if (error) return <BackendError msg={error} onRetry={load} />;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            <Ghost size={24} className="inline mr-2 opacity-60" />
            Ghost Model
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Shadow-run every signal without placing real bets. Prove the model before risking bankroll.
          </p>
        </div>
        <div className="px-3 py-1.5 rounded-full text-xs font-medium" style={{
          background: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)',
          border: '1px solid var(--color-border-subtle)'
        }}>
          <Eye size={12} className="inline mr-1" /> Virtual Mode — No Real Bets
        </div>
      </div>

      {/* KPI Row */}
      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Virtual P&L', value: `$${data.bankroll - VIRTUAL_BANKROLL > 0 ? '+' : ''}${data.bankroll - VIRTUAL_BANKROLL}`, color: data.bankroll >= VIRTUAL_BANKROLL ? 'var(--color-success)' : 'var(--color-danger)', icon: DollarSign },
              { label: 'Ghost ROI', value: `${data.roi}%`, color: parseFloat(data.roi) >= 0 ? 'var(--color-success)' : 'var(--color-danger)', icon: TrendingUp },
              { label: 'Hit Rate', value: `${data.hitRate}%`, color: 'var(--color-info)', icon: BarChart3 },
              { label: 'Max Drawdown', value: `${data.maxDrawdown}%`, color: 'var(--color-warning)', icon: TrendingDown },
            ].map(k => (
              <div key={k.label} className="fs-kpi-card">
                <div className="fs-kpi-header">
                  <span className="fs-kpi-label">{k.label}</span>
                  <k.icon size={16} style={{ color: 'var(--color-text-muted)' }} />
                </div>
                <div className="fs-kpi-value" style={{ color: k.color, fontSize: '1.6rem' }}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Record */}
          <div className="flex gap-6 mb-6 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <span><strong style={{ color: 'var(--color-success)' }}>{data.wins}W</strong> / <strong style={{ color: 'var(--color-danger)' }}>{data.losses}L</strong></span>
            <span>{data.totalSignals} total signals shadow-tracked</span>
            <span>Starting bankroll: ${VIRTUAL_BANKROLL}</span>
          </div>

          {/* Ghost History Table */}
          <div className="fs-card">
            <div className="fs-card-header">
              <span className="fs-card-title"><Ghost size={16} /> Ghost Ledger (Last 30)</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="fs-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>#</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>MATCH</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>ODDS</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>EV%</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>STAKE</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>P&L</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>BANK</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>RESULT</th>
                  </tr>
                </thead>
                <tbody>
                  {data.history.map((h, i) => (
                    <tr key={i}>
                      <td style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{h.day}</td>
                      <td style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', color: 'var(--color-text-primary)' }}>{h.match}</td>
                      <td style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{h.odds.toFixed(2)}</td>
                      <td style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', color: 'var(--color-info)' }}>{h.ev}%</td>
                      <td style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>${h.stake}</td>
                      <td style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', fontWeight: 600, color: h.pnl >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                        {h.pnl >= 0 ? '+' : ''}{h.pnl}
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', color: 'var(--color-text-primary)', fontWeight: 600 }}>${h.bank}</td>
                      <td style={{ padding: '0.5rem 0.75rem' }}>
                        <span className={`fs-status ${h.won ? 'won' : 'lost'}`}>{h.won ? 'Won' : 'Lost'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      {!data && (
        <div className="fs-card text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
          No backtest data available. Run the engine first.
        </div>
      )}
    </div>
  );
}
