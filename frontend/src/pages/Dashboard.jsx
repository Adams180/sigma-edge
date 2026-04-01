import { useState, useEffect } from 'react';
import { MetricCard, PageHeader, LoadingSpinner, LeagueBadge, EVBadge } from '../components/ui';
import { TrendingUp, Target, Zap, BarChart3, ArrowRight, Trophy, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';

async function loadBacktest() {
  const res = await fetch('/data/backtest_v2_results.json');
  if (!res.ok) throw new Error('No backtest data');
  return res.json();
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBacktest().then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const s = data?.summary;
  const signals = data?.signals || [];
  const recentSignals = signals.slice(-20).reverse(); // Last 20 signals, newest first
  const leagueStats = data?.league_stats || {};

  // Mini bankroll chart data
  const bankrollMap = new Map();
  for (const [date, value] of (data?.bankroll_history || [])) {
    bankrollMap.set(date, value);
  }
  const sparkData = Array.from(bankrollMap.entries()).map(([d, v]) => ({ d, v: +v.toFixed(0) }));

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Sigma Edge — AI-powered betting intelligence">
        <Link to="/performance" className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-card border border-border-subtle hover:border-primary/40 transition-colors">
          <Trophy size={14} className="text-primary" />
          <span className="text-xs font-medium text-text-secondary">
            {s ? `+${s.roi_pct.toFixed(1)}% ROI Proven` : 'View Performance'}
          </span>
        </Link>
      </PageHeader>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <MetricCard
          label="Proven ROI"
          value={loading ? '...' : s ? `+${s.roi_pct.toFixed(1)}%` : '—'}
          icon={TrendingUp}
          variant="primary"
        />
        <MetricCard
          label="Total Signals"
          value={loading ? '...' : s?.total_signals || '—'}
          icon={Zap}
        />
        <MetricCard
          label="Hit Rate"
          value={loading ? '...' : s ? `${(s.hit_rate * 100).toFixed(1)}%` : '—'}
          icon={Target}
        />
        <MetricCard
          label="Max Drawdown"
          value={loading ? '...' : s ? `${s.max_drawdown_pct.toFixed(1)}%` : '—'}
          icon={Activity}
        />
        <MetricCard
          label="Sharpe Ratio"
          value={loading ? '...' : s ? s.sharpe_ratio.toFixed(3) : '—'}
          icon={BarChart3}
        />
        <MetricCard
          label="Final Bank"
          value={loading ? '...' : s ? `$${s.final_bankroll.toFixed(0)}` : '—'}
          icon={Trophy}
          change={s?.roi_pct}
          changeLabel="from $1,000"
        />
      </div>

      {/* Bankroll mini-chart */}
      {sparkData.length > 0 && (
        <div className="glass-card p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text-primary">Bankroll Growth</h2>
            <Link to="/performance" className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-light transition-colors">
              Full Report <ArrowRight size={14} />
            </Link>
          </div>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData}>
                <defs>
                  <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00D4AA" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#00D4AA" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip
                  contentStyle={{ background: '#141720', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                  formatter={v => [`$${v}`, 'Bankroll']}
                  labelFormatter={l => l}
                />
                <Area type="monotone" dataKey="v" stroke="#00D4AA" strokeWidth={2} fill="url(#sparkGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent Signals — 3 cols */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-primary">Recent Signals</h2>
            <Link to="/signals" className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-light transition-colors">
              View All <ArrowRight size={14} />
            </Link>
          </div>
          {loading ? (
            <LoadingSpinner label="Loading..." />
          ) : recentSignals.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <p className="text-sm text-text-muted">No signal data. Run the backtest to generate results.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentSignals.slice(0, 8).map((sig, i) => (
                <div key={`${sig.date}-${sig.match}-${i}`} className={`glass-card p-4 ${sig.won ? 'border-l-2 border-l-success' : 'border-l-2 border-l-danger'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <LeagueBadge league={sig.league} />
                      <span className="text-sm font-semibold text-text-primary">{sig.match}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <EVBadge ev={sig.ev} />
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sig.won ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                        {sig.won ? `+$${sig.pnl.toFixed(0)}` : `-$${Math.abs(sig.pnl).toFixed(0)}`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-text-muted">
                    <span>{sig.date}</span>
                    <span>{sig.outcome} @ {sig.odds.toFixed(2)}</span>
                    <span>Model: {(sig.calibrated_prob * 100).toFixed(0)}% vs Market: {(sig.market_prob * 100).toFixed(0)}%</span>
                    <span>Stake: ${sig.stake.toFixed(0)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* League Performance — 2 cols */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-text-primary mb-4">League Performance</h2>
          <div className="space-y-3">
            {Object.entries(leagueStats).map(([name, stats]) => (
              <div key={name} className="glass-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <LeagueBadge league={name} />
                  <span className={`text-sm font-bold ${stats.roi_pct >= 0 ? 'text-success' : 'text-danger'}`}>
                    {stats.roi_pct >= 0 ? '+' : ''}{stats.roi_pct.toFixed(1)}% ROI
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-text-muted">
                  <span>{stats.signals} signals</span>
                  <span>{(stats.hit_rate * 100).toFixed(0)}% hit rate</span>
                  <span className={stats.pnl >= 0 ? 'text-success' : 'text-danger'}>
                    {stats.pnl >= 0 ? '+' : ''}${stats.pnl.toFixed(0)}
                  </span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-bg-hover overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(Math.abs(stats.roi_pct), 50)}%`,
                      background: stats.roi_pct >= 0 ? '#00D4AA' : '#ef4444',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Quick Stats */}
          {s && (
            <div className="glass-card p-4 mt-3">
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Quick Stats</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Win / Loss', value: `${s.wins} / ${s.losses}` },
                  { label: 'Avg Odds (W)', value: s.avg_odds_won.toFixed(2) },
                  { label: 'Best Streak', value: `${s.best_streak}W` },
                  { label: 'Worst Streak', value: `${Math.abs(s.worst_streak)}L` },
                ].map(stat => (
                  <div key={stat.label} className="flex justify-between text-xs">
                    <span className="text-text-muted">{stat.label}</span>
                    <span className="text-text-primary font-semibold">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
