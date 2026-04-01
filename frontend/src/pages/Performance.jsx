import { useState, useEffect } from 'react';
import { MetricCard, PageHeader, LoadingSpinner } from '../components/ui';
import {
  TrendingUp, Target, BarChart3, Activity, Percent, Award,
  ChevronDown, ChevronUp, Zap, AlertTriangle
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';

// Load backtest results JSON — placed in public/ at build time or fetched
async function loadResults() {
  const res = await fetch('/data/backtest_v2_results.json');
  if (!res.ok) throw new Error('Failed to load backtest results');
  return res.json();
}

function formatPct(v) {
  if (v == null) return '—';
  const s = v >= 0 ? '+' : '';
  return `${s}${v.toFixed(1)}%`;
}

function formatMoney(v) {
  if (v == null) return '—';
  const s = v >= 0 ? '+' : '';
  return `${s}$${v.toFixed(0)}`;
}

const LEAGUE_COLORS = {
  'Premier League': '#6366f1',
  'Ligue 1': '#06b6d4',
  'La Liga': '#f59e0b',
  'Serie A': '#64748b',
  'Bundesliga': '#64748b',
};

const OUTCOME_COLORS = {
  'Home': '#00D4AA',
  'Draw': '#f59e0b',
  'Away': '#8B5CF6',
};

export default function Performance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadResults()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner label="Loading backtest results..." />;
  if (error) return (
    <div className="glass-card p-8 text-center">
      <AlertTriangle className="mx-auto mb-3 text-warning" size={32} />
      <p className="text-sm text-text-muted">Could not load backtest data: {error}</p>
      <p className="text-xs text-text-muted mt-2">Run <code className="text-primary">python backtest_v2.py --seasons 5</code> to generate results.</p>
    </div>
  );

  const { summary: s, league_stats, outcome_breakdown, monthly_pnl, bankroll_history, edge_buckets } = data;

  // Process bankroll curve — deduplicate dates, take last value per date
  const bankrollMap = new Map();
  if (bankroll_history) {
    for (const [date, value] of bankroll_history) {
      bankrollMap.set(date, value);
    }
  }
  const bankrollData = Array.from(bankrollMap.entries()).map(([date, value]) => ({
    date,
    bankroll: parseFloat(value.toFixed(2)),
  }));

  // Monthly P&L bars
  const monthlyData = Object.entries(monthly_pnl || {}).map(([month, pnl]) => ({
    month: month.slice(2), // "24-01" from "2024-01"
    pnl: parseFloat(pnl.toFixed(2)),
  }));

  // League stats as array
  const leagues = Object.entries(league_stats || {}).map(([name, stats]) => ({
    name,
    ...stats,
    color: LEAGUE_COLORS[name] || '#64748b',
  }));

  // Outcome breakdown
  const outcomes = Object.entries(outcome_breakdown || {}).map(([name, stats]) => ({
    name,
    ...stats,
    color: OUTCOME_COLORS[name] || '#64748b',
  }));

  return (
    <div>
      <PageHeader title="Performance" subtitle={`Backtest v2 — ${data.period?.start} to ${data.period?.end} — ${s.total_matches.toLocaleString()} matches`}>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-card border border-border-subtle">
          <Award size={14} className="text-primary" />
          <span className="text-xs font-medium text-text-secondary">Engine {data.engine_version}</span>
        </div>
      </PageHeader>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <MetricCard label="ROI" value={formatPct(s.roi_pct)} icon={TrendingUp} variant={s.roi_pct > 0 ? 'primary' : 'danger'} />
        <MetricCard label="Signals" value={s.total_signals} icon={Zap} />
        <MetricCard label="Hit Rate" value={formatPct(s.hit_rate * 100)} icon={Target} />
        <MetricCard label="Max Drawdown" value={`${s.max_drawdown_pct.toFixed(1)}%`} icon={Activity} />
        <MetricCard label="Sharpe Ratio" value={s.sharpe_ratio.toFixed(3)} icon={BarChart3} />
        <MetricCard label="Final Bank" value={`$${s.final_bankroll.toFixed(0)}`} icon={Percent}
          change={s.roi_pct} changeLabel="from $1,000" />
      </div>

      {/* Bankroll Curve */}
      <div className="glass-card p-6 mb-6">
        <h2 className="text-lg font-semibold text-text-primary mb-1">Bankroll Curve</h2>
        <p className="text-xs text-text-muted mb-4">$1,000 starting bankroll — fractional Kelly staking</p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={bankrollData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <defs>
                <linearGradient id="bankrollGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00D4AA" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#00D4AA" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} domain={['dataMin - 20', 'dataMax + 20']}
                tickFormatter={v => `$${v}`} />
              <Tooltip
                contentStyle={{ background: '#141720', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#94a3b8' }}
                formatter={v => [`$${v.toFixed(2)}`, 'Bankroll']}
              />
              <Area type="monotone" dataKey="bankroll" stroke="#00D4AA" strokeWidth={2}
                fill="url(#bankrollGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Monthly P&L */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-1">Monthly P&L</h2>
          <p className="text-xs text-text-muted mb-4">Net profit/loss per calendar month</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} interval={0} angle={-45} textAnchor="end" height={40} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip
                  contentStyle={{ background: '#141720', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                  formatter={v => [`$${v.toFixed(2)}`, 'P&L']}
                />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                  {monthlyData.map((entry, i) => (
                    <Cell key={i} fill={entry.pnl >= 0 ? '#00D4AA' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* League Breakdown */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">League Performance</h2>
          <div className="space-y-4">
            {leagues.map(l => (
              <div key={l.name} className="flex items-center gap-4">
                <div className="w-2 h-10 rounded-full" style={{ background: l.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-text-primary">{l.name}</span>
                    <span className={`text-sm font-bold ${l.roi_pct >= 0 ? 'text-success' : 'text-danger'}`}>
                      {formatPct(l.roi_pct)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-text-muted">
                    <span>{l.signals} signals</span>
                    <span>{(l.hit_rate * 100).toFixed(0)}% hit</span>
                    <span>{formatMoney(l.pnl)}</span>
                  </div>
                  {/* ROI bar */}
                  <div className="mt-1.5 h-1.5 rounded-full bg-bg-hover overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min(Math.abs(l.roi_pct), 50)}%`,
                        background: l.roi_pct >= 0 ? l.color : '#ef4444',
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Outcome Breakdown */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">By Outcome</h2>
          <div className="space-y-3">
            {outcomes.map(o => (
              <div key={o.name} className="flex items-center justify-between p-3 rounded-lg bg-bg-hover/50">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ background: o.color }} />
                  <div>
                    <span className="text-sm font-semibold text-text-primary">{o.name}</span>
                    <div className="text-xs text-text-muted">{o.signals} signals · {(o.hit_rate * 100).toFixed(0)}% hit</div>
                  </div>
                </div>
                <span className={`text-sm font-bold ${o.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                  {formatMoney(o.pnl)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Key Stats */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Key Statistics</h2>
          <div className="space-y-3">
            {[
              { label: 'Total Staked', value: `$${s.total_staked.toFixed(0)}` },
              { label: 'Total P&L', value: formatMoney(s.total_pnl), positive: s.total_pnl >= 0 },
              { label: 'Avg Odds (Winners)', value: s.avg_odds_won.toFixed(2) },
              { label: 'Avg Odds (Losers)', value: s.avg_odds_lost.toFixed(2) },
              { label: 'Best Streak', value: `${s.best_streak} W`, positive: true },
              { label: 'Worst Streak', value: `${s.worst_streak} L`, positive: false },
              { label: 'Win / Loss', value: `${s.wins} / ${s.losses}` },
              { label: 'Signal Rate', value: `${((s.matches_with_signals / s.total_matches) * 100).toFixed(1)}%` },
            ].map(stat => (
              <div key={stat.label} className="flex items-center justify-between py-1.5 border-b border-border-subtle/50 last:border-0">
                <span className="text-xs text-text-muted">{stat.label}</span>
                <span className={`text-sm font-semibold ${
                  stat.positive === true ? 'text-success' : stat.positive === false ? 'text-danger' : 'text-text-primary'
                }`}>{stat.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Edge Buckets */}
        {edge_buckets && (
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Edge Distribution</h2>
            <div className="space-y-3">
              {Object.entries(edge_buckets).map(([bucket, stats]) => (
                <div key={bucket} className="flex items-center justify-between p-3 rounded-lg bg-bg-hover/50">
                  <div>
                    <span className="text-sm font-semibold text-text-primary">{bucket}</span>
                    <div className="text-xs text-text-muted">{stats.count} signals · {(stats.hit_rate * 100).toFixed(0)}% hit</div>
                  </div>
                  <span className={`text-sm font-bold ${stats.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                    {formatMoney(stats.pnl)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Model Info Footer */}
      <div className="glass-card p-4 text-center">
        <p className="text-xs text-text-muted">
          Dixon-Coles Poisson · Isotonic Calibration · Venue-Split Strength · Exponential Decay ·
          Fractional Kelly · Generated {data.generated_at ? new Date(data.generated_at).toLocaleString() : 'N/A'}
        </p>
      </div>
    </div>
  );
}
