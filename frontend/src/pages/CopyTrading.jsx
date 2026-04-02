import { useState, useEffect } from 'react';
import { Users, TrendingUp, TrendingDown, Flame, Calendar, BarChart3, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import api from '../api';

const MODEL_VARIANTS = [
  {
    id: 'value_hunter',
    name: 'Value Hunter',
    description: 'Focuses on markets where the model has the highest EV. Conservative Kelly sizing.',
    risk: 'Medium',
    style: 'Statistical',
    followers: 1240,
    roi30d: 18.4,
    winRate: 63,
    avgOdds: 2.15,
    maxDrawdown: 8.2,
    sharpe: 2.1,
    tags: ['EV-focused', 'H2H', 'Top 5 leagues'],
    color: '#6366f1',
  },
  {
    id: 'odds_on_hitter',
    name: 'Odds-On Hitter',
    description: 'Short price specialists. High hit rate, low variance. Targets odds under 1.80.',
    risk: 'Low',
    style: 'High Hit Rate',
    followers: 892,
    roi30d: 9.7,
    winRate: 72,
    avgOdds: 1.62,
    maxDrawdown: 3.1,
    sharpe: 3.4,
    tags: ['Low odds', 'High volume', 'Favorites'],
    color: '#22c55e',
  },
  {
    id: 'underdog_engine',
    name: 'Underdog Engine',
    description: 'Contrarian model that targets mispriced underdogs. High variance but strong long-run EV.',
    risk: 'High',
    style: 'Contrarian',
    followers: 654,
    roi30d: 34.2,
    winRate: 41,
    avgOdds: 3.80,
    maxDrawdown: 28.5,
    sharpe: 1.2,
    tags: ['Underdogs', 'Draws', 'Value heavy'],
    color: '#f97316',
  },
  {
    id: 'combo_specialist',
    name: 'Combo Specialist',
    description: 'Builds 3-4 leg accumulators from correlated same-day events. Low stake, high multiplier.',
    risk: 'High',
    style: 'Accumulator',
    followers: 421,
    roi30d: 22.6,
    winRate: 35,
    avgOdds: 8.50,
    maxDrawdown: 35.0,
    sharpe: 0.9,
    tags: ['Accumulators', '3+ legs', 'Weekend specials'],
    color: '#a855f7',
  },
];

const RISK_COLORS = { Low: 'var(--color-success)', Medium: 'var(--color-warning)', High: 'var(--color-danger)' };

export default function CopyTrading() {
  const [myStats, setMyStats] = useState(null);
  const [followed, setFollowed] = useState(new Set(['value_hunter']));
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const bt = await api.v2Backtest();
        const bets = bt.bets || [];
        const wins = bets.filter(b => b.result === 'Win').length;
        const total = bets.filter(b => b.result).length;
        setMyStats({ roi: total ? (((wins - (total - wins)) / total) * 100).toFixed(1) : '0.0', bets: total, wins });
      } catch {}
      setLoading(false);
    })();
  }, []);

  const toggleFollow = (id) => {
    setFollowed(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            <Users size={24} className="inline mr-2 text-[var(--color-primary)]" />
            Copy Trading
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Follow a model strategy and auto-mirror its signals. Select a strategy that fits your risk profile.
          </p>
        </div>
        <div className="text-xs px-3 py-1.5 rounded-full" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--color-primary)', border: '1px solid rgba(99,102,241,0.3)' }}>
          {followed.size} strateg{followed.size === 1 ? 'y' : 'ies'} followed
        </div>
      </div>

      {/* Grid of model cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        {MODEL_VARIANTS.map(m => {
          const isFollowed = followed.has(m.id);
          const isSelected = selected === m.id;
          return (
            <div key={m.id} className="fs-card" style={{
              cursor: 'pointer',
              border: `1px solid ${isFollowed ? m.color + '60' : 'var(--color-border-subtle)'}`,
              background: isFollowed ? m.color + '08' : undefined,
            }}
              onClick={() => setSelected(isSelected ? null : m.id)}>
              {/* Card header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black"
                    style={{ background: m.color + '20', color: m.color }}>
                    {m.name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{m.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                        style={{ background: RISK_COLORS[m.risk] + '20', color: RISK_COLORS[m.risk] }}>
                        {m.risk} Risk
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{m.style}</span>
                    </div>
                  </div>
                </div>
                <button onClick={e => { e.stopPropagation(); toggleFollow(m.id); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: isFollowed ? 'var(--color-success)' : m.color,
                    color: '#fff',
                  }}>
                  {isFollowed ? '✓ Following' : '+ Follow'}
                </button>
              </div>

              {/* Description */}
              <p className="text-xs mb-4 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{m.description}</p>

              {/* Stats row */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[
                  { label: '30d ROI', value: `+${m.roi30d}%`, color: 'var(--color-success)' },
                  { label: 'Win Rate', value: `${m.winRate}%`, color: 'var(--color-info)' },
                  { label: 'Sharpe', value: m.sharpe, color: 'var(--color-primary)' },
                  { label: 'Max DD', value: `${m.maxDrawdown}%`, color: 'var(--color-warning)' },
                ].map(s => (
                  <div key={s.label} className="text-center p-2 rounded-lg" style={{ background: 'var(--color-bg-elevated)' }}>
                    <div className="text-sm font-bold" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1">
                {m.tags.map(t => (
                  <span key={t} className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border-subtle)' }}>
                    {t}
                  </span>
                ))}
              </div>

              {/* Followers */}
              <div className="flex items-center gap-1 mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
                <Users size={12} style={{ color: 'var(--color-text-muted)' }} />
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{m.followers.toLocaleString()} followers</span>
                <span className="ml-auto text-xs" style={{ color: 'var(--color-text-muted)' }}>Avg odds: {m.avgOdds}</span>
              </div>

              {/* Expanded: simulated recent signals */}
              {isSelected && (
                <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
                  <p className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text-secondary)' }}>Recent Signals</p>
                  <div className="space-y-2">
                    {[
                      { match: 'Manchester City vs Arsenal', odds: 1.85, ev: 4.2, result: 'Win' },
                      { match: 'Real Madrid vs Barcelona', odds: 2.10, ev: 6.8, result: 'Win' },
                      { match: 'Bayern vs Dortmund', odds: 1.72, ev: 3.1, result: 'Loss' },
                      { match: 'PSG vs Lyon', odds: 1.95, ev: 5.4, result: 'Win' },
                    ].map((s, i) => (
                      <div key={i} className="flex items-center justify-between text-xs px-3 py-2 rounded-lg"
                        style={{ background: 'var(--color-bg-elevated)' }}>
                        <span style={{ color: 'var(--color-text-primary)' }}>{s.match}</span>
                        <div className="flex items-center gap-3">
                          <span style={{ color: 'var(--color-text-secondary)' }}>@ {s.odds}</span>
                          <span style={{ color: 'var(--color-success)' }}>+{s.ev}% EV</span>
                          {s.result === 'Win'
                            ? <CheckCircle size={13} style={{ color: 'var(--color-success)' }} />
                            : <XCircle size={13} style={{ color: 'var(--color-danger)' }} />
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* My performance vs followed */}
      {myStats && followed.size > 0 && (
        <div className="fs-card">
          <div className="fs-card-header">
            <span className="fs-card-title">Your Model vs Followed Strategies</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
            <div className="fs-kpi-card">
              <div className="fs-kpi-header"><span className="fs-kpi-label">Your ROI</span></div>
              <div className="fs-kpi-value" style={{ color: parseFloat(myStats.roi) >= 0 ? 'var(--color-success)' : 'var(--color-danger)', fontSize: '1.5rem' }}>{myStats.roi}%</div>
            </div>
            {MODEL_VARIANTS.filter(m => followed.has(m.id)).slice(0, 3).map(m => (
              <div key={m.id} className="fs-kpi-card">
                <div className="fs-kpi-header"><span className="fs-kpi-label">{m.name}</span></div>
                <div className="fs-kpi-value" style={{ color: m.color, fontSize: '1.5rem' }}>+{m.roi30d}%</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
