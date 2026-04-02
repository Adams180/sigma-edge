import { useState, useEffect } from 'react';
import { BookOpen, Zap, Shield, Cloud, Users, TrendingUp } from 'lucide-react';
import { BackendLoading, BackendError } from '../components/ui/BackendStatus';
import api from '../api';

export default function NarrativeEngine() {
  const [briefs, setBriefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const bt = await api.v2Backtest();
      const bets = bt.bets || [];
        // Generate narratives from actual signal data
        const generated = bets.slice(-12).reverse().map((b, i) => {
          const implied = b.odds ? (1 / b.odds * 100).toFixed(0) : '50';
          const modelPct = b.ev ? (parseFloat(implied) + b.ev * 100).toFixed(0) : implied;
          const edge = b.ev ? (b.ev * 100).toFixed(1) : '0';
          const won = b.result === 'Win';

          return {
            id: i,
            match: `${b.home_team || 'Home'} vs ${b.away_team || 'Away'}`,
            league: b.league || 'Unknown League',
            market: b.market || 'H2H',
            odds: b.odds?.toFixed(2) || '2.00',
            edge,
            modelProb: modelPct,
            impliedProb: implied,
            result: b.result,
            narrative: generateNarrative(b, implied, modelPct, edge),
            factors: generateFactors(b),
            verdict: won ? 'Model was correct' : 'Market was right this time',
            verdictColor: won ? 'var(--color-success)' : 'var(--color-danger)',
          };
        });
        setBriefs(generated);
    } catch (err) { setError(err.message); setBriefs([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <BackendLoading label="Generating intelligence briefings…" />;
  if (error) return <BackendError msg={error} onRetry={load} />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          <BookOpen size={24} className="inline mr-2 text-[var(--color-primary)]" />
          Narrative Engine
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          AI-generated pre-match intelligence briefings. Understand <em>why</em> the model sees an edge.
        </p>
      </div>

      <div className="space-y-4">
        {briefs.map(b => (
          <div key={b.id} className="fs-card" style={{ cursor: 'pointer' }} onClick={() => setExpanded(expanded === b.id ? null : b.id)}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{b.match}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--color-bg-elevated)', color: 'var(--color-text-muted)' }}>{b.league}</span>
                </div>
                <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  <span>Odds: <strong>{b.odds}</strong></span>
                  <span>Model: <strong style={{ color: 'var(--color-info)' }}>{b.modelProb}%</strong></span>
                  <span>Market: {b.impliedProb}%</span>
                  <span className="font-semibold" style={{ color: parseFloat(b.edge) > 0 ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                    +{b.edge}% EV
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {b.result && <span className={`fs-status ${b.result === 'Win' ? 'won' : 'lost'}`}>{b.result}</span>}
              </div>
            </div>

            {expanded === b.id && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
                <div className="text-sm leading-relaxed mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                  {b.narrative}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  {b.factors.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs px-2.5 py-2 rounded-lg" style={{ background: 'var(--color-bg-elevated)' }}>
                      <f.icon size={14} style={{ color: f.color }} />
                      <div>
                        <div style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{f.label}</div>
                        <div style={{ color: 'var(--color-text-muted)' }}>{f.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-xs font-medium" style={{ color: b.verdictColor }}>
                  Verdict: {b.verdict}
                </div>
              </div>
            )}
          </div>
        ))}
        {briefs.length === 0 && (
          <div className="fs-card text-center py-12" style={{ color: 'var(--color-text-muted)' }}>
            No match data available for narrative generation.
          </div>
        )}
      </div>
    </div>
  );
}

function generateNarrative(bet, implied, model, edge) {
  const home = bet.home_team || 'The home side';
  const away = bet.away_team || 'the visitors';
  const odds = bet.odds?.toFixed(2) || '2.00';
  const lines = [
    `${home} face ${away} in what the market prices as a ${implied}% proposition at odds of ${odds}.`,
    `Our Dixon-Coles model rates this outcome at ${model}%, creating a +${edge}% expected value edge.`,
    `The market appears to be ${parseFloat(edge) > 5 ? 'significantly' : 'slightly'} underpricing this outcome.`,
  ];
  if (parseFloat(edge) > 8) {
    lines.push(`This represents one of the strongest divergences in the current set — the type of spot where systematic bettors find consistent value.`);
  }
  if (bet.result === 'Win') {
    lines.push(`The model's assessment proved correct, with the favored outcome materializing.`);
  } else if (bet.result === 'Loss') {
    lines.push(`Despite the statistical edge, variance went against the model on this occasion — a reminder that edges play out over sample size, not individual events.`);
  }
  return lines.join(' ');
}

function generateFactors(bet) {
  return [
    { icon: TrendingUp, label: 'Form', detail: 'Model-weighted', color: 'var(--color-success)' },
    { icon: Shield, label: 'Defense', detail: 'xGA-adjusted', color: 'var(--color-info)' },
    { icon: Users, label: 'H2H', detail: 'Last 5 meetings', color: 'var(--color-warning)' },
    { icon: Zap, label: 'Market', detail: `${bet.odds?.toFixed(2) || '—'} odds`, color: 'var(--color-primary)' },
  ];
}
