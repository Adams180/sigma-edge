import { useState, useEffect, useMemo } from 'react';
import { PageHeader, LoadingSpinner, LeagueBadge, EVBadge, ProGate } from '../components/ui';
import { History, Search, Filter, ChevronDown, ChevronUp, CheckCircle, XCircle, ArrowUpDown } from 'lucide-react';
import { useTier } from '../hooks/useTier';
import api from '../api';

export default function SignalHistory() {
  const { isPro } = useTier();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [leagueFilter, setLeagueFilter] = useState('all');
  const [outcomeFilter, setOutcomeFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('date');
  const [sortDir, setSortDir] = useState(-1); // -1 = desc
  const [expandedIdx, setExpandedIdx] = useState(null);

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

  const signals = data?.signals || [];

  // Get unique leagues
  const leagues = useMemo(() => {
    const set = new Set(signals.map(s => s.league));
    return Array.from(set).sort();
  }, [signals]);

  // Filter and sort
  const filtered = useMemo(() => {
    let list = [...signals];

    if (leagueFilter !== 'all') list = list.filter(s => s.league === leagueFilter);
    if (outcomeFilter !== 'all') list = list.filter(s => s.outcome === outcomeFilter);
    if (resultFilter === 'won') list = list.filter(s => s.won);
    if (resultFilter === 'lost') list = list.filter(s => !s.won);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(s => s.match.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      let va = a[sortField], vb = b[sortField];
      if (typeof va === 'string') return sortDir * va.localeCompare(vb);
      return sortDir * (va - vb);
    });

    return list;
  }, [signals, leagueFilter, outcomeFilter, resultFilter, searchTerm, sortField, sortDir]);

  // Summary stats for filtered set
  const stats = useMemo(() => {
    if (filtered.length === 0) return null;
    const wins = filtered.filter(s => s.won).length;
    const pnl = filtered.reduce((sum, s) => sum + s.pnl, 0);
    const staked = filtered.reduce((sum, s) => sum + s.stake, 0);
    return {
      count: filtered.length,
      wins,
      losses: filtered.length - wins,
      hitRate: wins / filtered.length,
      pnl,
      roi: staked > 0 ? (pnl / staked) * 100 : 0,
    };
  }, [filtered]);

  function toggleSort(field) {
    if (sortField === field) {
      setSortDir(d => d * -1);
    } else {
      setSortField(field);
      setSortDir(-1);
    }
  }

  function SortBtn({ field, children }) {
    const active = sortField === field;
    return (
      <button onClick={() => toggleSort(field)} className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wider ${active ? 'text-primary' : 'text-text-muted'}`}>
        {children}
        {active && (sortDir === 1 ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
        {!active && <ArrowUpDown size={10} className="opacity-40" />}
      </button>
    );
  }

  if (loading) return <LoadingSpinner label="Loading signal history..." />;

  if (!isPro) {
    return (
      <ProGate feature="Full Signal History (all leagues, all seasons)" blur={false} />
    );
  }

  return (
    <div>
      <PageHeader title="Signal History" subtitle={`${signals.length} signals across ${data?.period?.start} to ${data?.period?.end}`}>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-card border border-border-subtle">
          <History size={14} className="text-primary" />
          <span className="text-xs font-medium text-text-secondary">Backtest v2</span>
        </div>
      </PageHeader>

      {/* Filters */}
      <div className="stripe-card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-text-muted" />
            <span className="text-xs font-semibold text-text-muted uppercase">Filters</span>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search teams..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 rounded-lg bg-bg-hover border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 w-48"
            />
          </div>

          <select
            value={leagueFilter}
            onChange={e => setLeagueFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-bg-hover border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-primary/50"
          >
            <option value="all">All Leagues</option>
            {leagues.map(l => <option key={l} value={l}>{l}</option>)}
          </select>

          <select
            value={outcomeFilter}
            onChange={e => setOutcomeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-bg-hover border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-primary/50"
          >
            <option value="all">All Outcomes</option>
            <option value="Home">Home</option>
            <option value="Draw">Draw</option>
            <option value="Away">Away</option>
          </select>

          <select
            value={resultFilter}
            onChange={e => setResultFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-bg-hover border border-border-subtle text-sm text-text-primary focus:outline-none focus:border-primary/50"
          >
            <option value="all">All Results</option>
            <option value="won">Winners ✓</option>
            <option value="lost">Losers ✗</option>
          </select>

          {(leagueFilter !== 'all' || outcomeFilter !== 'all' || resultFilter !== 'all' || searchTerm) && (
            <button
              onClick={() => { setLeagueFilter('all'); setOutcomeFilter('all'); setResultFilter('all'); setSearchTerm(''); }}
              className="text-xs text-danger hover:text-danger/80 font-medium"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Summary bar */}
      {stats && (
        <div className="stripe-card p-4 mb-6 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">Showing</span>
            <span className="text-sm font-bold text-text-primary">{stats.count}</span>
          </div>
          <div className="h-4 w-px bg-border-subtle" />
          <div className="flex items-center gap-1">
            <CheckCircle size={14} className="text-success" />
            <span className="text-sm font-semibold text-success">{stats.wins}W</span>
          </div>
          <div className="flex items-center gap-1">
            <XCircle size={14} className="text-danger" />
            <span className="text-sm font-semibold text-danger">{stats.losses}L</span>
          </div>
          <div className="h-4 w-px bg-border-subtle" />
          <div className="text-xs text-text-muted">
            Hit Rate: <span className="text-text-primary font-semibold">{(stats.hitRate * 100).toFixed(1)}%</span>
          </div>
          <div className="text-xs text-text-muted">
            ROI: <span className={`font-bold ${stats.roi >= 0 ? 'text-success' : 'text-danger'}`}>{stats.roi >= 0 ? '+' : ''}{stats.roi.toFixed(1)}%</span>
          </div>
          <div className="text-xs text-text-muted">
            P&L: <span className={`font-bold ${stats.pnl >= 0 ? 'text-success' : 'text-danger'}`}>{stats.pnl >= 0 ? '+' : ''}${stats.pnl.toFixed(0)}</span>
          </div>
        </div>
      )}

      {/* Signal table */}
      {filtered.length === 0 ? (
        <div className="stripe-card p-8 text-center">
          <p className="text-sm text-text-muted">No signals match your filters.</p>
        </div>
      ) : (
        <div className="stripe-card overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[100px_1fr_90px_70px_70px_80px_70px_80px_70px] gap-2 px-5 py-3 border-b border-border-subtle bg-bg-hover/30">
            <SortBtn field="date">Date</SortBtn>
            <SortBtn field="match">Match</SortBtn>
            <span className="text-xs font-semibold text-text-muted uppercase">League</span>
            <SortBtn field="outcome">Bet</SortBtn>
            <SortBtn field="odds">Odds</SortBtn>
            <SortBtn field="ev">EV</SortBtn>
            <SortBtn field="stake">Stake</SortBtn>
            <SortBtn field="pnl">P&L</SortBtn>
            <span className="text-xs font-semibold text-text-muted uppercase text-center">Result</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-border-subtle/50">
            {filtered.map((sig, i) => (
              <div key={`${sig.date}-${sig.match}-${i}`}>
                <div
                  className="grid grid-cols-[100px_1fr_90px_70px_70px_80px_70px_80px_70px] gap-2 px-5 py-3 items-center hover:bg-bg-hover/30 cursor-pointer transition-colors"
                  onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                >
                  <span className="text-xs text-text-muted font-mono">{sig.date}</span>
                  <span className="text-sm font-semibold text-text-primary truncate">{sig.match}</span>
                  <LeagueBadge league={sig.league} />
                  <span className="text-xs font-semibold text-text-secondary">{sig.outcome}</span>
                  <span className="text-sm font-mono text-text-primary">{sig.odds.toFixed(2)}</span>
                  <EVBadge ev={sig.ev} />
                  <span className="text-sm font-mono text-text-primary">${sig.stake.toFixed(0)}</span>
                  <span className={`text-sm font-bold font-mono ${sig.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                    {sig.pnl >= 0 ? '+' : ''}{sig.pnl.toFixed(2)}
                  </span>
                  <div className="flex justify-center">
                    {sig.won ? (
                      <CheckCircle size={18} className="text-success" />
                    ) : (
                      <XCircle size={18} className="text-danger" />
                    )}
                  </div>
                </div>

                {/* Expanded detail */}
                {expandedIdx === i && (
                  <div className="px-5 py-4 bg-bg-hover/20 border-t border-border-subtle/30">
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                      {[
                        { label: 'Model Prob', value: `${(sig.model_prob * 100).toFixed(1)}%` },
                        { label: 'Calibrated', value: `${(sig.calibrated_prob * 100).toFixed(1)}%` },
                        { label: 'Market Prob', value: `${(sig.market_prob * 100).toFixed(1)}%` },
                        { label: 'Edge', value: `+${(sig.edge * 100).toFixed(1)}%` },
                        { label: 'Kelly %', value: `${(sig.kelly_pct * 100).toFixed(2)}%` },
                        { label: 'Market', value: sig.market || 'Match Result' },
                      ].map(stat => (
                        <div key={stat.label}>
                          <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">{stat.label}</div>
                          <div className="text-sm font-bold text-text-primary">{stat.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
