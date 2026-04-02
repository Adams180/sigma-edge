const BASE = (import.meta.env.VITE_API_URL || '') + '/api';

async function fetchJSON(path, params = {}, timeoutMs = 12000) {
  const url = new URL(path, window.location.origin);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
    return res.json();
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new Error('Request timed out — backend may be starting up. Try again in a moment.');
    throw err;
  }
}

export const api = {
  upcomingFixtures: (limit = 50) =>
    fetchJSON(`${BASE}/fixtures/upcoming`, { limit }),

  fixtures: ({ league_id, status, date_from, date_to, limit = 200 } = {}) =>
    fetchJSON(`${BASE}/fixtures`, { league_id, status, date_from, date_to, limit }),

  teamLogos: () =>
    fetchJSON(`${BASE}/teams/logos`),

  valueScanner: (bankroll = 1000, threshold = 0.07) =>
    fetchJSON(`${BASE}/value-scanner`, { bankroll, threshold }),

  refWatch: (limit = 30) =>
    fetchJSON(`${BASE}/ref-watch`, { limit }),

  lineupAlerts: () =>
    fetchJSON(`${BASE}/lineup-alerts`),

  fixtureDetail: (id) =>
    fetchJSON(`${BASE}/fixture/${id}/detail`),

  health: () =>
    fetchJSON(`${BASE}/health`),

  // V2 — Dixon-Coles engine
  v2Signals: (bankroll = 1000) =>
    fetchJSON(`${BASE}/v2/signals`, { bankroll }),

  v2Backtest: () =>
    fetchJSON(`${BASE}/v2/backtest`),
};

export default api;
