import { useState, useEffect } from 'react';
import { LoadingSpinner, LeagueBadge, EVBadge, TeamLogo } from '../components/ui';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Zap,
  BarChart3,
  ArrowRight,
  Trophy,
  Activity,
  MoreHorizontal,
  AlertTriangle,
  Plus,
  Radio,
  Eye,
  Rocket,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, ResponsiveContainer, Tooltip, CartesianGrid, XAxis, YAxis } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';

const GETTING_STARTED = [
  { label: 'Connect your data source', done: true },
  { label: 'Run first backtest', done: true },
  { label: 'Review signal history', done: false },
  { label: 'Set up live feed alerts', done: false },
  { label: 'Explore referee intel', done: false },
  { label: 'Configure bankroll settings', done: false },
  { label: 'Upgrade to Pro for live signals', done: false },
];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();
  const { user } = useAuth();

  useEffect(() => {
    api.v2Backtest()
      .then(d => { setData(d); setLoading(false); })
      .catch(() =>
        fetch('/data/backtest_v2_results.json')
          .then(r => r.ok ? r.json() : null)
          .then(d => { if (d) setData(d); })
          .catch(() => {})
          .finally(() => setLoading(false))
      );
  }, []);

  const s = data?.summary;
  const signals = data?.signals || [];
  const recentSignals = signals.slice(-20).reverse();
  const leagueStats = data?.league_stats || {};

  const email = user?.email || '';
  const name = email.split('@')[0] || 'User';

  // Hit rate as a percentage for the donut
  const hitRatePct = s ? Math.round(s.hit_rate * 100) : 0;
  const circumference = 2 * Math.PI * 54;
  const donutOffset = circumference - (hitRatePct / 100) * circumference;

  return (
    <div>
      {/* Welcome + Quick Actions */}
      <div className="fs-welcome-row">
        <div>
          <h1 className="fs-welcome-title">Welcome Back, {name}</h1>
          <p className="fs-welcome-sub">
            Your AI-powered betting intelligence control room
          </p>
        </div>
        <div className="fs-quick-actions">
          <span className="fs-qa-label">Quick Action</span>
          <div className="fs-qa-btns">
            <Link to="/scanner" className="fs-qa-btn primary">
              <Plus size={16} />
              <span>Scan Value</span>
            </Link>
            <Link to="/live" className="fs-qa-btn">
              <Radio size={16} />
              <span>Live Feed</span>
            </Link>
            <Link to="/signals" className="fs-qa-btn">
              <Eye size={16} />
              <span>View Signals</span>
            </Link>
            <Link to="/performance" className="fs-qa-btn">
              <BarChart3 size={16} />
              <span>Performance</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Row 1: ROI, Total Signals, Wide Card (Bankroll) */}
      <div className="fs-kpi-grid-top">
        <div className="fs-kpi-card">
          <div className="fs-kpi-header">
            <span className="fs-kpi-label">Proven ROI</span>
            <button className="fs-kpi-menu"><MoreHorizontal size={16} /></button>
          </div>
          <p className="fs-kpi-value">{loading ? '...' : s ? `+${s.roi_pct.toFixed(1)}%` : '—'}</p>
          <div className={`fs-kpi-delta ${s && s.roi_pct >= 0 ? 'positive' : 'negative'}`}>
            {s && s.roi_pct >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{s ? `${Math.abs(s.roi_pct).toFixed(1)}%` : '—'}</span>
            <span className="fs-delta-label">from $1,000 bankroll</span>
          </div>
        </div>

        <div className="fs-kpi-card">
          <div className="fs-kpi-header">
            <span className="fs-kpi-label">Total Signals</span>
            <button className="fs-kpi-menu"><MoreHorizontal size={16} /></button>
          </div>
          <p className="fs-kpi-value">{loading ? '...' : s?.total_signals || '—'}</p>
          <div className="fs-kpi-delta positive">
            <TrendingUp size={14} />
            <span>{s ? `${s.wins}W / ${s.losses}L` : '—'}</span>
            <span className="fs-delta-label">Win / Loss record</span>
          </div>
        </div>

        {/* Wide Card — Bankroll Performance */}
        <div className="fs-kpi-card wide">
          <p className="fs-kpi-label-sm">Final Bankroll</p>
          <p className="fs-kpi-value-lg">{loading ? '...' : s ? `$${s.final_bankroll.toFixed(0)}` : '—'}</p>
          <div className="fs-kpi-delta positive">
            <TrendingUp size={14} />
            <span>{s ? `${s.roi_pct.toFixed(0)}%` : '—'}</span>
            <span className="fs-delta-label">Return from $1,000 start</span>
          </div>

          {/* Percentage labels */}
          <div className="fs-cost-pcts">
            <span>{s ? `${(s.hit_rate * 100).toFixed(0)}%` : '—'}</span>
            <span>{s ? s.sharpe_ratio.toFixed(2) : '—'}</span>
            <span>{s ? `${s.max_drawdown_pct.toFixed(1)}%` : '—'}</span>
          </div>

          {/* Stacked bar */}
          <div className="fs-cost-bar">
            <div className="fs-cost-segment blue" style={{ width: `${s ? Math.min(s.hit_rate * 100, 100) : 50}%` }} />
            <div className="fs-cost-segment green" style={{ width: '20%' }} />
            <div className="fs-cost-segment orange" style={{ width: `${s ? Math.min(s.max_drawdown_pct, 30) : 15}%` }} />
          </div>

          {/* Legend */}
          <div className="fs-cost-legend">
            <span><span className="dot blue" /> Hit Rate</span>
            <span><span className="dot green" /> Sharpe</span>
            <span><span className="dot orange" /> Max DD</span>
          </div>

          {/* Confidence */}
          <div className="fs-confidence">
            <div className="fs-confidence-left">
              <AlertTriangle size={16} className="text-amber-500" />
              <span>Best Streak:</span>
            </div>
            <span className="fs-confidence-value">
              <strong>{s ? `${s.best_streak}W` : '—'}</strong> consecutive wins
            </span>
          </div>
        </div>
      </div>

      {/* KPI Row 2: Hit Rate + Max Drawdown */}
      <div className="fs-kpi-grid-small">
        <div className="fs-kpi-card">
          <div className="fs-kpi-header">
            <span className="fs-kpi-label">Hit Rate</span>
            <button className="fs-kpi-menu"><MoreHorizontal size={16} /></button>
          </div>
          <p className="fs-kpi-value">{loading ? '...' : s ? `${(s.hit_rate * 100).toFixed(1)}%` : '—'}</p>
          <div className="fs-kpi-delta positive">
            <TrendingUp size={14} />
            <span>{s ? `${s.wins} wins` : '—'}</span>
            <span className="fs-delta-label">out of {s?.total_signals || '—'} signals</span>
          </div>
        </div>

        <div className="fs-kpi-card">
          <div className="fs-kpi-header">
            <span className="fs-kpi-label">Max Drawdown</span>
            <button className="fs-kpi-menu"><MoreHorizontal size={16} /></button>
          </div>
          <p className="fs-kpi-value">{loading ? '...' : s ? `${s.max_drawdown_pct.toFixed(1)}%` : '—'}</p>
          <div className="fs-kpi-delta negative">
            <TrendingDown size={14} />
            <span>{s ? s.sharpe_ratio.toFixed(3) : '—'}</span>
            <span className="fs-delta-label">Sharpe Ratio</span>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Recent Signals + Hit Rate Donut + Getting Started */}
      <div className="fs-bottom-grid">
        {/* Recent Signals Table */}
        <div className="fs-card">
          <div className="fs-card-header">
            <div className="fs-card-title">
              <span className="fs-pulse" />
              Recent Signals
            </div>
            <Link to="/signals" className="fs-card-sub">View All</Link>
          </div>
          {loading ? (
            <LoadingSpinner label="Loading..." />
          ) : recentSignals.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)] text-center py-4">No signal data yet.</p>
          ) : (
            <table className="fs-table">
              <thead>
                <tr>
                  <th>Match</th>
                  <th>League</th>
                  <th>EV</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentSignals.slice(0, 6).map((sig, i) => {
                  const parts = sig.match?.split(' vs ');
                  const home = parts?.[0]?.trim() || '';
                  const away = parts?.[1]?.trim() || '';
                  return (
                    <tr key={`${sig.date}-${sig.match}-${i}`}>
                      <td style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>
                        <div className="flex items-center gap-1.5">
                          <TeamLogo name={home} size={16} />
                          <span>{sig.match}</span>
                          <TeamLogo name={away} size={16} />
                        </div>
                      </td>
                      <td>{sig.league}</td>
                      <td>{sig.ev > 0 ? `+${(sig.ev * 100).toFixed(1)}%` : `${(sig.ev * 100).toFixed(1)}%`}</td>
                      <td>
                        <span className={`fs-status ${sig.won ? 'won' : 'lost'}`}>
                          {sig.won ? 'Won' : 'Lost'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Hit Rate Donut */}
        <div className="fs-card">
          <div className="fs-card-header">
            <div className="fs-card-title">Hit Rate</div>
            <button className="fs-kpi-menu"><MoreHorizontal size={16} /></button>
          </div>

          <div className="fs-donut-wrap">
            <svg className="fs-donut" viewBox="0 0 120 120">
              <circle className="fs-donut-bg" cx="60" cy="60" r="54" />
              <circle
                className="fs-donut-fill"
                cx="60" cy="60" r="54"
                strokeDasharray={circumference}
                strokeDashoffset={loading ? circumference : donutOffset}
              />
            </svg>
            <div className="fs-donut-center">
              <span className="fs-donut-label">Accuracy</span>
              <span className="fs-donut-value">{loading ? '...' : `${hitRatePct}%`}</span>
            </div>
          </div>

          {/* League breakdown */}
          <div className="fs-league-list">
            {Object.entries(leagueStats).slice(0, 4).map(([name, stats]) => (
              <div key={name} className="fs-league-row">
                <span className="fs-league-name">{name}</span>
                <span className={`fs-league-roi ${stats.roi_pct >= 0 ? 'positive' : 'negative'}`}>
                  {stats.roi_pct >= 0 ? '+' : ''}{stats.roi_pct.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Getting Started */}
        <div className="fs-card">
          <div className="fs-card-header">
            <div className="fs-card-title">Getting Started</div>
          </div>
          <div className="fs-checklist">
            {GETTING_STARTED.map((item, i) => (
              <div key={i} className="fs-check-item">
                {item.done ? (
                  <CheckCircle2 size={16} className="text-[var(--color-success)] flex-shrink-0" />
                ) : (
                  <Circle size={16} className="text-[var(--color-text-muted)] flex-shrink-0" />
                )}
                <span className={item.done ? 'done' : ''}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
