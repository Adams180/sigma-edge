import { useFetch } from '../hooks';
import { api } from '../api';

function marketLabel(market, outcome, line) {
  if (market === 'h2h') return `Match Result — ${outcome}`;
  if (market === 'totals_corners') return `${outcome} ${line} Corners`;
  if (market === 'totals_cards') return `${outcome} ${line} Cards`;
  return `${market} — ${outcome}`;
}

function formatKickoff(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function ValueScanner() {
  const { data, loading, error } = useFetch(
    () => api.valueScanner(1000, 0.07), [], 60000
  );

  if (loading) return <div className="loading">Running value scan</div>;
  if (error) return <div className="error">Error: {error}</div>;

  const signals = data?.signals || [];

  if (signals.length === 0) {
    return (
      <div className="empty-state">
        <div className="icon">🔍</div>
        <p>No edges above 7% found right now.</p>
        <p style={{ fontSize: '0.82rem', marginTop: 8 }}>
          Edges appear when model probabilities diverge from market odds.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 16,
        fontSize: '0.82rem', color: 'var(--text-secondary)',
      }}>
        <span>{signals.length} signal{signals.length !== 1 ? 's' : ''} found</span>
        <span>
          Total exposure: {(data.total_exposure_pct * 100).toFixed(1)}% of ${data.bankroll}
        </span>
      </div>

      {signals.map((s, i) => (
        <div className="card signal-card" key={`${s.fixture_id}-${s.market}-${s.outcome}-${i}`}>
          <div className="card-header">
            <div>
              <span className="league-badge">{s.league}</span>
              <span style={{ marginLeft: 10, fontWeight: 600 }}>{s.match}</span>
            </div>
            <span className="kickoff">{formatKickoff(s.kickoff)}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>
              {marketLabel(s.market, s.outcome, s.line)}
            </span>
            <span className={`ev-badge positive ${s.is_high_variance ? 'high-var' : ''}`}>
              EV +{(s.ev * 100).toFixed(1)}%
            </span>
            {s.is_high_variance && (
              <span style={{ fontSize: '0.72rem', color: 'var(--accent-amber)' }}>
                ⚠ HIGH-VAR
              </span>
            )}
          </div>

          <div className="signal-grid">
            <div className="signal-stat">
              <div className="label">Our Prob</div>
              <div className="value green">{(s.our_prob * 100).toFixed(1)}%</div>
            </div>
            <div className="signal-stat">
              <div className="label">Market Prob</div>
              <div className="value">{(s.market_prob * 100).toFixed(1)}%</div>
            </div>
            <div className="signal-stat">
              <div className="label">Odds</div>
              <div className="value">{s.decimal_odds.toFixed(2)}</div>
            </div>
            <div className="signal-stat">
              <div className="label">Bookmaker</div>
              <div className="value" style={{ fontSize: '0.85rem' }}>{s.bookmaker}</div>
            </div>
            <div className="signal-stat">
              <div className="label">Kelly (used)</div>
              <div className="value amber">{(s.kelly_used * 100).toFixed(2)}%</div>
            </div>
            <div className="signal-stat">
              <div className="label">Stake</div>
              <div className="value green">${s.stake_amount.toFixed(2)}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
