import { useState, useEffect, useMemo } from 'react';
import { Trophy, Medal, TrendingUp, TrendingDown, Flame, Star, BarChart3, ArrowUpDown } from 'lucide-react';
import { BackendLoading, BackendError, DemoBadge } from '../components/ui/BackendStatus';
import api from '../api';

const MOCK_TRADERS = [
  { name: 'SharpeKing', avatar: 'SK', roi: 31.4, winRate: 68, totalBets: 312, streak: 7, style: 'Value Hunter', tier: 'diamond' },
  { name: 'xG_Analyst', avatar: 'xG', roi: 24.8, winRate: 63, totalBets: 287, streak: 5, style: 'Statistical Edge', tier: 'gold' },
  { name: 'OddsBreaker', avatar: 'OB', roi: 19.2, winRate: 61, totalBets: 445, streak: 3, style: 'Market Maker', tier: 'gold' },
  { name: 'QuantBettor', avatar: 'QB', roi: 14.7, winRate: 58, totalBets: 203, streak: 0, style: 'Quant Model', tier: 'silver' },
  { name: 'PressureBet', avatar: 'PB', roi: 11.3, winRate: 56, totalBets: 178, streak: 4, style: 'Live Trader', tier: 'silver' },
  { name: 'ValueDigger', avatar: 'VD', roi: 9.8, winRate: 55, totalBets: 390, streak: 2, style: 'Value Hunter', tier: 'silver' },
  { name: 'KellyBot', avatar: 'KB', roi: 7.1, winRate: 54, totalBets: 521, streak: 1, style: 'Kelly Criterion', tier: 'bronze' },
  { name: 'CornerKing', avatar: 'CK', roi: 5.4, winRate: 52, totalBets: 267, streak: 0, style: 'Specialists', tier: 'bronze' },
  { name: 'LateGoals', avatar: 'LG', roi: 3.9, winRate: 51, totalBets: 144, streak: 3, style: 'Time-based', tier: 'bronze' },
  { name: 'ModelZero', avatar: 'MZ', roi: 2.1, winRate: 50, totalBets: 88, streak: 1, style: 'Learning', tier: 'bronze' },
];

const TIER_STYLES = {
  diamond: { bg: 'rgba(99,102,241,0.15)', color: '#818cf8', label: 'Diamond', icon: '💎' },
  gold:    { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24', label: 'Gold',    icon: '🥇' },
  silver:  { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8', label: 'Silver', icon: '🥈' },
  bronze:  { bg: 'rgba(180,120,80,0.15)', color: '#b47850', label: 'Bronze',  icon: '🥉' },
};

const SORT_OPTIONS = ['ROI', 'Win Rate', 'Total Bets', 'Streak'];

export default function Leaderboard() {
  const [myStats, setMyStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('ROI');
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    (async () => {
      try {
        const bt = await api.v2Backtest();
        const bets = bt.bets || [];
        const wins = bets.filter(b => b.result === 'Win').length;
        const losses = bets.filter(b => b.result === 'Loss').length;
        const total = wins + losses;
        const roi = total > 0 ? ((wins - losses) / total * 100).toFixed(1) : '0.0';
        // Calc streak
        let streak = 0;
        for (let i = bets.length - 1; i >= 0; i--) {
          if (bets[i].result === 'Win') streak++;
          else break;
        }
        setMyStats({ name: 'You', avatar: 'ME', roi: parseFloat(roi), winRate: total ? Math.round(wins / total * 100) : 0, totalBets: total, streak, style: 'My Model', tier: parseFloat(roi) > 20 ? 'diamond' : parseFloat(roi) > 10 ? 'gold' : parseFloat(roi) > 0 ? 'silver' : 'bronze' });
      } catch { setMyStats(null); }
      setLoading(false);
    })();
  }, []);

  const combined = useMemo(() => {
    const all = myStats ? [...MOCK_TRADERS, myStats] : [...MOCK_TRADERS];
    return all.sort((a, b) => {
      if (sortBy === 'ROI') return b.roi - a.roi;
      if (sortBy === 'Win Rate') return b.winRate - a.winRate;
      if (sortBy === 'Total Bets') return b.totalBets - a.totalBets;
      if (sortBy === 'Streak') return b.streak - a.streak;
      return 0;
    }).filter(t => filter === 'All' || t.tier === filter.toLowerCase());
  }, [myStats, sortBy, filter]);

  const myRank = combined.findIndex(t => t.name === 'You') + 1;

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
            <Trophy size={24} className="inline mr-2 text-amber-400" />
            Sigma Leaderboard
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Track your model's performance against the community. Ranked by ROI.
            </p>
            <DemoBadge />
          </div>
        </div>
        {myRank > 0 && (
          <div className="text-center">
            <div className="text-3xl font-black" style={{ color: 'var(--color-primary)' }}>#{myRank}</div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Your rank</div>
          </div>
        )}
      </div>

      {/* Podium top 3 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[combined[1], combined[0], combined[2]].map((t, idx) => {
          if (!t) return null;
          const positions = [2, 1, 3];
          const pos = positions[idx];
          const tStyle = TIER_STYLES[t.tier];
          const heights = ['h-28', 'h-36', 'h-24'];
          return (
            <div key={t.name} className={`fs-kpi-card flex flex-col items-center justify-end ${heights[idx]}`}
              style={{ background: tStyle.bg, border: `1px solid ${tStyle.color}40`, position: 'relative' }}>
              {pos === 1 && <Trophy size={18} className="absolute top-2 right-2 text-amber-400" />}
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mb-2"
                style={{ background: tStyle.color + '30', color: tStyle.color, border: `2px solid ${tStyle.color}` }}>
                {t.avatar}
              </div>
              <div className="text-xs font-semibold text-center" style={{ color: 'var(--color-text-primary)' }}>{t.name}</div>
              <div className="text-lg font-black" style={{ color: tStyle.color }}>#{pos}</div>
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t.roi}% ROI</div>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-1">
          <ArrowUpDown size={14} style={{ color: 'var(--color-text-muted)' }} />
          {SORT_OPTIONS.map(s => (
            <button key={s} onClick={() => setSortBy(s)}
              className="px-3 py-1 rounded-full text-xs font-medium transition-all"
              style={{
                background: sortBy === s ? 'var(--color-primary)' : 'var(--color-bg-elevated)',
                color: sortBy === s ? '#fff' : 'var(--color-text-secondary)',
                border: `1px solid ${sortBy === s ? 'var(--color-primary)' : 'var(--color-border-subtle)'}`,
              }}>{s}</button>
          ))}
        </div>
        <div className="flex items-center gap-1 ml-auto">
          {['All', 'Diamond', 'Gold', 'Silver', 'Bronze'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3 py-1 rounded-full text-xs font-medium transition-all"
              style={{
                background: filter === f ? 'var(--color-bg-elevated)' : 'transparent',
                color: filter === f ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                border: `1px solid ${filter === f ? 'var(--color-border-subtle)' : 'transparent'}`,
              }}>{f}</button>
          ))}
        </div>
      </div>

      {/* Full Table */}
      <div className="fs-card">
        <div style={{ overflowX: 'auto' }}>
          <table className="fs-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                {['RANK', 'TRADER', 'TIER', 'ROI', 'WIN RATE', 'BETS', 'STREAK', 'STYLE'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '0.6rem 0.75rem', fontSize: '0.7rem', color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {combined.map((t, i) => {
                const tStyle = TIER_STYLES[t.tier];
                const isMe = t.name === 'You';
                return (
                  <tr key={t.name} style={{ background: isMe ? 'var(--color-primary)10' : undefined }}>
                    <td style={{ padding: '0.65rem 0.75rem', fontWeight: 700, fontSize: '0.85rem', color: i < 3 ? tStyle.color : 'var(--color-text-muted)' }}>
                      {i < 3 ? ['🥇', '🥈', '🥉'][i] : `#${i + 1}`}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
                          style={{ background: tStyle.color + '20', color: tStyle.color }}>
                          {t.avatar}
                        </div>
                        <span style={{ fontSize: '0.83rem', color: isMe ? 'var(--color-primary)' : 'var(--color-text-primary)', fontWeight: isMe ? 700 : 500 }}>
                          {t.name} {isMe && '(You)'}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: tStyle.bg, color: tStyle.color }}>
                        {tStyle.icon} {tStyle.label}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', fontWeight: 700, fontSize: '0.85rem', color: t.roi >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {t.roi >= 0 ? '+' : ''}{t.roi}%
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                      {t.winRate}%
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                      {t.totalBets}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      {t.streak > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold">
                          <Flame size={13} style={{ color: t.streak >= 5 ? '#ef4444' : '#f97316' }} />
                          <span style={{ color: t.streak >= 5 ? '#ef4444' : '#f97316' }}>{t.streak}W</span>
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{t.style}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
