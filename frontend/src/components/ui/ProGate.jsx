import { useAuth } from '../../contexts/AuthContext';
import { Lock, Zap, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Wraps content that requires a paid tier.
 * Usage: <ProGate feature="Live Signals">...children...</ProGate>
 * allowedTiers defaults to ['pro', 'elite']
 */
export default function ProGate({ children, feature = 'this feature', allowedTiers = ['pro', 'elite'], blur = true }) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const tier = profile?.tier ?? 'free';
  const hasAccess = allowedTiers.includes(tier);

  if (hasAccess) return children;

  return (
    <div className="relative">
      {/* Blurred preview */}
      {blur && (
        <div className="select-none pointer-events-none opacity-30 blur-sm">
          {children}
        </div>
      )}

      {/* Paywall overlay */}
      <div className={`${blur ? 'absolute inset-0' : ''} flex items-center justify-center`}>
        <div className="stripe-card p-8 text-center max-w-sm mx-auto">
          <div className="w-12 h-12 rounded-xl bg-[var(--color-primary-dim)] flex items-center justify-center mx-auto mb-4">
            <Lock size={22} className="text-[var(--color-primary)]" />
          </div>

          <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-2">
            Pro Feature
          </h3>
          <p className="text-sm text-[var(--color-text-muted)] mb-6 leading-relaxed">
            <span className="text-[var(--color-text-secondary)] font-medium">{feature}</span> is available on the Pro plan.
            Upgrade to unlock live signals, all leagues, and real-time alerts.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => navigate('/settings')}
              className="w-full btn-primary flex items-center justify-center gap-2 py-2.5"
            >
              <Zap size={16} />
              Upgrade to Pro — $19/mo
              <ArrowRight size={14} />
            </button>
            <p className="text-xs text-[var(--color-text-muted)]">Cancel anytime · Instant access</p>
          </div>
        </div>
      </div>
    </div>
  );
}
