import { useState, useEffect, useMemo } from 'react';
import { PageHeader, LoadingSpinner, EmptyState, LeagueBadge, TeamLogo } from '../components/ui';
import { Calendar, Clock, Filter, ChevronDown, ChevronUp, Activity, CheckCircle } from 'lucide-react';
import api from '../api';

const LEAGUES = [
  { id: null,  name: 'All Leagues' },
  { id: 39,    name: 'Premier League' },
  { id: 140,   name: 'La Liga' },
  { id: 135,   name: 'Serie A' },
  { id: 78,    name: 'Bundesliga' },
  { id: 61,    name: 'Ligue 1' },
  { id: 2,     name: 'Champions League' },
  { id: 3,     name: 'Europa League' },
  { id: 1,     name: 'World Cup' },
];

const STATUS_TABS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'finished', label: 'Results' },
  { key: null,       label: 'All' },
];

function formatKickoff(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    + ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function groupByDate(fixtures) {
  const groups = {};
  for (const f of fixtures) {
    const date = f.kickoff ? f.kickoff.slice(0, 10) : 'Unknown';
    if (!groups[date]) groups[date] = [];
    groups[date].push(f);
  }
  return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
}

function formatDateHeading(dateStr) {
  if (!dateStr || dateStr === 'Unknown') return 'Unknown Date';
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.getTime() === today.getTime()) return 'Today';
  if (d.getTime() === tomorrow.getTime()) return 'Tomorrow';
  if (d.getTime() === yesterday.getTime()) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function StatusPill({ status }) {
  if (!status) return null;
  const map = {
    NS:   { label: 'Upcoming', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    LIVE: { label: '● LIVE',   cls: 'bg-green-500/10 text-green-400 border-green-500/20 animate-pulse' },
    '1H': { label: '● 1st Half', cls: 'bg-green-500/10 text-green-400 border-green-500/20 animate-pulse' },
    HT:   { label: 'Half Time', cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
    '2H': { label: '● 2nd Half', cls: 'bg-green-500/10 text-green-400 border-green-500/20 animate-pulse' },
    FT:   { label: 'FT',        cls: 'bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] border-[var(--color-border-subtle)]' },
  };
  const s = map[status] || { label: status, cls: 'bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] border-[var(--color-border-subtle)]' };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${s.cls}`}>{s.label}</span>
  );
}

function OddsPill({ label, value }) {
  if (!value) return (
    <div className="flex flex-col items-center min-w-[52px]">
      <span className="text-[10px] text-[var(--color-text-muted)] mb-1">{label}</span>
      <span className="text-xs text-[var(--color-text-muted)]">—</span>
    </div>
  );
  return (
    <div className="flex flex-col items-center min-w-[52px]">
      <span className="text-[10px] text-[var(--color-text-muted)] mb-1">{label}</span>
      <span className="px-2.5 py-1 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-bold border border-[var(--color-primary)]/20">
        {value.toFixed(2)}
      </span>
    </div>
  );
}

function FixtureCard({ fixture }) {
  const isLive = ['LIVE', '1H', 'HT', '2H'].includes(fixture.status);
  const isFinished = fixture.status === 'FT';
  const hasScore = fixture.score?.home != null && fixture.score?.away != null;

  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl border transition-colors hover:bg-[var(--color-bg-hover)]/50
      ${isLive ? 'border-green-500/20 bg-green-500/5' : 'border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]'}`}>

      {/* League + Time */}
      <div className="w-32 shrink-0 hidden sm:block">
        <div className="text-[10px] text-[var(--color-text-muted)] mb-1 truncate">{fixture.league}</div>
        <div className="flex items-center gap-1 text-[10px] text-[var(--color-text-muted)]">
          <Clock size={10} />
          <span>{fixture.kickoff ? new Date(fixture.kickoff).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
        </div>
      </div>

      {/* Teams + Score */}
      <div className="flex-1 flex items-center justify-between gap-3 min-w-0">
        {/* Home */}
        <div className="flex flex-col items-end gap-0.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 justify-end">
            <span className={`text-sm font-semibold truncate max-w-[120px] text-right
              ${isFinished && hasScore && fixture.score.home > fixture.score.away ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}`}>
              {fixture.home_team}
            </span>
            <TeamLogo name={fixture.home_team} logo={fixture.home_logo} size={24} />
          </div>
        </div>

        {/* Score / VS */}
        <div className="flex items-center gap-2 shrink-0">
          {(isLive || isFinished) && hasScore ? (
            <div className="flex items-center gap-1.5">
              <span className={`text-lg font-bold w-6 text-center
                ${isFinished && fixture.score.home > fixture.score.away ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}`}>
                {fixture.score.home}
              </span>
              <span className="text-[var(--color-text-muted)] text-sm">–</span>
              <span className={`text-lg font-bold w-6 text-center
                ${isFinished && fixture.score.away > fixture.score.home ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}`}>
                {fixture.score.away}
              </span>
            </div>
          ) : (
            <span className="text-[var(--color-text-muted)] text-xs font-medium px-1">vs</span>
          )}
        </div>

        {/* Away */}
        <div className="flex flex-col items-start gap-0.5 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <TeamLogo name={fixture.away_team} logo={fixture.away_logo} size={24} />
            <span className={`text-sm font-semibold truncate max-w-[120px]
              ${isFinished && hasScore && fixture.score.away > fixture.score.home ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}`}>
              {fixture.away_team}
            </span>
          </div>
        </div>
      </div>

      {/* Odds */}
      <div className="hidden lg:flex items-center gap-2 shrink-0">
        <OddsPill label="1" value={fixture.odds?.home} />
        <OddsPill label="X" value={fixture.odds?.draw} />
        <OddsPill label="2" value={fixture.odds?.away} />
      </div>

      {/* Status */}
      <div className="shrink-0">
        <StatusPill status={fixture.status} />
      </div>
    </div>
  );
}

export default function Fixtures() {
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leagueId, setLeagueId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('upcoming');

  useEffect(() => {
    setLoading(true);
    api.fixtures({ league_id: leagueId || undefined, status: statusFilter || undefined, limit: 300 })
      .then(d => setFixtures(d.fixtures || []))
      .catch(() => setFixtures([]))
      .finally(() => setLoading(false));
  }, [leagueId, statusFilter]);

  const grouped = useMemo(() => groupByDate(fixtures), [fixtures]);

  const liveCount = fixtures.filter(f => ['LIVE', '1H', '2H', 'HT'].includes(f.status)).length;

  return (
    <div>
      <PageHeader title="Fixtures" subtitle="All matches across supported leagues">
        <div className="flex items-center gap-2">
          {liveCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-semibold text-green-400">{liveCount} live</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]">
            <Calendar size={13} className="text-[var(--color-text-muted)]" />
            <span className="text-xs text-[var(--color-text-secondary)]">{fixtures.length} fixtures</span>
          </div>
        </div>
      </PageHeader>

      {/* League Filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        {LEAGUES.map(l => (
          <button
            key={l.id ?? 'all'}
            onClick={() => setLeagueId(l.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border
              ${leagueId === l.id
                ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border-[var(--color-primary)]/30'
                : 'bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] border-[var(--color-border-subtle)] hover:text-[var(--color-text-primary)]'
              }`}
          >
            {l.name}
          </button>
        ))}
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 mb-6">
        {STATUS_TABS.map(t => (
          <button
            key={t.key ?? 'all'}
            onClick={() => setStatusFilter(t.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border
              ${statusFilter === t.key
                ? 'bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] border-[var(--color-border-default)]'
                : 'bg-transparent text-[var(--color-text-muted)] border-transparent hover:text-[var(--color-text-primary)]'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSpinner label="Loading fixtures..." />
      ) : fixtures.length === 0 ? (
        <EmptyState icon={Calendar} title="No Fixtures" description="No matches found for the selected filters." />
      ) : (
        <div className="space-y-6">
          {grouped.map(([date, group]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                  {formatDateHeading(date)}
                </span>
                <span className="text-[10px] text-[var(--color-text-muted)] bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] px-2 py-0.5 rounded-full">
                  {group.length} match{group.length !== 1 ? 'es' : ''}
                </span>
                <div className="flex-1 h-px bg-[var(--color-border-subtle)]" />
              </div>
              <div className="space-y-2">
                {group.map(f => <FixtureCard key={f.fixture_id} fixture={f} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
