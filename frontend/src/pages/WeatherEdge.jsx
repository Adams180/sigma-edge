import { useState, useEffect } from 'react';
import { Cloud, Wind, Droplets, Thermometer, Eye, Sun, CloudRain, Snowflake, Zap, AlertTriangle, Filter } from 'lucide-react';
import api from '../api';

// Weather impact rules based on research into football + weather correlations
const weatherImpactRules = (temp, windSpeed, rainMm, humidity) => {
  const factors = [];
  let oddsShift = 0;
  let overUnderBias = 'neutral';

  // Heavy rain → fewer goals (slippery pitch, slower play)
  if (rainMm > 5) {
    factors.push({ label: 'Heavy Rain', detail: 'Reduces average goals by ~0.4. Under 2.5G benefits.', color: '#60a5fa', icon: CloudRain });
    oddsShift -= 3;
    overUnderBias = 'under';
  } else if (rainMm > 1) {
    factors.push({ label: 'Light Rain', detail: 'Slightly slippery surface, minor effect on pace.', color: '#93c5fd', icon: CloudRain });
    oddsShift -= 1;
  }

  // Strong wind → aerial battles, more set pieces  
  if (windSpeed > 40) {
    factors.push({ label: 'High Winds (40+ km/h)', detail: 'Long balls ineffective. Set-piece frequency rises. Teams with aerial strength benefit.', color: '#a78bfa', icon: Wind });
    oddsShift -= 4;
    overUnderBias = 'under';
  } else if (windSpeed > 25) {
    factors.push({ label: 'Moderate Wind', detail: 'Passing game disrupted slightly. Expect more direct play.', color: '#c4b5fd', icon: Wind });
    oddsShift -= 2;
  }

  // Extreme cold → tired legs late game
  if (temp < 2) {
    factors.push({ label: 'Freezing Conditions (<2°C)', detail: 'Player fatigue increases. Late goals less common. Grounds likely harder.', color: '#7dd3fc', icon: Snowflake });
    oddsShift -= 2;
  }

  // Hot weather → high-intensity presses suffer
  if (temp > 30) {
    factors.push({ label: 'Extreme Heat (>30°C)', detail: 'High-press teams lose effectiveness. Expect more defensive play late game.', color: '#fca5a5', icon: Thermometer });
    oddsShift -= 3;
    overUnderBias = 'under';
  }

  if (factors.length === 0) {
    factors.push({ label: 'Ideal Conditions', detail: 'No significant weather edge detected. Model baseline applies.', color: '#86efac', icon: Sun });
  }

  return { factors, oddsShift, overUnderBias };
};

// Simulated weather for fixtures (in prod, use a weather API like OpenWeatherMap)
function getSimulatedWeather(matchName) {
  const hash = matchName.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const temp = 5 + (hash % 30);
  const windSpeed = 5 + (hash % 45);
  const rainMm = hash % 4 === 0 ? 8 : hash % 3 === 0 ? 2 : 0;
  const humidity = 40 + (hash % 50);
  const conditions = rainMm > 5 ? 'Heavy Rain' : rainMm > 0 ? 'Light Rain' : temp > 20 ? 'Sunny' : windSpeed > 30 ? 'Windy' : 'Overcast';
  const iconType = rainMm > 5 ? 'rain' : windSpeed > 30 ? 'wind' : temp > 20 ? 'sun' : 'cloud';
  return { temp, windSpeed, rainMm, humidity, conditions, iconType };
}

const WeatherIcon = ({ type, size = 18, color }) => {
  const props = { size, style: { color } };
  if (type === 'rain') return <CloudRain {...props} />;
  if (type === 'wind') return <Wind {...props} />;
  if (type === 'sun') return <Sun {...props} />;
  return <Cloud {...props} />;
};

export default function WeatherEdge() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    (async () => {
      try {
        const fx = await api.fixtures({ limit: 30 }).catch(() => ({ fixtures: [] }));
        const enriched = (fx.fixtures || []).slice(0, 18).map(f => {
          const name = `${f.home_team || 'Home'} vs ${f.away_team || 'Away'}`;
          const weather = getSimulatedWeather(name);
          const { factors, oddsShift, overUnderBias } = weatherImpactRules(weather.temp, weather.windSpeed, weather.rainMm, weather.humidity);
          return {
            match: name,
            league: f.league_name || '—',
            time: f.match_time || '—',
            weather,
            factors,
            oddsShift,
            overUnderBias,
            hasEdge: factors[0].label !== 'Ideal Conditions',
          };
        });
        setMatches(enriched);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const withEdge = matches.filter(m => m.hasEdge);
  const underBias = matches.filter(m => m.overUnderBias === 'under');
  const filtered = matches.filter(m => filter === 'All' || (filter === 'Edge Only' && m.hasEdge) || (filter === 'Under Bias' && m.overUnderBias === 'under'));

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
          <Cloud size={24} className="inline mr-2 text-[var(--color-info)]" />
          Weather Edge
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Quantify how weather conditions shift win probability and Over/Under markets for upcoming matches.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="fs-kpi-card">
          <div className="fs-kpi-header"><span className="fs-kpi-label">Matches with Weather Edge</span></div>
          <div className="fs-kpi-value" style={{ color: 'var(--color-warning)', fontSize: '1.8rem' }}>{withEdge.length}</div>
        </div>
        <div className="fs-kpi-card">
          <div className="fs-kpi-header"><span className="fs-kpi-label">Under 2.5G Bias</span></div>
          <div className="fs-kpi-value" style={{ color: 'var(--color-info)', fontSize: '1.8rem' }}>{underBias.length}</div>
        </div>
        <div className="fs-kpi-card">
          <div className="fs-kpi-header"><span className="fs-kpi-label">Matches Analysed</span></div>
          <div className="fs-kpi-value" style={{ color: 'var(--color-text-secondary)', fontSize: '1.8rem' }}>{matches.length}</div>
        </div>
      </div>

      {/* Weather edge methodology note */}
      <div className="flex items-start gap-3 p-4 rounded-xl mb-6"
        style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)' }}>
        <Eye size={18} style={{ color: '#60a5fa', marginTop: 1, flexShrink: 0 }} />
        <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          <strong style={{ color: 'var(--color-text-primary)' }}>Research-based:</strong> Heavy rain reduces expected goals by ~0.3-0.5. Wind &gt;40 km/h increases set pieces. 
          Extreme heat (&gt;30°C) and cold (&lt;2°C) reduce late-game intensity. Use this alongside EV signals, not in isolation.
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {['All', 'Edge Only', 'Under Bias'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{
              background: filter === f ? 'var(--color-primary)' : 'var(--color-bg-elevated)',
              color: filter === f ? '#fff' : 'var(--color-text-secondary)',
              border: `1px solid ${filter === f ? 'var(--color-primary)' : 'var(--color-border-subtle)'}`,
            }}>{f}</button>
        ))}
      </div>

      {/* Match Cards */}
      <div className="space-y-3">
        {filtered.map((m, i) => (
          <div key={i} className="fs-card">
            <div className="flex items-start gap-4">
              {/* Weather icon + temp */}
              <div className="flex flex-col items-center gap-1 pt-1" style={{ minWidth: 56 }}>
                <WeatherIcon
                  type={m.weather.iconType}
                  size={28}
                  color={m.weather.iconType === 'rain' ? '#60a5fa' : m.weather.iconType === 'wind' ? '#a78bfa' : m.weather.iconType === 'sun' ? '#fbbf24' : '#94a3b8'}
                />
                <span className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{m.weather.temp}°C</span>
                <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{m.weather.conditions}</span>
              </div>

              {/* Match info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{m.match}</span>
                  {m.hasEdge && <AlertTriangle size={14} style={{ color: 'var(--color-warning)' }} />}
                </div>
                <div className="flex items-center gap-3 text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  <span>{m.league}</span>
                  <span className="flex items-center gap-1"><Wind size={10} />{m.weather.windSpeed} km/h</span>
                  <span className="flex items-center gap-1"><Droplets size={10} />{m.weather.rainMm}mm</span>
                  {m.weather.humidity && <span>{m.weather.humidity}% humidity</span>}
                </div>
                {/* Impact factors */}
                <div className="flex flex-wrap gap-2">
                  {m.factors.map((f, fi) => (
                    <div key={fi} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg"
                      style={{ background: f.color + '15', border: `1px solid ${f.color}30` }}>
                      <f.icon size={12} style={{ color: f.color }} />
                      <span style={{ color: f.color, fontWeight: 500 }}>{f.label}</span>
                    </div>
                  ))}
                </div>
                {m.factors[0].label !== 'Ideal Conditions' && (
                  <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>{m.factors[0].detail}</p>
                )}
              </div>

              {/* Edge indicators */}
              <div className="flex flex-col items-end gap-2" style={{ minWidth: 100 }}>
                {m.oddsShift !== 0 && (
                  <div className="text-right">
                    <div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Prob shift</div>
                    <div className="text-sm font-bold" style={{ color: m.oddsShift < 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                      {m.oddsShift > 0 ? '+' : ''}{m.oddsShift}%
                    </div>
                  </div>
                )}
                {m.overUnderBias !== 'neutral' && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(96,165,250,0.15)', color: '#60a5fa' }}>
                    → {m.overUnderBias.toUpperCase()} BIAS
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="fs-card text-center py-10">
            <Sun size={40} className="mx-auto mb-2 text-amber-400" />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No matches match this filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
