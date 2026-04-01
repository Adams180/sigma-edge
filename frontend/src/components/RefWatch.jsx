import { useFetch } from '../hooks';
import { api } from '../api';

function cardClass(avg) {
  if (avg >= 5.0) return 'hot';
  if (avg >= 3.5) return 'warm';
  return 'cool';
}

function formatKickoff(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function RefWatch() {
  const { data, loading, error } = useFetch(
    () => api.refWatch(30), [], 60000
  );

  if (loading) return <div className="loading">Loading referee data</div>;
  if (error) return <div className="error">Error: {error}</div>;

  const matches = data?.matches || [];

  if (matches.length === 0) {
    return (
      <div className="empty-state">
        <div className="icon">🟨</div>
        <p>No referee data available for upcoming fixtures.</p>
        <p style={{ fontSize: '0.82rem', marginTop: 8 }}>
          Referee mappings populate once fixtures are ingested with referee info.
        </p>
      </div>
    );
  }

  return (
    <div>
      {matches.map((m) => (
        <div className="card ref-card" key={m.fixture_id}>
          <div className="card-header">
            <div>
              <span className="league-badge">{m.league}</span>
              <span style={{ marginLeft: 10, fontWeight: 600 }}>{m.match}</span>
            </div>
            <span className="kickoff">{formatKickoff(m.kickoff)}</span>
          </div>

          <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 6 }}>
            🧑‍⚖️ {m.referee.name}
            <span style={{
              fontSize: '0.75rem', color: 'var(--text-secondary)',
              fontWeight: 400, marginLeft: 8,
            }}>
              ({m.referee.matches} matches)
            </span>
          </div>

          <div className="ref-stats">
            <div className="ref-stat">
              <div className="label">Avg Yellows / Match</div>
              <div className={`value ${cardClass(m.referee.avg_yellows)}`}>
                {m.referee.avg_yellows.toFixed(1)}
              </div>
            </div>
            <div className="ref-stat">
              <div className="label">Avg Reds / Match</div>
              <div className={`value ${m.referee.avg_reds >= 0.2 ? 'hot' : 'cool'}`}>
                {m.referee.avg_reds.toFixed(2)}
              </div>
            </div>
            <div className="ref-stat">
              <div className="label">Model: Over 3.5 Cards</div>
              <div className={`value ${m.model_cards.over_3_5_prob >= 0.55 ? 'hot' : 'cool'}`}>
                {(m.model_cards.over_3_5_prob * 100).toFixed(1)}%
              </div>
            </div>
            <div className="ref-stat">
              <div className="label">Combined Card λ</div>
              <div className="value">{m.model_cards.combined_lambda.toFixed(1)}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
