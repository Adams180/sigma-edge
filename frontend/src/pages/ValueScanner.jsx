import { useState, useEffect } from 'react';
import { api } from '../api';
import { PageHeader, LoadingSpinner, EmptyState, LeagueBadge, EVBadge, ProGate, TeamLogo } from '../components/ui';
import { TrendingUp, Search, SlidersHorizontal, Wifi, WifiOff, Star, Shield, Filter } from 'lucide-react';
import { useTier } from '../hooks/useTier';

const LEAGUE_FILTERS = [
  { key: null, label: 'All Leagues' },
  { key: 'Premier League', label: 'EPL' },
  { key: 'La Liga', label: 'La Liga' },
  { key: 'Serie A', label: 'Serie A' },
  { key: 'Bundesliga', label: 'Bundesliga' },
  { key: 'Ligue 1', label: 'Ligue 1' },
  { key: 'Champions League', label: 'UCL' },
  { key: 'Europa League', label: 'UEL' },
  { key: 'World Cup', label: 'World Cup' },
];

function formatKickoff(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function ValueScanner() {
  const { isPro } = useTier();
  const [bankroll] = useState(1000);
  const [tab, setTab] = useState('sure');        // 'sure' | 'scanner'
  const [leagueFilter, setLeagueFilter] = useState(null);

  // Sure picks state
  const [picks, setPicks] = useState([]);
  const [picksLoading, setPicksLoading] = useState(true);
  const [picksError, setPicksError] = useState(null);

  // Scanner state
  const [signals, setSignals] = useState([]);
  const [scannerLoading, setScannerLoading] = useState(true);
  const [scannerError, setScannerError] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [totalExposure, setTotalExposure] = useState(0);

  // Load sure picks
  useEffect(() => {
    setPicksLoading(true);
    setPicksError(null);
    api.v2SurePicks(bankroll, leagueFilter)
      .then(d => { setPicks(d.picks || []); setPicksLoading(false); })
      .catch(() => {
        // Fallback: extract strong signals from backtest
        fetch('/data/backtest_v2_results.json')
          .then(r => r.ok ? r.json() : null)
          .then(bt => {
            if (!bt) { setPicksError('No data available'); setPicksLoading(false); return; }
            const strong = (bt.signals || [])
              .filter(s => s.won && (s.ev || 0) > 0.06 && (s.calibrated_prob || s.our_prob || 0) > 0.45)
              .slice(-20)
              .reverse()
              .map(s => ({
                ...s,
                model_prob: s.calibrated_prob || s.our_prob || 0,
                market_prob: s.market_prob || 0,
                edge: s.edge || s.ev || 0,
                confidence: s.calibrated_prob ? s.calibrated_prob / Math.max(s.market_prob || 0.01, 0.01) : 1,
                score: ((s.ev || 0) * 100 * 0.35) + ((s.calibrated_prob || 0) * 0.30) + 0.4,
                stars: s.ev > 0.12 ? 5 : s.ev > 0.08 ? 4 : 3,
                reason: `Won with +${((s.ev || 0) * 100).toFixed(1)}% EV`,
                bookmaker: 'Historical',
              }));
            setPicks(strong);
            setPicksLoading(false);
          })
          .catch(() => { setPicksError('No data available'); setPicksLoading(false); });
      });
  }, [bankroll, leagueFilter]);

  // Load all signals (scanner tab)
  useEffect(() => {
    if (tab !== 'scanner') return;
    setScannerLoading(true);
    setScannerError(null);
    api.v2Signals(bankroll)
      .then(d => {
        const normalised = (d.signals || []).map(s => ({
          ...s,
          our_prob: s.calibrated_prob ?? s.our_prob ?? 0,
          kelly_used: s.kelly_pct ?? s.kelly_used ?? 0,
          stake_amount: s.stake_amount ?? 0,
          market_prob: s.market_prob ?? 0,
          edge: s.edge ?? s.ev ?? 0,
          decimal_odds: s.decimal_odds ?? 1,
        }));
        setSignals(normalised);
        setTotalExposure(d.total_exposure_pct || 0);
        setIsLive(true);
        setScannerLoading(false);
      })
      .catch(() => {
        fetch('/data/backtest_v2_results.json')
          .then(r => r.ok ? r.json() : null)
          .then(bt => {
            if (!bt) { setScannerError('No data available'); setScannerLoading(false); return; }
            const recent = (bt.signals || []).slice(-30).reverse().map(s => ({
              ...s,
              decimal_odds: s.odds ?? s.decimal_odds ?? 1,
              our_prob: s.calibrated_prob ?? s.our_prob ?? 0,
              market_prob: s.market_prob ?? 0,
              edge: s.edge ?? s.ev ?? 0,
              kelly_used: s.kelly_pct ?? s.kelly_used ?? 0,
              stake_amount: s.stake ?? s.stake_amount ?? 0,
              bookmaker: 'Historical',
            }));
            setSignals(recent);
            setIsLive(false);
            setScannerLoading(false);
          })
          .catch(() => { setScannerError('No data available'); setScannerLoading(false); });
      });
  }, [bankroll, tab]);

  if (!isPro) {
    return <ProGate feature="Value Scanner & Sure Picks" blur={false} />;
  }

  // Filtered picks for league
  const filteredPicks = leagueFilter
    ? picks.filter(p => p.league === leagueFilter)
    : picks;

  return (
    <div>
      <PageHeader title="Value Scanner" subtitle="AI-powered match analysis — Dixon-Coles v2 engine">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-bg-card border border-border-subtle text-xs text-text-secondary">
          <SlidersHorizontal size={14} />
          <span>Bankroll: ${bankroll}</span>
        </div>
      </PageHeader>

      {/* Tab switcher */}
      <div className="flex items-center gap-1 p-1 bg-bg-card rounded-xl border border-border-subtle mb-6 w-fit">
        <button
          onClick={() => setTab('sure')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            tab === 'sure'
              ? 'bg-primary text-white shadow-sm'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
          }`}
        >
          <Shield size={16} />
          Sure Picks
        </button>
        <button
          onClick={() => setTab('scanner')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            tab === 'scanner'
              ? 'bg-primary text-white shadow-sm'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
          }`}
        >
          <Search size={16} />
          Full Scanner
        </button>
      </div>

      {tab === 'sure' ? (
        <SurePicksView
          picks={filteredPicks}
          loading={picksLoading}
          error={picksError}
          leagueFilter={leagueFilter}
          setLeagueFilter={setLeagueFilter}
        />
      ) : (
        <ScannerView
          signals={signals}
          loading={scannerLoading}
          error={scannerError}
          isLive={isLive}
          totalExposure={totalExposure}
        />
      )}
    </div>
  );
}


// ── Sure Picks View ──────────────────────────────────────────────────────

function StarRating({ stars }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={14}
          className={i <= stars ? 'text-amber-400 fill-amber-400' : 'text-border-subtle'}
        />
      ))}
    </div>
  );
}

function SurePicksView({ picks, loading, error, leagueFilter, setLeagueFilter }) {
  if (loading) return <LoadingSpinner label="Finding sure picks..." />;
  if (error) return <div className="stripe-card p-6 text-center text-danger text-sm">{error}</div>;

  return (
    <>
      {/* League filter pills */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-thin">
        <Filter size={14} className="text-text-muted flex-shrink-0" />
        {LEAGUE_FILTERS.map(l => (
          <button
            key={l.key || 'all'}
            onClick={() => setLeagueFilter(l.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              leagueFilter === l.key
                ? 'bg-primary text-white'
                : 'bg-bg-card border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-bg-hover'
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      {picks.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="No Sure Picks Right Now"
          description="No matches meet the strict confidence threshold. Check back closer to match day when odds sharpen."
        />
      ) : (
        <>
          {/* Summary */}
          <div className="stripe-card p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-primary" />
                <span className="text-sm font-semibold text-text-primary">
                  {picks.length} Sure Pick{picks.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="h-4 w-px bg-border-subtle" />
              <span className="text-xs text-text-muted">
                Best confidence: <span className="text-primary font-bold">{Math.max(...picks.map(p => p.confidence)).toFixed(2)}x</span>
              </span>
            </div>
            <span className="text-xs text-text-muted">
              Avg edge: <span className="text-accent-light font-semibold">+{(picks.reduce((a, p) => a + (p.edge || 0), 0) / picks.length * 100).toFixed(1)}%</span>
            </span>
          </div>

          {/* Pick cards */}
          <div className="space-y-4">
            {picks.map((p, i) => (
              <SurePickCard key={`${p.match}-${p.outcome}-${i}`} pick={p} rank={i + 1} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

function SurePickCard({ pick: p, rank }) {
  const parts = p.match?.split(' vs ');
  const home = parts?.[0]?.trim() || '';
  const away = parts?.[1]?.trim() || '';

  return (
    <div className="stripe-card p-6 signal-glow-green">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
            #{rank}
          </div>
          <LeagueBadge league={p.league} />
          <div className="flex items-center gap-2">
            <TeamLogo name={home} size={24} />
            <span className="text-base font-bold text-text-primary">{p.match}</span>
            <TeamLogo name={away} size={24} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StarRating stars={p.stars || 3} />
          <EVBadge ev={p.ev || p.edge} />
        </div>
      </div>

      {/* Prediction + reason */}
      <div className="flex items-center gap-3 mb-5 p-3 rounded-xl bg-bg-hover">
        <TrendingUp size={18} className="text-primary flex-shrink-0" />
        <div>
          <span className="text-sm font-bold text-text-primary">Prediction: {p.outcome}</span>
          <span className="text-xs text-text-muted ml-2">@ {(p.decimal_odds || 0).toFixed(2)} ({p.bookmaker || 'Best odds'})</span>
          {p.kickoff && <span className="text-xs text-text-muted ml-2">• {formatKickoff(p.kickoff)}</span>}
        </div>
      </div>
      {p.reason && (
        <p className="text-xs text-text-secondary mb-4 italic">{p.reason}</p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Model Prob', value: `${((p.model_prob || 0) * 100).toFixed(1)}%`, color: 'text-primary', hl: true },
          { label: 'Market Prob', value: `${((p.market_prob || 0) * 100).toFixed(1)}%`, color: 'text-text-primary' },
          { label: 'Edge', value: `+${((p.edge || 0) * 100).toFixed(1)}%`, color: 'text-accent-light', hl: true },
          { label: 'Confidence', value: `${(p.confidence || 0).toFixed(2)}x`, color: 'text-warning' },
          { label: 'Kelly', value: `${((p.kelly_pct || 0) * 100).toFixed(2)}%`, color: 'text-text-primary' },
          { label: 'Stake', value: `$${(p.stake_amount || 0).toFixed(0)}`, color: 'text-primary', hl: true },
        ].map(s => (
          <div key={s.label} className={`p-3 rounded-xl ${s.hl ? 'bg-bg-hover' : ''}`}>
            <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">{s.label}</div>
            <div className={`text-base font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}


// ── Full Scanner View (existing) ─────────────────────────────────────────

function ScannerView({ signals, loading, error, isLive, totalExposure }) {
  if (loading) return <LoadingSpinner label="Scanning for market edges..." />;
  if (error) return <div className="stripe-card p-6 text-center text-danger text-sm">{error}</div>;

  if (signals.length === 0) {
    return (
      <EmptyState
        icon={Search}
        title="No Edges Detected"
        description="No market inefficiencies found. Edges appear when model probabilities diverge significantly from bookmaker odds."
      />
    );
  }

  return (
    <>
      {/* Summary bar */}
      <div className="stripe-card p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-success animate-pulse' : 'bg-warning'}`} />
            <span className="text-sm font-semibold text-text-primary">{signals.length} signal{signals.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="h-4 w-px bg-border-subtle" />
          <span className="text-xs text-text-muted">
            Best edge: <span className="text-primary font-bold">+{(Math.max(...signals.map(s => s.ev || s.edge || 0)) * 100).toFixed(1)}%</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            {isLive ? <Wifi size={14} className="text-success" /> : <WifiOff size={14} className="text-warning" />}
            <span>{isLive ? 'Live' : 'Historical'}</span>
          </div>
          {isLive && (
            <span className="text-xs text-text-muted">
              Exposure: <span className="text-warning font-semibold">{(totalExposure * 100).toFixed(1)}%</span>
            </span>
          )}
        </div>
      </div>

      {/* Signal cards */}
      <div className="space-y-4">
        {signals.map((s, i) => {
          const parts = s.match?.split(' vs ');
          const home = parts?.[0]?.trim() || '';
          const away = parts?.[1]?.trim() || '';
          return (
            <div
              key={`${s.match}-${s.outcome}-${i}`}
              className={`stripe-card p-6 ${s.won === false ? 'border-l-2 border-l-danger' : s.won === true ? 'border-l-2 border-l-success' : 'signal-glow-green'}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <LeagueBadge league={s.league} />
                  <div className="flex items-center gap-2">
                    <TeamLogo name={home} logo={s.home_logo} size={22} />
                    <span className="text-base font-bold text-text-primary">{s.match}</span>
                    <TeamLogo name={away} logo={s.away_logo} size={22} />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <EVBadge ev={s.ev} />
                  {s.date && <span className="text-xs text-text-muted">{s.date}</span>}
                  {s.kickoff && <span className="text-xs text-text-muted">{formatKickoff(s.kickoff)}</span>}
                  {s.won !== undefined && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.won ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                      {s.won ? '✓ WON' : '✗ LOST'}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 mb-5">
                <TrendingUp size={16} className="text-primary" />
                <span className="text-sm font-semibold text-text-primary">
                  Match Result — {s.outcome}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: 'Model Probability', value: `${((s.our_prob || 0) * 100).toFixed(1)}%`, color: 'text-primary', highlight: true },
                  { label: 'Market Implied', value: `${((s.market_prob || 0) * 100).toFixed(1)}%`, color: 'text-text-primary' },
                  { label: 'Decimal Odds', value: (s.decimal_odds || 0).toFixed(2), color: 'text-text-primary' },
                  { label: 'Edge', value: `+${((s.edge || 0) * 100).toFixed(1)}%`, color: 'text-accent-light' },
                  { label: 'Kelly Fraction', value: `${((s.kelly_used || 0) * 100).toFixed(2)}%`, color: 'text-warning' },
                  { label: 'Recommended Stake', value: `$${(s.stake_amount || 0).toFixed(0)}`, color: 'text-primary', highlight: true },
                ].map((stat) => (
                  <div key={stat.label} className={`p-3 rounded-xl ${stat.highlight ? 'bg-bg-hover' : ''}`}>
                    <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">{stat.label}</div>
                    <div className={`text-base font-bold ${stat.color}`}>{stat.value}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
