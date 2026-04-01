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
        <div className="glass-card p-8 text-center max-w-sm mx-auto border-primary/20 shadow-[0_0_40px_rgba(0,212,170,0.08)]">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
            <Lock size={24} className="text-primary" />
          </div>

          <h3 className="text-lg font-bold text-text-primary mb-2">
            Pro Feature
          </h3>
          <p className="text-sm text-text-muted mb-6 leading-relaxed">
            <span className="text-text-secondary font-medium">{feature}</span> is available on the Pro plan.
            Upgrade to unlock live signals, all leagues, and real-time alerts.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => navigate('/settings')}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Zap size={16} />
              Upgrade to Pro — $19/mo
              <ArrowRight size={14} />
            </button>
            <p className="text-xs text-text-muted">Cancel anytime · Instant access</p>
          </div>
        </div>
      </div>
    </div>
  );
}
