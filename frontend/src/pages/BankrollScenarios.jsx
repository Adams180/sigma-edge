import { useState, useEffect, useMemo } from 'react';
import { Sliders, DollarSign, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import api from '../api';

export default function BankrollScenarios() {
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startingBank, setStartingBank] = useState(1000);
  const [kellyFraction, setKellyFraction] = useState(0.02);

  useEffect(() => {
    (async () => {
      try {
        const bt = await api.v2Backtest();
        setBets(bt.bets || []);
      } catch { setBets([]); }
      setLoading(false);
    })();
  }, []);

  const simulation = useMemo(() => {
    let bank = startingBank;
    let peak = startingBank;
    let maxDD = 0;
    let wins = 0, losses = 0;
    const curve = [{ x: 0, y: startingBank }];

    bets.forEach((b, i) => {
      const stake = Math.max(1, Math.round(bank * kellyFraction));
      const won = b.result === 'Win';
      const pnl = won ? stake * ((b.odds || 2.0) - 1) : -stake;
      bank = Math.max(0, bank + pnl);
      if (won) wins++; else losses++;
      if (bank > peak) peak = bank;
      const dd = peak > 0 ? ((peak - bank) / peak) * 100 : 0;
      if (dd > maxDD) maxDD = dd;
      curve.push({ x: i + 1, y: Math.round(bank) });
    });

    return {
      finalBank: Math.round(bank),
      roi: (((bank - startingBank) / startingBank) * 100).toFixed(1),
      pnl: Math.round(bank - startingBank),
      wins, losses,
      hitRate: bets.length ? ((wins / bets.length) * 100).toFixed(1) : '0',
      maxDrawdown: maxDD.toFixed(1),
      sharpe: bets.length > 1 ? calcSharpe(bets, startingBank, kellyFraction) : '—',
      curve,
    };
  }, [bets, startingBank, kellyFraction]);

  // SVG sparkline
  const maxY = Math.max(...simulation.curve.map(p => p.y), startingBank * 1.1);
  const minY = Math.min(...simulation.curve.map(p => p.y), 0);
  const svgW = 800, svgH = 200;
  const points = simulation.curve.map(p => {
    const x = (p.x / Math.max(simulation.curve.length - 1, 1)) * svgW;
    const y = svgH - ((p.y - minY) / (maxY - minY || 1)) * svgH;
    return `${x},${y}`;
  }).join(' ');

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          <Sliders size={24} className="inline mr-2 text-[var(--color-primary)]" />
          Bankroll Scenarios
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          "What if?" — Re-run the entire backtest with different starting capital and stake sizing.
        </p>
      </div>

      {/* Controls */}
      <div className="fs-card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              Starting Bankroll: <strong style={{ color: 'var(--color-text-primary)' }}>${startingBank.toLocaleString()}</strong>
            </label>
            <input type="range" min={100} max={50000} step={100} value={startingBank}
              onChange={e => setStartingBank(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--color-primary)' }} />
            <div className="flex justify-between text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
              <span>$100</span><span>$10k</span><span>$25k</span><span>$50k</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              Stake Size (Kelly Fraction): <strong style={{ color: 'var(--color-text-primary)' }}>{(kellyFraction * 100).toFixed(1)}%</strong>
            </label>
            <input type="range" min={0.005} max={0.1} step={0.005} value={kellyFraction}
              onChange={e => setKellyFraction(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--color-primary)' }} />
            <div className="flex justify-between text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
              <span>0.5% (conservative)</span><span>5% (moderate)</span><span>10% (aggressive)</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Results */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Final Bankroll', value: `$${simulation.finalBank.toLocaleString()}`, color: 'var(--color-text-primary)', icon: DollarSign },
          { label: 'Net P&L', value: `${simulation.pnl >= 0 ? '+' : ''}$${simulation.pnl.toLocaleString()}`, color: simulation.pnl >= 0 ? 'var(--color-success)' : 'var(--color-danger)', icon: TrendingUp },
          { label: 'ROI', value: `${simulation.roi}%`, color: parseFloat(simulation.roi) >= 0 ? 'var(--color-success)' : 'var(--color-danger)', icon: BarChart3 },
          { label: 'Hit Rate', value: `${simulation.hitRate}%`, color: 'var(--color-info)', icon: TrendingUp },
          { label: 'Max Drawdown', value: `${simulation.maxDrawdown}%`, color: 'var(--color-warning)', icon: TrendingDown },
        ].map(k => (
          <div key={k.label} className="fs-kpi-card">
            <div className="fs-kpi-header">
              <span className="fs-kpi-label">{k.label}</span>
            </div>
            <div className="fs-kpi-value" style={{ color: k.color, fontSize: '1.4rem' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Equity Curve */}
      <div className="fs-card">
        <div className="fs-card-header">
          <span className="fs-card-title">Equity Curve</span>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{bets.length} bets simulated</span>
        </div>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', height: 200 }}>
          {/* Start line */}
          <line x1={0} y1={svgH - ((startingBank - minY) / (maxY - minY || 1)) * svgH}
            x2={svgW} y2={svgH - ((startingBank - minY) / (maxY - minY || 1)) * svgH}
            stroke="var(--color-border-subtle)" strokeDasharray="4 4" />
          <polyline points={points} fill="none" stroke="var(--color-primary)" strokeWidth="2" />
        </svg>
        <div className="flex justify-between text-[10px] mt-2" style={{ color: 'var(--color-text-muted)' }}>
          <span>Bet #1</span>
          <span style={{ color: 'var(--color-text-secondary)' }}>— Starting: ${startingBank.toLocaleString()}</span>
          <span>Bet #{bets.length}</span>
        </div>
      </div>
    </div>
  );
}

function calcSharpe(bets, startBank, kelly) {
  let bank = startBank;
  const returns = [];
  bets.forEach(b => {
    const stake = Math.max(1, Math.round(bank * kelly));
    const won = b.result === 'Win';
    const pnl = won ? stake * ((b.odds || 2.0) - 1) : -stake;
    const ret = pnl / bank;
    returns.push(ret);
    bank = Math.max(0, bank + pnl);
  });
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
  const std = Math.sqrt(variance);
  return std > 0 ? (mean / std * Math.sqrt(returns.length)).toFixed(2) : '—';
}
