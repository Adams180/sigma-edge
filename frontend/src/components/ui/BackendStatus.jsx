import { RefreshCw, WifiOff, Database } from 'lucide-react';

/**
 * Show while waiting for backend response.
 * Renders an informative spinner instead of just a spinning wheel.
 */
export function BackendLoading({ label = 'Loading data…' }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="relative">
        <div className="w-12 h-12 border-2 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" />
        <Database size={16} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ color: 'var(--color-primary)' }} />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>{label}</p>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Backend may be waking up — this can take up to 30s on first load
        </p>
      </div>
    </div>
  );
}

/**
 * Show when the backend request fails or times out.
 */
export function BackendError({ msg, onRetry }) {
  const isTimeout = msg?.includes('timed out');
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
        <WifiOff size={20} style={{ color: 'var(--color-danger)' }} />
      </div>
      <div className="text-center max-w-sm">
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {isTimeout ? 'Backend is starting up' : 'Could not load data'}
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          {isTimeout
            ? 'The server was idle and is warming up. Click retry in a moment.'
            : msg}
        </p>
      </div>
      {onRetry && (
        <button onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'var(--color-primary)', color: '#fff' }}>
          <RefreshCw size={14} /> Retry
        </button>
      )}
    </div>
  );
}

/** Small inline badge for pages that show simulated / demo data */
export function DemoBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
      DEMO DATA
    </span>
  );
}
