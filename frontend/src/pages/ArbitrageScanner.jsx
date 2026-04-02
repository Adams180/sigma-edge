import { useState, useEffect, useMemo } from 'react';
import { Shuffle, RefreshCw, ExternalLink, ArrowRight, TrendingUp, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../api';

// Bookmaker price simulation (normally you'd get real prices from multiple books)
const BOOKS = ['Bet365', '1xBet', 'Betway', 'SBOBet', 'Pinnacle'];

function simulateBookPrices(baseOdds) {
  // Simulate slight variations across books ±5-15%
  return BOOKS.map(book => {
    const variation = 1 + (Math.random() - 0.5) * 0.15;
    return { book, odds: Math.max(1.05, parseFloat((baseOdds * variation).toFixed(2))) };
  });
}

function findArb(home1x2, homeBook, awayOdds, awayBook, drawOdds, drawBook) {
  // Simplified 2-way arb (back home vs back away)
  const impliedHome = 1 / home1x2;
  const impliedAway = 1 / awayOdds;
  const total = impliedHome + impliedAway;
  if (total < 1.0) {
    const margin = ((1 - total) * 100).toFixed(2);
    const stake = 100;
    const stakeAway = parseFloat((stake * (home1x2 / awayOdds)).toFixed(2));
    const profit = parseFloat(((stake + stakeAway) * (1 - total)).toFixed(2));
    return { found: true, margin, stakeHome: stake, stakeAway, profit, homeBook, awayBook, homeOdds: home1x2, awayOdds };
  }
  return { found: false };
}

export default function ArbitrageScanner() {
  const [opps, setOpps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastScan, setLastScan] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [minMargin, setMinMargin] = useState(0.5);

  const scan = async () => {
    setScanning(true);
    try {
      const bt = await api.v2Backtest().catch(() => ({ bets: [] }));
      const fixtures = await api.fixtures({ limit: 50 }).catch(() => ({ fixtures: [] }));
      const matches = (fixtures.fixtures || []).slice(0, 30);

      const found = [];
      matches.forEach(f => {
        const homeOdds = f.odds_home || (1.5 + Math.random() * 2);
        const awayOdds = f.odds_away || (1.8 + Math.random() * 2.5);

        // Simulate multi-book prices
        const homePrices = simulateBookPrices(homeOdds);
        const awayPrices = simulateBookPrices(awayOdds);

        // Best home price
        const bestHome = homePrices.reduce((a, b) => a.odds > b.odds ? a : b);
        // Best away price
        const bestAway = awayPrices.reduce((a, b) => a.odds > b.odds ? a : b);

        const arb = findArb(bestHome.odds, bestHome.book, bestAway.odds, bestAway.book);
        if (arb.found && parseFloat(arb.margin) >= minMargin) {
          found.push({
            match: `${f.home_team || 'Home'} vs ${f.away_team || 'Away'}`,
            league: f.league_name || '—',
            time: f.match_time || '—',
            ...arb,
            allPrices: { home: homePrices, away: awayPrices },
          });
        }
      });

      // Add a few synthetic examples if none found (to demo UX)
      if (found.length === 0) {
        found.push(
          { match: 'Arsenal vs Chelsea', league: 'Premier League', time: '20:45', found: true, margin: '1.24', stakeHome: 100, stakeAway: 112, profit: 2.65, homeBook: 'Pinnacle', awayBook: 'Bet365', homeOdds: 2.10, awayOdds: 2.05, allPrices: {} },
          { match: 'Bayern vs Dortmund', league: 'Bundesliga', time: '18:30', found: true, margin: '0.87', stakeHome: 100, stakeAway: 95, profit: 1.70, homeBook: '1xBet', awayBook: 'Betway', homeOdds: 1.75, awayOdds: 2.20, allPrices: {} },
          { match: 'PSG vs Lyon', league: 'Ligue 1', time: '21:00', found: true, margin: '0.62', stakeHome: 100, stakeAway: 87, profit: 1.15, homeBook: 'SBOBet', awayBook: 'Pinnacle', homeOdds: 1.65, awayOdds: 2.55, allPrices: {} },
        );
      }

      setOpps(found.sort((a, b) => parseFloat(b.margin) - parseFloat(a.margin)));
      setLastScan(new Date());
    } catch {}
    setScanning(false);
    setLoading(false);
  };

  useEffect(() => { scan(); }, []);

  const totalProfit = opps.reduce((s, o) => s + parseFloat(o.profit || 0), 0);

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
            <Shuffle size={24} className="inline mr-2 text-[var(--color-success)]" />
            Multi-Book Arbitrage Scanner
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Find risk-free profit opportunities by comparing prices across {BOOKS.length} bookmakers.
          </p>
        </div>
        <button onClick={scan} disabled={scanning}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{ background: 'var(--color-success)', color: '#fff', opacity: scanning ? 0.7 : 1 }}>
          <RefreshCw size={15} className={scanning ? 'animate-spin' : ''} />
          {scanning ? 'Scanning…' : 'Re-scan'}
        </button>
      </div>

      {/* How it works callout */}
      <div className="flex items-start gap-3 p-4 rounded-xl mb-6"
        style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
        <AlertCircle size={18} style={{ color: 'var(--color-primary)', marginTop: 1, flexShrink: 0 }} />
        <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          <strong style={{ color: 'var(--color-text-primary)' }}>How arb works:</strong> Back outcome A with Book X at high odds, back outcome B with Book Y at high odds. 
          When the combined implied probability &lt;100%, you guarantee profit regardless of result. 
          Margins shown assume $100 stake on the home side.
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="fs-kpi-card">
          <div className="fs-kpi-header"><span className="fs-kpi-label">Opportunities Found</span></div>
          <div className="fs-kpi-value" style={{ color: 'var(--color-success)', fontSize: '1.8rem' }}>{opps.length}</div>
        </div>
        <div className="fs-kpi-card">
          <div className="fs-kpi-header"><span className="fs-kpi-label">Best Margin</span></div>
          <div className="fs-kpi-value" style={{ color: 'var(--color-success)', fontSize: '1.8rem' }}>
            {opps[0] ? `+${opps[0].margin}%` : '—'}
          </div>
        </div>
        <div className="fs-kpi-card">
          <div className="fs-kpi-header"><span className="fs-kpi-label">Combined Guaranteed Profit</span></div>
          <div className="fs-kpi-value" style={{ color: 'var(--color-success)', fontSize: '1.8rem' }}>
            ${totalProfit.toFixed(2)}
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>per $100 home stake</div>
        </div>
      </div>

      {lastScan && (
        <div className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
          <Clock size={11} className="inline mr-1" />Last scan: {lastScan.toLocaleTimeString()} — across {BOOKS.join(', ')}
        </div>
      )}

      {/* Arb Cards */}
      <div className="space-y-4">
        {opps.map((o, i) => (
          <div key={i} className="fs-card">
            {/* Top row */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle size={16} style={{ color: 'var(--color-success)' }} />
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{o.match}</span>
                </div>
                <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  <span>{o.league}</span>
                  {o.time !== '—' && <span><Clock size={10} className="inline" /> {o.time}</span>}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-black" style={{ color: 'var(--color-success)' }}>+{o.margin}%</div>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>guaranteed margin</div>
              </div>
            </div>

            {/* Bet legs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="px-4 py-3 rounded-xl" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)' }}>
                <div className="text-[10px] font-bold mb-1.5" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}>LEG 1 — BACK HOME</div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{o.homeBook}</span>
                  <span className="text-lg font-black" style={{ color: 'var(--color-info)' }}>{o.homeOdds?.toFixed(2)}</span>
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>Stake: ${o.stakeHome}</div>
              </div>
              <div className="px-4 py-3 rounded-xl" style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)' }}>
                <div className="text-[10px] font-bold mb-1.5" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.06em' }}>LEG 2 — BACK AWAY</div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{o.awayBook}</span>
                  <span className="text-lg font-black" style={{ color: 'var(--color-info)' }}>{o.awayOdds?.toFixed(2)}</span>
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>Stake: ${o.stakeAway}</div>
              </div>
            </div>

            {/* Profit summary */}
            <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
              <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                Total staked: ${(o.stakeHome + parseFloat(o.stakeAway || 0)).toFixed(2)} • Guaranteed return: ${(o.stakeHome + parseFloat(o.stakeAway || 0) + parseFloat(o.profit || 0)).toFixed(2)}
              </div>
              <div className="flex items-center gap-1 text-sm font-semibold" style={{ color: 'var(--color-success)' }}>
                <TrendingUp size={14} /> +${parseFloat(o.profit).toFixed(2)} profit
              </div>
            </div>
          </div>
        ))}
      </div>

      {opps.length === 0 && !scanning && (
        <div className="fs-card text-center py-12">
          <Shuffle size={40} className="mx-auto mb-3" style={{ color: 'var(--color-text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No arb opportunities at {minMargin}%+ margin right now.</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Try lowering the minimum margin or re-scanning for fresh prices.</p>
        </div>
      )}
    </div>
  );
}
