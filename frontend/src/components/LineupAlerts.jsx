import { useFetch } from '../hooks';
import { api } from '../api';

function formatKickoff(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function LineupAlerts() {
  const { data, loading, error } = useFetch(
    () => api.lineupAlerts(), [], 30000
  );

  if (loading) return <div className="loading">Checking lineups</div>;
  if (error) return <div className="error">Error: {error}</div>;

  const alerts = data?.alerts || [];

  if (alerts.length === 0) {
    return (
      <div className="empty-state">
        <div className="icon">📋</div>
        <p>No key-player absences detected.</p>
        <p style={{ fontSize: '0.82rem', marginTop: 8 }}>
          Alerts fire when a top-3 xG or assist player is missing from the starting XI.
        </p>
      </div>
    );
  }

  return (
    <div>
      {alerts.map((a, i) => (
        <div className="card alert-card" key={`${a.fixture_id}-${a.side}-${i}`}>
          <div className="card-header">
            <div>
              <span className="league-badge">{a.league}</span>
              <span style={{ marginLeft: 10, fontWeight: 600 }}>{a.match}</span>
            </div>
            <span className="kickoff">{formatKickoff(a.kickoff)}</span>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            marginBottom: 8, flexWrap: 'wrap',
          }}>
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>
              ⚠️ {a.team}
            </span>
            <span className="dock-badge">
              −{a.prob_dock_pct.toFixed(1)}% win prob
            </span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {a.count_missing} key player{a.count_missing > 1 ? 's' : ''} missing
            </span>
          </div>

          <div className="alert-player-list">
            {a.missing_players.map((name) => (
              <span className="player-chip" key={name}>{name}</span>
            ))}
          </div>

          <div className="prob-bar-container" style={{ marginTop: 14 }}>
            <div className="prob-bar">
              <div className="home"
                style={{ width: `${a.probabilities.home_win * 100}%` }} />
              <div className="draw"
                style={{ width: `${a.probabilities.draw * 100}%` }} />
              <div className="away"
                style={{ width: `${a.probabilities.away_win * 100}%` }} />
            </div>
            <div className="prob-labels">
              <span>Home {(a.probabilities.home_win * 100).toFixed(1)}%</span>
              <span>Draw {(a.probabilities.draw * 100).toFixed(1)}%</span>
              <span>Away {(a.probabilities.away_win * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
