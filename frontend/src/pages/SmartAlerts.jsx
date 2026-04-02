import { useState } from 'react';
import { Bell, Plus, Trash2, ToggleLeft, ToggleRight, Filter, Zap } from 'lucide-react';

const LEAGUES = ['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1', 'Champions League', 'Any League'];
const CONDITIONS = [
  { id: 'ev_positive', label: 'EV > 0%' },
  { id: 'ev_5', label: 'EV > 5%' },
  { id: 'ev_10', label: 'EV > 10%' },
  { id: 'odds_under_2', label: 'Odds < 2.00' },
  { id: 'odds_2_3', label: 'Odds 2.00 - 3.00' },
  { id: 'odds_over_3', label: 'Odds > 3.00' },
  { id: 'model_70', label: 'Model Prob > 70%' },
  { id: 'anomaly', label: 'Anomaly Detected' },
  { id: 'home_fav', label: 'Home Favorite' },
  { id: 'underdog', label: 'Underdog Value' },
];

export default function SmartAlerts() {
  const [alerts, setAlerts] = useState([
    { id: 1, name: 'High EV Finder', league: 'Any League', conditions: ['ev_5'], enabled: true },
    { id: 2, name: 'PL Value Spots', league: 'Premier League', conditions: ['ev_positive', 'odds_2_3'], enabled: true },
  ]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', league: 'Any League', conditions: [] });

  const addAlert = () => {
    if (!form.name.trim() || form.conditions.length === 0) return;
    setAlerts([...alerts, { id: Date.now(), ...form, enabled: true }]);
    setForm({ name: '', league: 'Any League', conditions: [] });
    setShowForm(false);
  };

  const toggleAlert = (id) => setAlerts(alerts.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
  const deleteAlert = (id) => setAlerts(alerts.filter(a => a.id !== id));

  const toggleCondition = (condId) => {
    setForm(f => ({
      ...f,
      conditions: f.conditions.includes(condId)
        ? f.conditions.filter(c => c !== condId)
        : [...f.conditions, condId],
    }));
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            <Bell size={24} className="inline mr-2 text-[var(--color-primary)]" />
            Smart Alerts
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Build custom filter chains. Get notified when signals match your criteria.
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ background: 'var(--color-primary)', color: '#fff' }}>
          <Plus size={16} /> New Alert
        </button>
      </div>

      {/* Create Alert Form */}
      {showForm && (
        <div className="fs-card mb-6">
          <p className="text-sm font-medium mb-4" style={{ color: 'var(--color-text-primary)' }}>Create New Alert</p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Alert Name</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. High EV Premier League"
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-subtle)' }} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>League</label>
              <select value={form.league} onChange={e => setForm({ ...form, league: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-subtle)' }}>
                {LEAGUES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
                <Filter size={12} className="inline mr-1" /> Conditions (select at least one)
              </label>
              <div className="flex flex-wrap gap-2">
                {CONDITIONS.map(c => (
                  <button key={c.id} onClick={() => toggleCondition(c.id)}
                    className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
                    style={{
                      background: form.conditions.includes(c.id) ? 'var(--color-primary)' : 'var(--color-bg-elevated)',
                      color: form.conditions.includes(c.id) ? '#fff' : 'var(--color-text-secondary)',
                      border: `1px solid ${form.conditions.includes(c.id) ? 'var(--color-primary)' : 'var(--color-border-subtle)'}`,
                    }}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={addAlert}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'var(--color-primary)', color: '#fff' }}>
                Create Alert
              </button>
              <button onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Alerts */}
      <div className="space-y-3">
        {alerts.length === 0 ? (
          <div className="fs-card text-center py-10">
            <Bell size={40} className="mx-auto mb-3" style={{ color: 'var(--color-text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No alerts configured. Create one to get started.</p>
          </div>
        ) : alerts.map(a => (
          <div key={a.id} className="fs-card" style={{ opacity: a.enabled ? 1 : 0.5 }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => toggleAlert(a.id)} className="transition-colors">
                  {a.enabled
                    ? <ToggleRight size={28} style={{ color: 'var(--color-success)' }} />
                    : <ToggleLeft size={28} style={{ color: 'var(--color-text-muted)' }} />
                  }
                </button>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    <Zap size={14} className="inline mr-1 text-amber-400" />
                    {a.name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {a.league} • {a.conditions.length} condition{a.conditions.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex flex-wrap gap-1">
                  {a.conditions.map(cid => {
                    const cond = CONDITIONS.find(c => c.id === cid);
                    return (
                      <span key={cid} className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-subtle)' }}>
                        {cond?.label || cid}
                      </span>
                    );
                  })}
                </div>
                <button onClick={() => deleteAlert(a.id)}
                  className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10"
                  style={{ color: 'var(--color-danger)' }}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
