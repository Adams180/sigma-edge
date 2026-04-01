import { useState, useEffect } from 'react';
import { api } from '../api';
import { PageHeader, LoadingSpinner, EmptyState, LeagueBadge, EVBadge } from '../components/ui';
import { TrendingUp, Search, SlidersHorizontal, Wifi, WifiOff } from 'lucide-react';

function formatKickoff(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function ValueScanner() {
  const [bankroll] = useState(1000);
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [totalExposure, setTotalExposure] = useState(0);

  useEffect(() => {
    // Try live API first, fall back to latest backtest signals
    async function load() {
      try {
        const liveData = await api.v2Signals(bankroll);
        setSignals(liveData.signals || []);
        setTotalExposure(liveData.total_exposure_pct || 0);
        setIsLive(true);
      } catch {
        // Fallback: load most recent backtest signals
        try {
          const res = await fetch('/data/backtest_v2_results.json');
          if (!res.ok) throw new Error('No data');
          const bt = await res.json();
          // Show the last 20 won signals as "recent value finds"
          const recent = (bt.signals || [])
            .slice(-30)
            .reverse()
            .map(s => ({
              ...s,
              match: s.match,
              decimal_odds: s.odds,
              our_prob: s.calibrated_prob,
              kelly_used: s.kelly_pct,
              stake_amount: s.stake,
              bookmaker: 'Historical',
            }));
          setSignals(recent);
          setIsLive(false);
        } catch {
          setError('No data available. Start the API or run the backtest.');
        }
      }
      setLoading(false);
    }
    load();
  }, [bankroll]);

  return (
    <div>
      <PageHeader title="Value Scanner" subtitle="Market inefficiency detection — Dixon-Coles v2 engine">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-bg-card border border-border-subtle text-xs text-text-secondary">
          {isLive ? <Wifi size={14} className="text-success" /> : <WifiOff size={14} className="text-warning" />}
          <span>{isLive ? 'Live — The Odds API' : 'Historical — Backtest Data'}</span>
          <span className="text-text-muted">|</span>
          <SlidersHorizontal size={14} />
          <span>Bankroll: ${bankroll}</span>
        </div>
      </PageHeader>

      {loading ? (
        <LoadingSpinner label="Scanning for market edges..." />
      ) : error ? (
        <div className="glass-card p-6 text-center text-danger text-sm">{error}</div>
      ) : signals.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No Edges Detected"
          description="No market inefficiencies found. Edges appear when model probabilities diverge significantly from bookmaker odds."
        />
      ) : (
        <>
          {/* Summary bar */}
          <div className="glass-card p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-success animate-pulse' : 'bg-warning'}`} />
                <span className="text-sm font-semibold text-text-primary">{signals.length} signal{signals.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="h-4 w-px bg-border-subtle" />
              <span className="text-xs text-text-muted">
                Best edge: <span className="text-primary font-bold">+{(Math.max(...signals.map(s => s.ev)) * 100).toFixed(1)}%</span>
              </span>
            </div>
            {isLive && (
              <div className="text-xs text-text-muted">
                Total exposure: <span className="text-warning font-semibold">{(totalExposure * 100).toFixed(1)}%</span>
              </div>
            )}
          </div>

          {/* Signal cards */}
          <div className="space-y-4">
            {signals.map((s, i) => (
              <div
                key={`${s.match}-${s.outcome}-${i}`}
                className={`glass-card p-6 ${s.won === false ? 'border-l-2 border-l-danger' : s.won === true ? 'border-l-2 border-l-success' : 'signal-glow-green'}`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <LeagueBadge league={s.league} />
                    <span className="text-base font-bold text-text-primary">{s.match}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <EVBadge ev={s.ev} />
                    {s.date && <span className="text-xs text-text-muted">{s.date}</span>}
                    {s.kickoff && <span className="text-xs text-text-muted">{formatKickoff(s.kickoff)}</span>}
                    {s.won !== undefined && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.won ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                        {s.won ? '✓ WON' : '✗ LOST'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Market label */}
                <div className="flex items-center gap-2 mb-5">
                  <TrendingUp size={16} className="text-primary" />
                  <span className="text-sm font-semibold text-text-primary">
                    Match Result — {s.outcome}
                  </span>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[
                    { label: 'Model Probability', value: `${(s.our_prob * 100).toFixed(1)}%`, color: 'text-primary', highlight: true },
                    { label: 'Market Implied', value: `${(s.market_prob * 100).toFixed(1)}%`, color: 'text-text-primary' },
                    { label: 'Decimal Odds', value: s.decimal_odds.toFixed(2), color: 'text-text-primary' },
                    { label: 'Edge', value: `+${(s.edge * 100).toFixed(1)}%`, color: 'text-accent-light' },
                    { label: 'Kelly Fraction', value: `${(s.kelly_used * 100).toFixed(2)}%`, color: 'text-warning' },
                    { label: 'Recommended Stake', value: `$${s.stake_amount.toFixed(0)}`, color: 'text-primary', highlight: true },
                  ].map((stat) => (
                    <div key={stat.label} className={`p-3 rounded-xl ${stat.highlight ? 'bg-bg-hover' : ''}`}>
                      <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">{stat.label}</div>
                      <div className={`text-base font-bold ${stat.color}`}>{stat.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
