import { useState, useEffect, useMemo } from 'react';
import { Clock, ChevronLeft, ChevronRight, Calendar, TrendingUp, Target, BarChart3 } from 'lucide-react';
import { BackendLoading, BackendError } from '../components/ui/BackendStatus';
import api from '../api';

export default function TimeMachine() {
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dates, setDates] = useState([]);
  const [dateIdx, setDateIdx] = useState(0);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const bt = await api.v2Backtest();
      const allBets = bt.bets || [];
      setBets(allBets);
      const uniq = [...new Set(allBets.map(b => b.date || b.match_date || '').filter(Boolean))].sort().reverse();
      setDates(uniq);
      if (uniq.length) { setSelectedDate(uniq[0]); setDateIdx(0); }
    } catch (err) { setError(err.message); setBets([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const navigate = (dir) => {
    const newIdx = dateIdx + dir;
    if (newIdx >= 0 && newIdx < dates.length) {
      setDateIdx(newIdx);
      setSelectedDate(dates[newIdx]);
    }
  };

  const dayBets = useMemo(() =>
    bets.filter(b => (b.date || b.match_date) === selectedDate),
    [bets, selectedDate]
  );

  const dayStats = useMemo(() => {
    const wins = dayBets.filter(b => b.result === 'Win').length;
    const losses = dayBets.filter(b => b.result === 'Loss').length;
    const totalEv = dayBets.reduce((s, b) => s + (b.ev || 0), 0) / (dayBets.length || 1);
    const avgOdds = dayBets.reduce((s, b) => s + (b.odds || 2), 0) / (dayBets.length || 1);
    return { wins, losses, total: dayBets.length, hitRate: dayBets.length ? ((wins / dayBets.length) * 100).toFixed(0) : 0, avgEv: (totalEv * 100).toFixed(1), avgOdds: avgOdds.toFixed(2) };
  }, [dayBets]);

  if (loading) return <BackendLoading label="Loading match history…" />;
  if (error) return <BackendError msg={error} onRetry={load} />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          <Clock size={24} className="inline mr-2 text-[var(--color-primary)]" />
          Time Machine
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Replay historical match days. See what signals the model generated and how they performed.
        </p>
      </div>

      {/* Date Navigator */}
      <div className="fs-card mb-6">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(1)} disabled={dateIdx >= dates.length - 1}
            className="p-2 rounded-lg transition-colors"
            style={{ background: 'var(--color-bg-elevated)', color: dateIdx >= dates.length - 1 ? 'var(--color-text-muted)' : 'var(--color-text-primary)' }}>
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <div className="flex items-center gap-2 justify-center">
              <Calendar size={16} style={{ color: 'var(--color-primary)' }} />
              <span className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'No data'}
              </span>
            </div>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Day {dates.length - dateIdx} of {dates.length}
            </span>
          </div>
          <button onClick={() => navigate(-1)} disabled={dateIdx <= 0}
            className="p-2 rounded-lg transition-colors"
            style={{ background: 'var(--color-bg-elevated)', color: dateIdx <= 0 ? 'var(--color-text-muted)' : 'var(--color-text-primary)' }}>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Day Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Signals', value: dayStats.total, icon: Target, color: 'var(--color-info)' },
          { label: 'Wins', value: dayStats.wins, icon: TrendingUp, color: 'var(--color-success)' },
          { label: 'Losses', value: dayStats.losses, icon: BarChart3, color: 'var(--color-danger)' },
          { label: 'Hit Rate', value: `${dayStats.hitRate}%`, color: parseInt(dayStats.hitRate) >= 50 ? 'var(--color-success)' : 'var(--color-warning)' },
          { label: 'Avg EV', value: `${dayStats.avgEv}%`, color: parseFloat(dayStats.avgEv) > 0 ? 'var(--color-success)' : 'var(--color-danger)' },
        ].map(k => (
          <div key={k.label} className="fs-kpi-card">
            <div className="fs-kpi-header"><span className="fs-kpi-label">{k.label}</span></div>
            <div className="fs-kpi-value" style={{ color: k.color, fontSize: '1.5rem' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Signals Table */}
      <div className="fs-card">
        <div className="fs-card-header">
          <span className="fs-card-title">Day's Signals</span>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{dayBets.length} signals generated</span>
        </div>
        {dayBets.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-muted)' }}>No signals for this date.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="fs-table">
              <thead>
                <tr>
                  <th>Match</th><th>League</th><th>Odds</th><th>Model %</th><th>EV</th><th>Result</th>
                </tr>
              </thead>
              <tbody>
                {dayBets.map((b, i) => {
                  const ev = b.ev ? (b.ev * 100).toFixed(1) : '—';
                  const prob = b.probability ? (b.probability * 100).toFixed(0) : b.model_prob ? (b.model_prob * 100).toFixed(0) : '—';
                  return (
                    <tr key={i}>
                      <td style={{ color: 'var(--color-text-primary)' }}>{b.match || b.teams || '—'}</td>
                      <td>{b.league || '—'}</td>
                      <td>{b.odds?.toFixed(2) || '—'}</td>
                      <td>{prob}%</td>
                      <td style={{ color: parseFloat(ev) > 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                        {parseFloat(ev) > 0 ? '+' : ''}{ev}%
                      </td>
                      <td>
                        {b.result ? <span className={`fs-status ${b.result === 'Win' ? 'won' : 'lost'}`}>{b.result}</span> : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
