import { useState, useEffect, useMemo } from 'react';
import { Link2, Filter, TrendingUp, AlertCircle } from 'lucide-react';
import api from '../api';

export default function CorrelatedParlayFinder() {
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [minCorr, setMinCorr] = useState(0.6);
  const [maxLegs, setMaxLegs] = useState(3);

  useEffect(() => {
    (async () => {
      try {
        const bt = await api.v2Backtest();
        setBets(bt.bets || []);
      } catch { setBets([]); }
      setLoading(false);
    })();
  }, []);

  const parlays = useMemo(() => {
    if (bets.length < 2) return [];

    // Group bets by date to find same-day correlated outcomes
    const byDate = {};
    bets.forEach(b => {
      const d = b.date || b.match_date || 'unknown';
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(b);
    });

    const combos = [];
    Object.entries(byDate).forEach(([date, dayBets]) => {
      if (dayBets.length < 2) return;
      // Generate combinations up to maxLegs
      const n = Math.min(dayBets.length, 6);
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const legs = [dayBets[i], dayBets[j]];
          if (maxLegs >= 3 && j + 1 < n) {
            // Try adding a 3rd leg
            const third = dayBets[j + 1];
            const combo3 = buildParlay([...legs, third], date);
            if (combo3.score >= minCorr) combos.push(combo3);
          }
          const combo2 = buildParlay(legs, date);
          if (combo2.score >= minCorr) combos.push(combo2);
        }
      }
    });

    return combos.sort((a, b) => b.score - a.score).slice(0, 20);
  }, [bets, minCorr, maxLegs]);

  function buildParlay(legs, date) {
    const combinedOdds = legs.reduce((acc, b) => acc * (b.odds || 2.0), 1);
    const avgEv = legs.reduce((acc, b) => acc + (b.ev || 0), 0) / legs.length;
    const allWon = legs.every(b => b.result === 'Win');
    const anyResult = legs.some(b => b.result);
    // Correlation score heuristic: same league + similar odds range + both positive EV
    const sameLeague = legs.every(b => b.league === legs[0].league) ? 0.2 : 0;
    const bothEv = legs.every(b => (b.ev || 0) > 0) ? 0.3 : 0;
    const oddsRange = Math.max(...legs.map(b => b.odds || 2)) - Math.min(...legs.map(b => b.odds || 2));
    const oddsBonus = oddsRange < 0.5 ? 0.2 : oddsRange < 1 ? 0.1 : 0;
    const hitBonus = allWon ? 0.3 : 0;
    const score = Math.min(1, 0.3 + sameLeague + bothEv + oddsBonus + hitBonus);

    return { legs, date, combinedOdds, avgEv, allWon, anyResult, score, legCount: legs.length };
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          <Link2 size={24} className="inline mr-2 text-[var(--color-primary)]" />
          Correlated Parlay Finder
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Find historically correlated outcomes to build smarter multi-leg parlays.
        </p>
      </div>

      {/* Filters */}
      <div className="fs-card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              Min Correlation Score: <strong style={{ color: 'var(--color-text-primary)' }}>{(minCorr * 100).toFixed(0)}%</strong>
            </label>
            <input type="range" min={0.3} max={1} step={0.05} value={minCorr}
              onChange={e => setMinCorr(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--color-primary)' }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              Max Legs: <strong style={{ color: 'var(--color-text-primary)' }}>{maxLegs}</strong>
            </label>
            <div className="flex gap-2 mt-1">
              {[2, 3, 4].map(n => (
                <button key={n} onClick={() => setMaxLegs(n)}
                  className="px-4 py-1.5 rounded-full text-xs font-medium transition-colors"
                  style={{
                    background: maxLegs === n ? 'var(--color-primary)' : 'var(--color-bg-elevated)',
                    color: maxLegs === n ? '#fff' : 'var(--color-text-secondary)',
                    border: `1px solid ${maxLegs === n ? 'var(--color-primary)' : 'var(--color-border-subtle)'}`,
                  }}>
                  {n}-Leg
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {parlays.length === 0 ? (
        <div className="fs-card text-center py-10">
          <AlertCircle size={40} className="mx-auto mb-3" style={{ color: 'var(--color-text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            No correlated parlays found with the current filters. Try lowering the correlation threshold.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {parlays.map((p, i) => (
            <div key={i} className="fs-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--color-primary)', color: '#fff' }}>
                    {p.legCount}-LEG
                  </span>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{p.date}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Combined Odds</p>
                    <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{p.combinedOdds.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Avg EV</p>
                    <p className="text-sm font-bold" style={{ color: p.avgEv > 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {(p.avgEv * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Correlation</p>
                    <p className="text-sm font-bold" style={{ color: p.score >= 0.8 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                      {(p.score * 100).toFixed(0)}%
                    </p>
                  </div>
                  {p.anyResult && (
                    <span className={`fs-status ${p.allWon ? 'won' : 'lost'}`}>
                      {p.allWon ? 'ALL HIT' : 'MISS'}
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                {p.legs.map((leg, li) => (
                  <div key={li} className="flex items-center justify-between px-3 py-2 rounded-lg text-xs"
                    style={{ background: 'var(--color-bg-elevated)' }}>
                    <span style={{ color: 'var(--color-text-primary)' }}>{leg.match || leg.teams || 'Match'}</span>
                    <div className="flex items-center gap-3">
                      <span style={{ color: 'var(--color-text-muted)' }}>{leg.league || ''}</span>
                      <span style={{ color: 'var(--color-text-secondary)' }}>@ {(leg.odds || 2).toFixed(2)}</span>
                      {leg.result && <span className={`fs-status ${leg.result === 'Win' ? 'won' : 'lost'}`}>{leg.result}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
