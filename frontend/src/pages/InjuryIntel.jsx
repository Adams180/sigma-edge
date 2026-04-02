import { useState, useEffect } from 'react';
import { Users, TrendingDown, TrendingUp, AlertTriangle, Search, Filter } from 'lucide-react';
import { DemoBadge } from '../components/ui/BackendStatus';
import api from '../api';

// Injury impact data — realistic simulation based on position and player importance
const IMPACT_SCORES = {
  Goalkeeper: { impact: 'Medium', pctShift: -3, reason: 'Slight uptick in goals conceded expected' },
  'Centre-Back': { impact: 'Medium', pctShift: -4, reason: 'Defensive solidity reduced' },
  'Right-Back': { impact: 'Low', pctShift: -2, reason: 'Wing coverage slightly compromised' },
  'Left-Back': { impact: 'Low', pctShift: -2, reason: 'Attacking width reduced' },
  'Defensive Mid': { impact: 'High', pctShift: -7, reason: 'Ball recovery and press disrupted' },
  'Central Mid': { impact: 'Medium', pctShift: -5, reason: 'Midfield creativity and press disrupted' },
  'Attacking Mid': { impact: 'High', pctShift: -8, reason: 'Key creative output lost' },
  Winger: { impact: 'Medium', pctShift: -5, reason: 'Wide threat and crossing reduced' },
  Striker: { impact: 'High', pctShift: -9, reason: 'Primary goal threat removed' },
};

const MOCK_INJURIES = [
  { player: 'Mohamed Salah', team: 'Liverpool', position: 'Winger', status: 'Doubtful', match: 'Liverpool vs Chelsea', date: 'Today', league: 'Premier League' },
  { player: 'Rodri', team: 'Man City', position: 'Defensive Mid', status: 'Out', match: 'Man City vs Arsenal', date: 'Today', league: 'Premier League' },
  { player: 'Pedri', team: 'Barcelona', position: 'Central Mid', status: 'Doubtful', match: 'Barcelona vs Real Madrid', date: 'Tomorrow', league: 'La Liga' },
  { player: 'Lewandowski', team: 'Barcelona', position: 'Striker', status: 'Out', match: 'Barcelona vs Real Madrid', date: 'Tomorrow', league: 'La Liga' },
  { player: 'Kante', team: 'Al-Ittihad', position: 'Defensive Mid', status: 'Doubtful', match: '—', date: '—', league: 'Saudi Pro League' },
  { player: 'Bellingham', team: 'Real Madrid', position: 'Attacking Mid', status: 'Out', match: 'Real Madrid vs Atletico', date: 'This Week', league: 'La Liga' },
  { player: 'Haaland', team: 'Man City', position: 'Striker', status: 'Doubtful', match: 'Man City vs Arsenal', date: 'Today', league: 'Premier League' },
  { player: 'Musiala', team: 'Bayern', position: 'Attacking Mid', status: 'Out', match: 'Bayern vs Dortmund', date: 'This Week', league: 'Bundesliga' },
];

const STATUS_STYLES = {
  'Out':      { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
  'Doubtful': { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
  'Likely':   { bg: 'rgba(34,197,94,0.12)', color: '#22c55e' },
};

const IMPACT_COLOR = {
  High: '#ef4444',
  Medium: '#f59e0b',
  Low: '#94a3b8',
};

export default function InjuryIntel() {
  const [injuries, setInjuries] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // In a full implementation this would fetch real injury data from an API
      // For now show mock data enriched with impact scores
      const enriched = MOCK_INJURIES.map(inj => {
        const impact = IMPACT_SCORES[inj.position] || { impact: 'Medium', pctShift: -4, reason: 'Performance affected' };
        return { ...inj, ...impact };
      });
      setInjuries(enriched);
      setLoading(false);
    })();
  }, []);

  const filtered = injuries.filter(i => {
    const matchesSearch = !search || i.player.toLowerCase().includes(search.toLowerCase()) || i.team.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'All' || i.status === filter || i.impact === filter;
    return matchesSearch && matchesFilter;
  });

  const highImpact = injuries.filter(i => i.impact === 'High' && i.status === 'Out').length;
  const affectedMatches = [...new Set(injuries.filter(i => i.match !== '—').map(i => i.match))].length;

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
          <Users size={24} className="inline mr-2 text-[var(--color-danger)]" />
          Injury Intel
        </h1>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Track player injuries and their quantified impact on match win probability.
          </p>
          <DemoBadge />
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="fs-kpi-card">
          <div className="fs-kpi-header"><span className="fs-kpi-label">High-Impact Absentees</span></div>
          <div className="fs-kpi-value" style={{ color: 'var(--color-danger)', fontSize: '1.8rem' }}>{highImpact}</div>
        </div>
        <div className="fs-kpi-card">
          <div className="fs-kpi-header"><span className="fs-kpi-label">Matches Affected</span></div>
          <div className="fs-kpi-value" style={{ color: 'var(--color-warning)', fontSize: '1.8rem' }}>{affectedMatches}</div>
        </div>
        <div className="fs-kpi-card">
          <div className="fs-kpi-header"><span className="fs-kpi-label">Players Tracked</span></div>
          <div className="fs-kpi-value" style={{ color: 'var(--color-info)', fontSize: '1.8rem' }}>{injuries.length}</div>
        </div>
      </div>

      {/* Critical alerts */}
      {injuries.filter(i => i.impact === 'High' && i.status === 'Out' && i.match !== '—').map((i, idx) => (
        <div key={idx} className="flex items-start gap-3 p-4 rounded-xl mb-3"
          style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <AlertTriangle size={18} style={{ color: '#ef4444', marginTop: 1, flexShrink: 0 }} />
          <div>
            <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {i.player} ({i.team}) ruled out
            </span>
            <span className="ml-2 text-xs" style={{ color: '#ef4444' }}>High Impact</span>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {i.match} · {i.reason} · Win probability shift: <strong style={{ color: '#ef4444' }}>{i.pctShift}%</strong>
            </p>
          </div>
        </div>
      ))}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search player or team..."
            className="pl-8 pr-3 py-1.5 rounded-lg text-sm"
            style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-subtle)', width: 200 }} />
        </div>
        <div className="flex gap-1">
          {['All', 'Out', 'Doubtful', 'High', 'Medium', 'Low'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3 py-1 rounded-full text-xs font-medium transition-all"
              style={{
                background: filter === f ? 'var(--color-primary)' : 'var(--color-bg-elevated)',
                color: filter === f ? '#fff' : 'var(--color-text-secondary)',
                border: `1px solid ${filter === f ? 'var(--color-primary)' : 'var(--color-border-subtle)'}`,
              }}>{f}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="fs-card">
        <div style={{ overflowX: 'auto' }}>
          <table className="fs-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                {['PLAYER', 'TEAM', 'POSITION', 'STATUS', 'MATCH', 'LEAGUE', 'IMPACT', 'PROB SHIFT', 'NOTE'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '0.6rem 0.75rem', fontSize: '0.7rem', color: 'var(--color-text-muted)', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((i, idx) => {
                const statusStyle = STATUS_STYLES[i.status] || STATUS_STYLES['Likely'];
                return (
                  <tr key={idx}>
                    <td style={{ padding: '0.65rem 0.75rem', fontWeight: 600, fontSize: '0.82rem', color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>{i.player}</td>
                    <td style={{ padding: '0.65rem 0.75rem', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{i.team}</td>
                    <td style={{ padding: '0.65rem 0.75rem', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{i.position}</td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: statusStyle.bg, color: statusStyle.color }}>
                        {i.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', fontSize: '0.78rem', color: 'var(--color-text-secondary)', maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.match}</td>
                    <td style={{ padding: '0.65rem 0.75rem', fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{i.league}</td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      <span className="text-[11px] font-semibold" style={{ color: IMPACT_COLOR[i.impact] }}>{i.impact}</span>
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', fontWeight: 700, fontSize: '0.82rem', color: 'var(--color-danger)' }}>
                      {i.pctShift > 0 ? '+' : ''}{i.pctShift}%
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', maxWidth: 200 }}>{i.reason}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                    No injury reports matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
