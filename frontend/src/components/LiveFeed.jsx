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

export default function LiveFeed() {
  const { data, loading, error } = useFetch(
    () => api.upcomingFixtures(50), [], 30000
  );

  if (loading) return <div className="loading">Loading fixtures</div>;
  if (error) return <div className="error">Error: {error}</div>;

  const fixtures = data?.fixtures || [];

  if (fixtures.length === 0) {
    return (
      <div className="empty-state">
        <div className="icon">⚽</div>
        <p>No upcoming fixtures in the database yet.</p>
        <p style={{ fontSize: '0.82rem', marginTop: 8 }}>
          Run <code>python main.py --all</code> to ingest data.
        </p>
      </div>
    );
  }

  return (
    <div>
      {fixtures.map((f) => (
        <div className="card" key={f.fixture_id}>
          <div className="card-header">
            <span className="league-badge">{f.league}</span>
            <span className="kickoff">{formatKickoff(f.kickoff)}</span>
          </div>
          <div className="match-row">
            <span>{f.home_team}</span>
            {f.status !== 'NS' ? (
              <span className="score">
                {f.score.home ?? '–'} : {f.score.away ?? '–'}
              </span>
            ) : (
              <span className="vs">vs</span>
            )}
            <span>{f.away_team}</span>
          </div>
          {f.status !== 'NS' && (
            <div style={{ textAlign: 'center', marginTop: 6 }}>
              <span style={{
                fontSize: '0.72rem',
                padding: '2px 8px',
                borderRadius: 4,
                background: f.status === 'LIVE' ? 'rgba(255,82,82,0.2)' : 'rgba(0,230,118,0.12)',
                color: f.status === 'LIVE' ? '#ff5252' : '#00e676',
                fontWeight: 700,
              }}>
                {f.status}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
