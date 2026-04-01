import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
export { default as ProGate } from './ProGate';

export function MetricCard({ label, value, change, changeLabel, icon: Icon, variant = 'default' }) {
  const isPositive = change > 0;
  const isNeutral = change === 0 || change === undefined;

  const variantStyles = {
    default: 'from-bg-card to-bg-surface',
    primary: 'from-primary-dim to-bg-card',
    accent: 'from-accent-dim to-bg-card',
    danger: 'from-danger-dim to-bg-card',
  };

  return (
    <div className={`glass-card p-5 bg-gradient-to-br ${variantStyles[variant]}`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">{label}</span>
        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-bg-hover flex items-center justify-center">
            <Icon size={18} className="text-text-secondary" />
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-text-primary tracking-tight">{value}</div>
      {change !== undefined && (
        <div className="flex items-center gap-1.5 mt-2">
          <div
            className={`flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md ${
              isNeutral
                ? 'bg-bg-hover text-text-muted'
                : isPositive
                ? 'bg-success-dim text-success'
                : 'bg-danger-dim text-danger'
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
          {changeLabel && <span className="text-xs text-text-muted">{changeLabel}</span>}
        </div>
      )}
    </div>
  );
}

export function StatusBadge({ status, children }) {
  const styles = {
    live: 'bg-danger-dim text-danger',
    upcoming: 'bg-info-dim text-info',
    finished: 'bg-success-dim text-success',
    signal: 'bg-primary-dim text-primary',
    warning: 'bg-warning-dim text-warning',
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
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
        isHighVariance
          ? 'bg-warning-dim text-warning'
          : isPositive
          ? 'bg-primary-dim text-primary'
          : 'bg-danger-dim text-danger'
      }`}
    >
      {isPositive ? '+' : ''}{(ev * 100).toFixed(1)}% EV
    </span>
  );
}

export function LeagueBadge({ league }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-accent-dim text-accent-light text-[11px] font-bold uppercase tracking-wider">
      {league}
    </span>
  );
}

export function ProbabilityBar({ home, draw, away }) {
  return (
    <div className="space-y-2">
      <div className="flex h-2 rounded-full overflow-hidden bg-bg-hover">
        <div className="bg-primary rounded-l-full transition-all duration-500" style={{ width: `${home * 100}%` }} />
        <div className="bg-warning transition-all duration-500" style={{ width: `${draw * 100}%` }} />
        <div className="bg-danger rounded-r-full transition-all duration-500" style={{ width: `${away * 100}%` }} />
      </div>
      <div className="flex justify-between text-[11px] font-medium">
        <span className="text-primary">H {(home * 100).toFixed(0)}%</span>
        <span className="text-warning">D {(draw * 100).toFixed(0)}%</span>
        <span className="text-danger">A {(away * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6">
      <div className="w-16 h-16 rounded-2xl bg-bg-hover flex items-center justify-center mb-5">
        <Icon size={28} className="text-text-muted" />
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-sm text-text-muted text-center max-w-sm">{description}</p>
    </div>
  );
}

export function LoadingSpinner({ label = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-10 h-10 rounded-full border-2 border-border-default border-t-primary animate-spin mb-4" />
      <span className="text-sm text-text-muted">{label}</span>
    </div>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-text-muted mt-1">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}
