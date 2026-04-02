import { useState, useEffect, useRef } from 'react';
import { Activity, Zap, TrendingUp, TrendingDown, Clock, Circle } from 'lucide-react';
import { BackendLoading, BackendError } from '../components/ui/BackendStatus';
import api from '../api';

function PulseCard({ match, status }) {
  const isLive = status === 'live';
  return (
    <div className="fs-kpi-card" style={{ position: 'relative', overflow: 'hidden' }}>
      {isLive && (
        <div style={{ position: 'absolute', top: 12, right: 12 }}>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--color-danger)' }}>
            <Circle size={6} fill="currentColor" className="animate-pulse" /> LIVE
          </span>
        </div>
      )}
      <div className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-muted)' }}>{match.league}</div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{match.home}</div>
          <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{match.away}</div>
        </div>
        {isLive ? (
          <div className="text-right">
            <div className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {match.homeScore ?? 0} - {match.awayScore ?? 0}
            </div>
            <div className="text-xs" style={{ color: 'var(--color-warning)' }}>{match.minute}'</div>
          </div>
        ) : (
          <div className="text-xs px-2 py-1 rounded" style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-muted)' }}>
            <Clock size={10} className="inline mr-1" />{match.time}
          </div>
        )}
      </div>
      {/* Odds */}
      <div className="flex gap-2">
        {[
          { label: '1', val: match.odds1 },
          { label: 'X', val: match.oddsX },
          { label: '2', val: match.odds2 },
        ].map(o => (
          <div key={o.label} className="flex-1 text-center py-1.5 rounded text-xs font-semibold"
            style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-subtle)' }}>
            <span style={{ color: 'var(--color-text-muted)', marginRight: 4 }}>{o.label}</span>
            {o.val?.toFixed(2) || '—'}
          </div>
        ))}
      </div>
      {/* Signal indicator */}
      {match.ev && match.ev > 0.05 && (
        <div className="mt-2 flex items-center gap-1 text-[11px] font-medium" style={{ color: 'var(--color-success)' }}>
          <Zap size={11} /> Signal: +{(match.ev * 100).toFixed(1)}% EV
        </div>
      )}
    </div>
  );
}

export default function PulseMode() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const intervalRef = useRef(null);

  const fetchData = async (isRetry = false) => {
    if (isRetry) { setLoading(true); setError(null); }
    try {
      const [fixtures, bt] = await Promise.all([
        api.fixtures({ limit: 50 }).catch(() => ({ fixtures: [] })),
        api.v2Backtest().catch(() => ({ bets: [] })),
      ]);
      const evMap = {};
      (bt.bets || []).forEach(b => {
        const k = `${b.home_team}-${b.away_team}`.toLowerCase();
        evMap[k] = b.ev || 0;
      });

      const mapped = (fixtures.fixtures || []).slice(0, 20).map(f => {
        const k = `${f.home_team}-${f.away_team}`.toLowerCase();
        const st = f.status_short || f.status || '';
        const isLive = ['1H', '2H', 'HT', 'LIVE'].includes(st);
        return {
          home: f.home_team,
          away: f.away_team,
          league: f.league_name || '—',
          homeScore: f.home_score,
          awayScore: f.away_score,
          time: f.match_time || '—',
          minute: f.elapsed || '—',
          odds1: f.odds_home,
          oddsX: f.odds_draw,
          odds2: f.odds_away,
          ev: evMap[k] || 0,
          status: isLive ? 'live' : 'upcoming',
        };
      });
      setMatches(mapped);
      setLastUpdate(new Date());
    } catch (err) { if (matches.length === 0) setError(err.message); }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(() => fetchData(), 30000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const liveMatches = matches.filter(m => m.status === 'live');
  const upcomingMatches = matches.filter(m => m.status === 'upcoming');

  if (loading) return <BackendLoading label="Loading live match data…" />;
  if (error) return <BackendError msg={error} onRetry={() => fetchData(true)} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            <Activity size={24} className="inline mr-2 text-[var(--color-danger)]" />
            Pulse Mode
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Full-screen match day control center. Auto-refreshes every 30s.
          </p>
        </div>
        {lastUpdate && (
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Last update: {lastUpdate.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Live section */}
      {liveMatches.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-3">
            <Circle size={8} fill="var(--color-danger)" style={{ color: 'var(--color-danger)' }} className="animate-pulse" />
            <span className="text-sm font-semibold" style={{ color: 'var(--color-danger)' }}>LIVE NOW ({liveMatches.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {liveMatches.map((m, i) => <PulseCard key={i} match={m} status="live" />)}
          </div>
        </>
      )}

      {/* Upcoming */}
      <div className="flex items-center gap-2 mb-3">
        <Clock size={14} style={{ color: 'var(--color-text-muted)' }} />
        <span className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>UPCOMING ({upcomingMatches.length})</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {upcomingMatches.map((m, i) => <PulseCard key={i} match={m} status="upcoming" />)}
      </div>
      {matches.length === 0 && (
        <div className="fs-card text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
          No fixtures available right now.
        </div>
      )}
    </div>
  );
}
