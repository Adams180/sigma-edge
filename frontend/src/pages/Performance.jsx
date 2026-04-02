import { useState, useEffect } from 'react';
import { MetricCard, PageHeader, LoadingSpinner } from '../components/ui';
import { useTheme } from '../contexts/ThemeContext';
import {
  TrendingUp, Target, BarChart3, Activity, Percent, Award,
  ChevronDown, ChevronUp, Zap, AlertTriangle, Download, FileText
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import api from '../api';

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
  'Premier League': '#635BFF',
  'Ligue 1': '#0EBFE9',
  'La Liga': '#F5A623',
  'Serie A': '#64748b',
  'Bundesliga': '#64748b',
};

const OUTCOME_COLORS = {
  'Home': '#635BFF',
  'Draw': '#F5A623',
  'Away': '#0EBFE9',
};

export default function Performance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { theme } = useTheme();

  const chartColors = {
    primary: '#635BFF',
    success: '#30B130',
    danger: '#DF1B41',
    grid: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
    tick: theme === 'dark' ? '#64748b' : '#8898aa',
    tooltipBg: theme === 'dark' ? '#1a1f36' : '#ffffff',
    tooltipBorder: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
  };

  useEffect(() => {
    api.v2Backtest()
      .then(d => { setData(d); setLoading(false); })
      .catch(() =>
        fetch('/data/backtest_v2_results.json')
          .then(r => { if (!r.ok) throw new Error('No data'); return r.json(); })
          .then(d => { setData(d); })
          .catch(e => setError(e.message))
          .finally(() => setLoading(false))
      );
  }, []);

  if (loading) return <LoadingSpinner label="Loading backtest results..." />;
  if (error) return (
    <div className="stripe-card p-8 text-center">
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
      <div className="stripe-card p-6 mb-6">
        <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>Bankroll Curve</h2>
        <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>$1,000 starting bankroll — fractional Kelly staking</p>
        <div className="h-72 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={bankrollData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <defs>
                <linearGradient id="bankrollGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColors.primary} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={chartColors.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: chartColors.tick }} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: chartColors.tick }} tickLine={false} domain={['dataMin - 20', 'dataMax + 20']}
                tickFormatter={v => `$${v}`} />
              <Tooltip
                contentStyle={{ background: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: chartColors.tick }}
                formatter={v => [`$${v.toFixed(2)}`, 'Bankroll']}
              />
              <Area type="monotone" dataKey="bankroll" stroke={chartColors.primary} strokeWidth={2}
                fill="url(#bankrollGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Monthly P&L */}
        <div className="stripe-card p-6">
          <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>Monthly P&L</h2>
          <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>Net profit/loss per calendar month</p>
          <div className="h-56 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: chartColors.tick }} tickLine={false} interval={0} angle={-45} textAnchor="end" height={40} />
                <YAxis tick={{ fontSize: 10, fill: chartColors.tick }} tickLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip
                  contentStyle={{ background: chartColors.tooltipBg, border: `1px solid ${chartColors.tooltipBorder}`, borderRadius: 8, fontSize: 12 }}
                  formatter={v => [`$${v.toFixed(2)}`, 'P&L']}
                />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                  {monthlyData.map((entry, i) => (
                    <Cell key={i} fill={entry.pnl >= 0 ? chartColors.success : chartColors.danger} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* League Breakdown */}
        <div className="stripe-card p-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>League Performance</h2>
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
        <div className="stripe-card p-6">
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
        <div className="stripe-card p-6">
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
          <div className="stripe-card p-6">
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

      {/* Sharpe Deep-Dive + Tax Export Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Sharpe Ratio breakdown */}
        <div className="stripe-card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-1">Sharpe Ratio Tracker</h2>
          <p className="text-xs text-text-muted mb-4">Risk-adjusted return relative to a 0% risk-free rate</p>
          <div className="space-y-3">
            {[
              { label: 'Overall Sharpe', value: s.sharpe_ratio?.toFixed(3) ?? '—', desc: 'Full backtest period', color: s.sharpe_ratio > 1.5 ? 'var(--color-success)' : s.sharpe_ratio > 0.8 ? 'var(--color-warning)' : 'var(--color-danger)' },
              { label: 'ROI', value: `${s.roi_pct?.toFixed(1)}%`, desc: 'Total return on staked capital', color: s.roi_pct >= 0 ? 'var(--color-success)' : 'var(--color-danger)' },
              { label: 'Max Drawdown', value: `${s.max_drawdown_pct?.toFixed(1)}%`, desc: 'Peak-to-trough loss', color: 'var(--color-warning)' },
              { label: 'Recovery Factor', value: s.max_drawdown_pct > 0 ? (s.roi_pct / s.max_drawdown_pct).toFixed(2) : '—', desc: 'ROI ÷ Max Drawdown', color: 'var(--color-info)' },
              { label: 'Win / Loss Ratio', value: s.wins && s.losses ? (s.wins / Math.max(1, s.losses)).toFixed(2) : '—', desc: 'Wins per loss', color: 'var(--color-text-secondary)' },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between py-2 border-b border-border-subtle/50 last:border-0">
                <div>
                  <div className="text-sm font-medium text-text-primary">{row.label}</div>
                  <div className="text-xs text-text-muted">{row.desc}</div>
                </div>
                <span className="text-lg font-bold" style={{ color: row.color }}>{row.value}</span>
              </div>
            ))}
          </div>
          {/* Sharpe rating */}
          <div className="mt-4 p-3 rounded-xl" style={{ background: 'var(--color-bg-elevated)' }}>
            <span className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>Rating: </span>
            <span className="text-sm font-bold" style={{ color: s.sharpe_ratio > 2 ? 'var(--color-success)' : s.sharpe_ratio > 1 ? 'var(--color-warning)' : 'var(--color-danger)' }}>
              {s.sharpe_ratio > 2 ? '🏆 Excellent (>2.0)' : s.sharpe_ratio > 1.5 ? '⚡ Very Good (>1.5)' : s.sharpe_ratio > 1 ? '📊 Acceptable (>1.0)' : '⚠️ Below Target (<1.0)'}
            </span>
          </div>
        </div>

        {/* Tax Export */}
        <div className="stripe-card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-1">
            <FileText size={18} className="inline mr-2" />
            Tax Report Export
          </h2>
          <p className="text-xs text-text-muted mb-4">Export your P&L records for tax reporting. CSV format compatible with most accounting software.</p>
          <div className="space-y-3 mb-5">
            {[
              { label: 'Total Gross Profit', value: `$${Math.max(0, s.total_pnl).toFixed(2)}` },
              { label: 'Total Gross Loss', value: `$${Math.abs(Math.min(0, s.total_pnl)).toFixed(2)}` },
              { label: 'Net P&L', value: formatMoney(s.total_pnl), positive: s.total_pnl >= 0 },
              { label: 'Period', value: `${data.period?.start ?? '—'} → ${data.period?.end ?? '—'}` },
              { label: 'Total Transactions', value: s.total_signals },
            ].map(row => (
              <div key={row.label} className="flex justify-between py-1.5 border-b border-border-subtle/50 last:border-0">
                <span className="text-xs text-text-muted">{row.label}</span>
                <span className={`text-sm font-semibold ${row.positive === true ? 'text-success' : row.positive === false ? 'text-danger' : 'text-text-primary'}`}>{row.value}</span>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <button onClick={() => exportCSV(data)} className="flex items-center gap-2 w-full justify-center px-4 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'var(--color-primary)', color: '#fff' }}>
              <Download size={16} /> Download CSV Report
            </button>
            <button onClick={() => exportJSON(data)} className="flex items-center gap-2 w-full justify-center px-4 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-subtle)' }}>
              <Download size={16} /> Download JSON (Full Data)
            </button>
          </div>
          <p className="text-[10px] mt-3" style={{ color: 'var(--color-text-muted)' }}>
            Consult a qualified accountant for tax advice. This report is informational only.
          </p>
        </div>
      </div>

      {/* Model Info Footer */}
      <div className="stripe-card p-4 text-center">
        <p className="text-xs text-text-muted">
          Dixon-Coles Poisson · Isotonic Calibration · Venue-Split Strength · Exponential Decay ·
          Fractional Kelly · Generated {data.generated_at ? new Date(data.generated_at).toLocaleString() : 'N/A'}
        </p>
      </div>
    </div>
  );
}

function exportCSV(data) {
  const s = data.summary;
  const rows = [
    ['Sigma Edge — Performance Export'],
    ['Generated', new Date().toISOString()],
    ['Period', `${data.period?.start} to ${data.period?.end}`],
    [],
    ['METRIC', 'VALUE'],
    ['Total Signals', s.total_signals],
    ['Wins', s.wins],
    ['Losses', s.losses],
    ['Hit Rate %', (s.hit_rate * 100).toFixed(2)],
    ['ROI %', s.roi_pct?.toFixed(2)],
    ['Total P&L ($)', s.total_pnl?.toFixed(2)],
    ['Total Staked ($)', s.total_staked?.toFixed(2)],
    ['Sharpe Ratio', s.sharpe_ratio?.toFixed(3)],
    ['Max Drawdown %', s.max_drawdown_pct?.toFixed(2)],
    ['Final Bankroll ($)', s.final_bankroll?.toFixed(2)],
    ['Best Win Streak', s.best_streak],
    ['Worst Loss Streak', s.worst_streak],
    [],
    ['LEAGUE BREAKDOWN'],
    ['League', 'Signals', 'Hit Rate %', 'ROI %', 'P&L ($)'],
    ...Object.entries(data.league_stats || {}).map(([name, st]) => [
      name, st.signals, (st.hit_rate * 100).toFixed(1), st.roi_pct?.toFixed(2), st.pnl?.toFixed(2)
    ]),
  ];
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sigma-edge-performance-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportJSON(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sigma-edge-backtest-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
