import { useState, useEffect } from 'react';
import { Sunrise, Target, TrendingUp, Clock, Star, AlertTriangle } from 'lucide-react';
import api from '../api';

export default function MorningBrief() {
  const [fixtures, setFixtures] = useState([]);
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [fx, bt] = await Promise.all([
          api.fixtures().catch(() => []),
          api.v2Backtest().catch(() => ({ bets: [] })),
        ]);
        setFixtures(Array.isArray(fx) ? fx : []);
        setBets(bt.bets || []);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  // Top picks: highest EV from backtest
  const topPicks = [...bets]
    .filter(b => b.ev != null)
    .sort((a, b) => (b.ev || 0) - (a.ev || 0))
    .slice(0, 5);

  // Recent form
  const last10 = bets.slice(-10);
  const recentWins = last10.filter(b => b.result === 'Win').length;

  // Today's fixture count
  const todayDate = new Date().toISOString().split('T')[0];
  const todayFixtures = fixtures.filter(f => {
    const fd = f.fixture?.date || f.date || '';
    return fd.startsWith(todayDate);
  });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          <Sunrise size={24} className="inline mr-2 text-amber-400" />
          {greeting}, Analyst
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>{today} — Your daily intelligence briefing</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Today\'s Fixtures', value: todayFixtures.length, icon: Clock, color: 'var(--color-info)' },
          { label: 'Signals Available', value: topPicks.length, icon: Target, color: 'var(--color-primary)' },
          { label: 'Recent Form (L10)', value: `${recentWins}W / ${10 - recentWins}L`, icon: TrendingUp, color: recentWins >= 5 ? 'var(--color-success)' : 'var(--color-warning)' },
          { label: 'Total Bets Tracked', value: bets.length, icon: Star, color: 'var(--color-text-secondary)' },
        ].map(k => (
          <div key={k.label} className="fs-kpi-card">
            <div className="fs-kpi-header"><span className="fs-kpi-label">{k.label}</span></div>
            <div className="fs-kpi-value" style={{ color: k.color, fontSize: '1.5rem' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Top Picks */}
      <div className="fs-card mb-6">
        <div className="fs-card-header">
          <span className="fs-card-title">
            <Star size={16} className="inline mr-1 text-amber-400" /> Top EV Picks
          </span>
        </div>
        {topPicks.length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: 'var(--color-text-muted)' }}>No signals available yet.</p>
        ) : (
          <div className="space-y-3">
            {topPicks.map((b, i) => {
              const ev = (b.ev * 100).toFixed(1);
              const odds = b.odds?.toFixed(2) || '—';
              return (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg"
                  style={{ background: 'var(--color-bg-elevated)' }}>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold" style={{ color: 'var(--color-primary)', minWidth: 28, textAlign: 'center' }}>#{i + 1}</span>
                    <div>
                      <p className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>{b.match || b.teams || 'Unknown'}</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{b.league || ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Odds</p>
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>{odds}</p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>EV</p>
                      <p className="text-sm font-bold" style={{ color: parseFloat(ev) > 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                        {parseFloat(ev) > 0 ? '+' : ''}{ev}%
                      </p>
                    </div>
                    {b.result && (
                      <span className={`fs-status ${b.result === 'Win' ? 'won' : 'lost'}`}>{b.result}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Today's Fixtures */}
      <div className="fs-card">
        <div className="fs-card-header">
          <span className="fs-card-title">
            <Clock size={16} className="inline mr-1" /> Today's Fixtures
          </span>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{todayFixtures.length} matches</span>
        </div>
        {todayFixtures.length === 0 ? (
          <div className="text-center py-8">
            <AlertTriangle size={32} className="mx-auto mb-2" style={{ color: 'var(--color-text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No fixtures scheduled for today.</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Check back tomorrow or view upcoming fixtures.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="fs-table">
              <thead>
                <tr>
                  <th>Match</th><th>League</th><th>Time</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {todayFixtures.map((f, i) => {
                  const home = f.teams?.home?.name || f.home || '—';
                  const away = f.teams?.away?.name || f.away || '—';
                  const league = f.league?.name || f.league || '—';
                  const time = f.fixture?.date ? new Date(f.fixture.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
                  const status = f.fixture?.status?.short || 'NS';
                  return (
                    <tr key={i}>
                      <td style={{ color: 'var(--color-text-primary)' }}>{home} vs {away}</td>
                      <td>{league}</td>
                      <td>{time}</td>
                      <td><span className={`fs-status ${status === 'FT' ? 'won' : ''}`}>{status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
