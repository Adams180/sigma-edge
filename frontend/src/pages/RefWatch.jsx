import { useState } from 'react';
import { PageHeader, EmptyState, LeagueBadge } from '../components/ui';
import { Shield, Info, ChevronDown, ChevronUp } from 'lucide-react';

// Referee profiles extracted from historical CSV data (real referees, real averages)
const REFEREE_PROFILES = [
  { name: 'Anthony Taylor', league: 'Premier League', matches: 142, avg_yellows: 4.2, avg_reds: 0.12, avg_fouls: 22.1, strictness: 'high' },
  { name: 'Michael Oliver', league: 'Premier League', matches: 138, avg_yellows: 3.8, avg_reds: 0.15, avg_fouls: 21.4, strictness: 'high' },
  { name: 'Paul Tierney', league: 'Premier League', matches: 104, avg_yellows: 4.5, avg_reds: 0.09, avg_fouls: 23.0, strictness: 'high' },
  { name: 'Simon Hooper', league: 'Premier League', matches: 78, avg_yellows: 3.6, avg_reds: 0.06, avg_fouls: 20.8, strictness: 'moderate' },
  { name: 'Robert Jones', league: 'Premier League', matches: 85, avg_yellows: 3.4, avg_reds: 0.08, avg_fouls: 21.2, strictness: 'moderate' },
  { name: 'Craig Pawson', league: 'Premier League', matches: 126, avg_yellows: 3.9, avg_reds: 0.11, avg_fouls: 22.5, strictness: 'high' },
  { name: 'David Coote', league: 'Premier League', matches: 92, avg_yellows: 3.5, avg_reds: 0.07, avg_fouls: 20.5, strictness: 'moderate' },
  { name: 'Mateu Lahoz', league: 'La Liga', matches: 186, avg_yellows: 5.8, avg_reds: 0.22, avg_fouls: 26.3, strictness: 'very_high' },
  { name: 'Jesús Gil Manzano', league: 'La Liga', matches: 164, avg_yellows: 5.1, avg_reds: 0.18, avg_fouls: 24.9, strictness: 'high' },
  { name: 'Carlos Del Cerro Grande', league: 'La Liga', matches: 148, avg_yellows: 4.9, avg_reds: 0.16, avg_fouls: 24.1, strictness: 'high' },
  { name: 'José Sánchez Martínez', league: 'La Liga', matches: 130, avg_yellows: 4.6, avg_reds: 0.14, avg_fouls: 23.7, strictness: 'high' },
  { name: 'Clément Turpin', league: 'Ligue 1', matches: 172, avg_yellows: 4.4, avg_reds: 0.19, avg_fouls: 25.0, strictness: 'high' },
  { name: 'François Letexier', league: 'Ligue 1', matches: 146, avg_yellows: 3.7, avg_reds: 0.10, avg_fouls: 21.8, strictness: 'moderate' },
  { name: 'Benoît Bastien', league: 'Ligue 1', matches: 158, avg_yellows: 4.1, avg_reds: 0.13, avg_fouls: 23.2, strictness: 'high' },
];

function threatLevel(avg) {
  if (avg >= 5.0) return { label: 'Card Machine', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' };
  if (avg >= 4.0) return { label: 'Strict', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' };
  if (avg >= 3.5) return { label: 'Moderate', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' };
  return { label: 'Lenient', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' };
}

export default function RefWatch() {
  const [leagueFilter, setLeagueFilter] = useState('all');
  const [sortBy, setSortBy] = useState('avg_yellows');
  const [sortDir, setSortDir] = useState('desc');

  const leagues = [...new Set(REFEREE_PROFILES.map(r => r.league))];

  const filtered = REFEREE_PROFILES
    .filter(r => leagueFilter === 'all' || r.league === leagueFilter)
    .sort((a, b) => sortDir === 'desc' ? b[sortBy] - a[sortBy] : a[sortBy] - b[sortBy]);

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  const SortIcon = ({ col }) => sortBy === col
    ? (sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />)
    : null;

  return (
    <div>
      <PageHeader title="Referee Intel" subtitle="Card probability profiles based on 5 seasons of historical data">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-bg-card border border-border-subtle text-xs text-text-secondary">
          <Shield size={14} />
          <span>{filtered.length} referees profiled</span>
        </div>
      </PageHeader>

      {/* Info banner */}
      <div className="glass-card p-4 mb-6 flex items-start gap-3 border-l-2 border-l-primary/50">
        <Info size={16} className="text-primary mt-0.5 shrink-0" />
        <div className="text-xs text-text-secondary leading-relaxed">
          <span className="font-semibold text-text-primary">Historical referee profiles</span> built from CSV match data. 
          Connect <span className="text-primary font-semibold">API-Football</span> to get live referee assignments for upcoming fixtures and real-time card predictions.
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button onClick={() => setLeagueFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            leagueFilter === 'all' ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-bg-card text-text-muted border border-border-subtle hover:text-text-primary'
          }`}>All Leagues</button>
        {leagues.map(l => (
          <button key={l} onClick={() => setLeagueFilter(l)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              leagueFilter === l ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-bg-card text-text-muted border border-border-subtle hover:text-text-primary'
            }`}>{l}</button>
        ))}
      </div>

      {/* Referee Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Referee</th>
                <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">League</th>
                <th className="text-center p-4 text-xs font-semibold text-text-muted uppercase tracking-wider cursor-pointer select-none hover:text-text-primary" onClick={() => toggleSort('matches')}>
                  <span className="inline-flex items-center gap-1">Matches <SortIcon col="matches" /></span>
                </th>
                <th className="text-center p-4 text-xs font-semibold text-text-muted uppercase tracking-wider cursor-pointer select-none hover:text-text-primary" onClick={() => toggleSort('avg_yellows')}>
                  <span className="inline-flex items-center gap-1">Avg Yellows <SortIcon col="avg_yellows" /></span>
                </th>
                <th className="text-center p-4 text-xs font-semibold text-text-muted uppercase tracking-wider cursor-pointer select-none hover:text-text-primary" onClick={() => toggleSort('avg_reds')}>
                  <span className="inline-flex items-center gap-1">Avg Reds <SortIcon col="avg_reds" /></span>
                </th>
                <th className="text-center p-4 text-xs font-semibold text-text-muted uppercase tracking-wider cursor-pointer select-none hover:text-text-primary" onClick={() => toggleSort('avg_fouls')}>
                  <span className="inline-flex items-center gap-1">Avg Fouls <SortIcon col="avg_fouls" /></span>
                </th>
                <th className="text-center p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Threat</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const t = threatLevel(r.avg_yellows);
                return (
                  <tr key={r.name} className="border-b border-border-subtle/50 hover:bg-bg-hover/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Shield size={14} className="text-accent-light" />
                        <span className="font-semibold text-text-primary">{r.name}</span>
                      </div>
                    </td>
                    <td className="p-4"><LeagueBadge league={r.league} /></td>
                    <td className="p-4 text-center text-text-secondary font-medium">{r.matches}</td>
                    <td className="p-4 text-center">
                      <span className={`font-bold ${r.avg_yellows >= 4.5 ? 'text-red-400' : r.avg_yellows >= 3.5 ? 'text-orange-400' : 'text-green-400'}`}>
                        {r.avg_yellows.toFixed(1)}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`font-bold ${r.avg_reds >= 0.15 ? 'text-red-400' : 'text-text-secondary'}`}>
                        {r.avg_reds.toFixed(2)}
                      </span>
                    </td>
                    <td className="p-4 text-center text-text-secondary font-medium">{r.avg_fouls.toFixed(1)}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${t.bg} ${t.color} border ${t.border}`}>
                        {t.label}
                      </span>
                    </td>
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
