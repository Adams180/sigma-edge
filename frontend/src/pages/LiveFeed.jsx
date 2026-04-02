import { useState, useEffect } from 'react';
import { PageHeader, LoadingSpinner, EmptyState, LeagueBadge, StatusBadge } from '../components/ui';
import { Radio, Calendar, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Target } from 'lucide-react';
import api from '../api';
import { TeamLogo } from '../components/ui';

const LEAGUE_COLORS = {
  'Premier League': 'from-purple-500/20 to-purple-600/5',
  'La Liga': 'from-orange-500/20 to-orange-600/5',
  'Ligue 1': 'from-blue-500/20 to-blue-600/5',
};

export default function LiveFeed() {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState(null);
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    api.v2Backtest()
      .then(d => { setSignals(d.signals || []); setLoading(false); })
      .catch(() =>
        fetch('/data/backtest_v2_results.json')
          .then(r => r.json())
          .then(d => { setSignals(d.signals || []); setLoading(false); })
          .catch(() => setLoading(false))
      );
  }, []);

  const filtered = signals
    .filter(s => filter === 'all' || s.league === filter)
    .sort((a, b) => sortOrder === 'desc'
      ? b.date.localeCompare(a.date)
      : a.date.localeCompare(b.date)
    );

  const leagues = [...new Set(signals.map(s => s.league))];
  const wins = filtered.filter(s => s.won).length;
  const losses = filtered.length - wins;

  return (
    <div>
      <PageHeader title="Signal Feed" subtitle="Historical model signals — most recent first">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-card border border-border-subtle">
          <Target size={14} className="text-primary" />
          <span className="text-xs font-medium text-text-secondary">{filtered.length} signals</span>
        </div>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            filter === 'all' ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-bg-card text-text-muted border border-border-subtle hover:text-text-primary'
          }`}
        >All Leagues</button>
        {leagues.map(l => (
          <button key={l} onClick={() => setFilter(l)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === l ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-bg-card text-text-muted border border-border-subtle hover:text-text-primary'
            }`}
          >{l}</button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-text-muted">
            <span className="text-green-400">{wins}W</span> / <span className="text-red-400">{losses}L</span>
          </span>
          <button onClick={() => setSortOrder(o => o === 'desc' ? 'asc' : 'desc')}
            className="p-1.5 rounded-lg bg-bg-card border border-border-subtle text-text-muted hover:text-text-primary transition-colors">
            {sortOrder === 'desc' ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading signal feed..." />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Radio} title="No Signals" description="No signals match the current filter." />
      ) : (
        <div className="space-y-3">
          {filtered.map((s, i) => {
            const isOpen = expanded === i;
            return (
              <div key={`${s.date}-${s.match}-${i}`}
                className={`stripe-card overflow-hidden transition-all cursor-pointer ${
                  s.won ? 'border-l-2 border-l-green-500/60' : 'border-l-2 border-l-red-500/40'
                }`}
                onClick={() => setExpanded(isOpen ? null : i)}
              >
                <div className="p-4 bg-gradient-to-r " style={{backgroundImage: `linear-gradient(to right, ${s.won ? 'rgba(48,177,48,0.08)' : 'rgba(223,27,65,0.06)'}, transparent)`}}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <LeagueBadge league={s.league} />
                      {(() => {
                        const parts = s.match?.split(' vs ');
                        const home = parts?.[0]?.trim() || '';
                        const away = parts?.[1]?.trim() || '';
                        return (
                          <div className="flex items-center gap-1.5">
                            <TeamLogo name={home} size={20} />
                            <span className="text-sm font-bold text-text-primary">{s.match}</span>
                            <TeamLogo name={away} size={20} />
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={s.won ? 'success' : 'danger'}>
                        {s.won ? 'WON' : 'LOST'}
                      </StatusBadge>
                      {isOpen ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-text-muted">
                    <span className="flex items-center gap-1"><Calendar size={11} />{s.date}</span>
                    <span className="px-2 py-0.5 rounded bg-bg-hover text-text-secondary font-semibold">{s.outcome}</span>
                    <span>@ <span className="text-text-primary font-bold">{s.odds?.toFixed(2)}</span></span>
                    <span className={`font-bold ${s.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {s.pnl >= 0 ? '+' : ''}{s.pnl?.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {isOpen && (
                  <div className="px-4 py-3 bg-bg-hover/50 border-t border-border-subtle">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Model Prob</div>
                        <div className="text-sm font-bold text-text-primary">{(s.model_prob * 100).toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Calibrated</div>
                        <div className="text-sm font-bold text-primary">{(s.calibrated_prob * 100).toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Market Prob</div>
                        <div className="text-sm font-bold text-text-secondary">{(s.market_prob * 100).toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Edge</div>
                        <div className="text-sm font-bold text-accent-light">+{(s.edge * 100).toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">EV</div>
                        <div className="text-sm font-bold text-green-400">+{(s.ev * 100).toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Kelly %</div>
                        <div className="text-sm font-bold text-text-primary">{(s.kelly_pct * 100).toFixed(2)}%</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Stake</div>
                        <div className="text-sm font-bold text-text-primary">{s.stake?.toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">P&L</div>
                        <div className={`text-sm font-bold ${s.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {s.pnl >= 0 ? '+' : ''}{s.pnl?.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
