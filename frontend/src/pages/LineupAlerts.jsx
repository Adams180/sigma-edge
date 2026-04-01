import { useState } from 'react';
import { PageHeader, LeagueBadge, StatusBadge, ProbabilityBar } from '../components/ui';
import { Users, UserX, Info, Lock, TrendingDown } from 'lucide-react';

// Demo data showing what the feature looks like with live API connected
const DEMO_ALERTS = [
  {
    id: 1,
    league: 'Premier League',
    match: 'Arsenal vs Chelsea',
    team: 'Arsenal',
    missing_players: ['Bukayo Saka', 'Martin Ødegaard'],
    prob_dock: 0.082,
    probs: { home: 0.41, draw: 0.30, away: 0.29 },
    original_probs: { home: 0.52, draw: 0.26, away: 0.22 },
    reason: 'Injury — hamstring',
  },
  {
    id: 2,
    league: 'Premier League',
    match: 'Liverpool vs Man United',
    team: 'Man United',
    missing_players: ['Bruno Fernandes'],
    prob_dock: 0.045,
    probs: { home: 0.58, draw: 0.24, away: 0.18 },
    original_probs: { home: 0.55, draw: 0.24, away: 0.21 },
    reason: 'Suspension — red card',
  },
  {
    id: 3,
    league: 'La Liga',
    match: 'Barcelona vs Real Madrid',
    team: 'Barcelona',
    missing_players: ['Pedri', 'Gavi', 'Frenkie de Jong'],
    prob_dock: 0.112,
    probs: { home: 0.38, draw: 0.28, away: 0.34 },
    original_probs: { home: 0.48, draw: 0.26, away: 0.26 },
    reason: 'Injury — multiple',
  },
  {
    id: 4,
    league: 'Ligue 1',
    match: 'PSG vs Marseille',
    team: 'PSG',
    missing_players: ['Ousmane Dembélé'],
    prob_dock: 0.031,
    probs: { home: 0.62, draw: 0.22, away: 0.16 },
    original_probs: { home: 0.65, draw: 0.21, away: 0.14 },
    reason: 'Injury — knee',
  },
];

export default function LineupAlerts() {
  const [filter, setFilter] = useState('all');
  const leagues = [...new Set(DEMO_ALERTS.map(a => a.league))];
  const filtered = DEMO_ALERTS.filter(a => filter === 'all' || a.league === filter);

  return (
    <div>
      <PageHeader title="Lineup Monitor" subtitle="Key player absence detection and win probability impact">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20">
          <Users size={14} className="text-orange-400" />
          <span className="text-xs font-semibold text-orange-400">{filtered.length} alert{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </PageHeader>

      {/* Preview banner */}
      <div className="glass-card p-4 mb-6 flex items-start gap-3 border-l-2 border-l-orange-500/50">
        <Info size={16} className="text-orange-400 mt-0.5 shrink-0" />
        <div className="text-xs text-text-secondary leading-relaxed">
          <span className="font-semibold text-text-primary">Feature Preview</span> — These are sample alerts showing how the monitor works.
          Connect <span className="text-primary font-semibold">API-Football</span> to receive real-time lineup alerts before kickoff. 
          The model adjusts win probabilities when key players are missing.
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            filter === 'all' ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-bg-card text-text-muted border border-border-subtle hover:text-text-primary'
          }`}>All Leagues</button>
        {leagues.map(l => (
          <button key={l} onClick={() => setFilter(l)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === l ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-bg-card text-text-muted border border-border-subtle hover:text-text-primary'
            }`}>{l}</button>
        ))}
      </div>

      {/* Alert Cards */}
      <div className="space-y-4">
        {filtered.map((a) => (
          <div key={a.id} className="glass-card p-6 border-l-2 border-l-red-500/40">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <LeagueBadge league={a.league} />
                <span className="text-base font-bold text-text-primary">{a.match}</span>
              </div>
              <StatusBadge status="warning">LINEUP ALERT</StatusBadge>
            </div>

            {/* Team & Impact */}
            <div className="flex items-center gap-3 mb-4">
              <UserX size={18} className="text-red-400" />
              <span className="text-sm font-semibold text-text-primary">{a.team}</span>
              <span className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 text-xs font-bold border border-red-500/20">
                <TrendingDown size={11} className="inline mr-1" />
                −{(a.prob_dock * 100).toFixed(1)}% win probability
              </span>
              <span className="px-2 py-0.5 rounded text-xs text-text-muted bg-bg-hover">{a.reason}</span>
            </div>

            {/* Missing Players */}
            <div className="mb-5">
              <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider block mb-2">Missing Key Players</span>
              <div className="flex flex-wrap gap-2">
                {a.missing_players.map((p) => (
                  <span key={p}
                    className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-semibold border border-red-500/15">
                    {p}
                  </span>
                ))}
              </div>
            </div>

            {/* Probability Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-bg-hover">
                <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider block mb-3">
                  Original Probabilities
                </span>
                <ProbabilityBar
                  home={a.original_probs.home}
                  draw={a.original_probs.draw}
                  away={a.original_probs.away}
                />
              </div>
              <div className="p-4 rounded-xl bg-bg-hover border border-red-500/10">
                <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider block mb-3">
                  Adjusted (without {a.missing_players.length > 1 ? 'key players' : a.missing_players[0]})
                </span>
                <ProbabilityBar
                  home={a.probs.home}
                  draw={a.probs.draw}
                  away={a.probs.away}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
