import { useState } from 'react';
import { useTeamLogos } from '../../contexts/TeamLogosContext';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
export { default as ProGate } from './ProGate';
export { BackendLoading, BackendError, DemoBadge } from './BackendStatus';

export function MetricCard({ label, value, change, changeLabel, icon: Icon, variant = 'default' }) {
  const isPositive = change > 0;
  const isNeutral = change === 0 || change === undefined;

  return (
    <div className="stripe-card p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">{label}</span>
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-[var(--color-bg-elevated)] flex items-center justify-center">
            <Icon size={16} className="text-[var(--color-text-secondary)]" />
          </div>
        )}
      </div>
      <div className="text-2xl font-semibold text-[var(--color-text-primary)] tracking-tight">{value}</div>
      {change !== undefined && (
        <div className="flex items-center gap-1.5 mt-2">
          <div
            className={`flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-md ${
              isNeutral
                ? 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]'
                : isPositive
                ? 'bg-[var(--color-success-dim)] text-[var(--color-success)]'
                : 'bg-[var(--color-danger-dim)] text-[var(--color-danger)]'
            }`}
          >
            {isNeutral ? (
              <Minus size={12} />
            ) : isPositive ? (
              <ArrowUpRight size={12} />
            ) : (
              <ArrowDownRight size={12} />
            )}
            {Math.abs(change).toFixed(1)}%
          </div>
          {changeLabel && <span className="text-xs text-[var(--color-text-muted)]">{changeLabel}</span>}
        </div>
      )}
    </div>
  );
}

export function StatusBadge({ status, children }) {
  const styles = {
    live: 'bg-[var(--color-danger-dim)] text-[var(--color-danger)]',
    upcoming: 'bg-[var(--color-info-dim)] text-[var(--color-info)]',
    finished: 'bg-[var(--color-success-dim)] text-[var(--color-success)]',
    signal: 'bg-[var(--color-primary-dim)] text-[var(--color-primary)]',
    warning: 'bg-[var(--color-warning-dim)] text-[var(--color-warning)]',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${styles[status] || styles.upcoming}`}>
      {(status === 'live' || status === 'signal') && <span className={`glow-dot ${status === 'live' ? 'glow-dot-danger' : ''}`} style={{ width: 6, height: 6 }} />}
      {children}
    </span>
  );
}

export function EVBadge({ ev, isHighVariance }) {
  const isPositive = ev > 0;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
        isHighVariance
          ? 'bg-[var(--color-warning-dim)] text-[var(--color-warning)]'
          : isPositive
          ? 'bg-[var(--color-success-dim)] text-[var(--color-success)]'
          : 'bg-[var(--color-danger-dim)] text-[var(--color-danger)]'
      }`}
    >
      {isPositive ? '+' : ''}{(ev * 100).toFixed(1)}% EV
    </span>
  );
}

export function LeagueBadge({ league }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[var(--color-primary-dim)] text-[var(--color-primary)] text-[11px] font-bold uppercase tracking-wider">
      {league}
    </span>
  );
}

export function ProbabilityBar({ home, draw, away }) {
  return (
    <div className="space-y-2">
      <div className="flex h-2 rounded-full overflow-hidden bg-[var(--color-bg-elevated)]">
        <div className="bg-[var(--color-primary)] rounded-l-full transition-all duration-500" style={{ width: `${home * 100}%` }} />
        <div className="bg-[var(--color-warning)] transition-all duration-500" style={{ width: `${draw * 100}%` }} />
        <div className="bg-[var(--color-danger)] rounded-r-full transition-all duration-500" style={{ width: `${away * 100}%` }} />
      </div>
      <div className="flex justify-between text-[11px] font-medium">
        <span className="text-[var(--color-primary)]">H {(home * 100).toFixed(0)}%</span>
        <span className="text-[var(--color-warning)]">D {(draw * 100).toFixed(0)}%</span>
        <span className="text-[var(--color-danger)]">A {(away * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6">
      <div className="w-14 h-14 rounded-xl bg-[var(--color-bg-elevated)] flex items-center justify-center mb-4">
        <Icon size={24} className="text-[var(--color-text-muted)]" />
      </div>
      <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">{title}</h3>
      <p className="text-sm text-[var(--color-text-muted)] text-center max-w-sm">{description}</p>
    </div>
  );
}

export function LoadingSpinner({ label = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-2 border-[var(--color-border-default)] border-t-[var(--color-primary)] animate-spin mb-3" />
      <span className="text-sm text-[var(--color-text-muted)]">{label}</span>
    </div>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)] tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}

// ── TeamLogo ──────────────────────────────────────────────────────────────
// Shows team crest from logo_url; falls back to a coloured circle with initials.
const LOGO_PALETTE = [
  '#635BFF','#0EBFE9','#F5A623','#30B130','#DF1B41',
  '#9B59B6','#E67E22','#1ABC9C','#3498DB','#E74C3C',
];
function logoColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return LOGO_PALETTE[h % LOGO_PALETTE.length];
}
function initials(name = '') {
  return name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}

export function TeamLogo({ name = '', logo, size = 28 }) {
  const [failed, setFailed] = useState(false);
  const logoMap = useTeamLogos();
  // Prefer explicit prop, then context lookup by name, then fallback
  const resolvedLogo = logo || logoMap[name] || null;
  const showFallback = !resolvedLogo || failed;

  if (showFallback) {
    return (
      <div
        style={{
          width: size, height: size, minWidth: size,
          background: logoColor(name),
          borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: size * 0.36,
          fontWeight: 700,
          color: '#fff',
          userSelect: 'none',
        }}
        title={name}
      >
        {initials(name)}
      </div>
    );
  }
  return (
    <img
      src={resolvedLogo}
      alt={name}
      title={name}
      width={size}
      height={size}
      style={{ width: size, height: size, minWidth: size, objectFit: 'contain', borderRadius: 4 }}
      onError={() => setFailed(true)}
    />
  );
}

