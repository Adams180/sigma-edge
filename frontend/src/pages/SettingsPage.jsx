import { useState } from 'react';import { useAuth } from '../contexts/AuthContext';
import { PageHeader } from '../components/ui';
import { useTheme } from '../contexts/ThemeContext';
import { Settings, User, CreditCard, Bell, Shield, Check, Zap, Crown, Sun, Moon } from 'lucide-react';

const TIERS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    icon: User,
    color: 'text-text-secondary',
    bg: 'bg-bg-card',
    border: 'border-border-subtle',
    features: [
      'Signal history (24h delay)',
      'Model accuracy stats',
      '1 league (Premier League)',
      'Basic performance dashboard',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$19',
    period: '/month',
    icon: Zap,
    color: 'text-primary',
    bg: 'bg-primary/5',
    border: 'border-primary/30',
    popular: true,
    features: [
      'Live signals (real-time)',
      'All 3 leagues',
      'Push notifications',
      'Kelly staking calculator',
      'Referee analytics',
      'Lineup impact alerts',
      'Signal export (CSV)',
    ],
  },
  {
    id: 'elite',
    name: 'Elite',
    price: '$49',
    period: '/month',
    icon: Crown,
    color: 'text-amber-400',
    bg: 'bg-amber-500/5',
    border: 'border-amber-500/30',
    features: [
      'Everything in Pro',
      'Custom EV thresholds',
      'API access',
      'Priority support',
      'Early access to new features',
      'Bankroll management tools',
    ],
  },
];

const API_URL = import.meta.env.VITE_API_URL || '';

export default function SettingsPage() {
  const { user, profile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const currentTier = profile?.tier ?? 'free';
  const [notifications, setNotifications] = useState({
    signals: true,
    daily: false,
    weekly: true,
  });
  const [checkoutLoading, setCheckoutLoading] = useState(null);

  async function handleUpgrade(tierId) {
    if (!user) return;
    setCheckoutLoading(tierId);
    try {
      const res = await fetch(`${API_URL}/api/billing/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: tierId, user_id: user.id, email: user.email }),
      });
      if (!res.ok) throw new Error('Failed to create checkout session');
      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Could not start checkout. Please try again.');
    } finally {
      setCheckoutLoading(null);
    }
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Account, subscription, and notification preferences">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border-subtle)' }}>
          <Settings size={14} style={{ color: 'var(--color-text-muted)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Account</span>
        </div>
      </PageHeader>

      {/* Account Info */}
      <div className="stripe-card p-6 mb-6">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
          <User size={16} style={{ color: 'var(--color-primary)' }} /> Account
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Email</div>
            <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{user?.email || 'Not set'}</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Member Since</div>
            <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Current Plan</div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(99,91,255,0.1)', color: 'var(--color-primary)', border: '1px solid rgba(99,91,255,0.2)' }}>
              <Zap size={11} /> {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}
            </span>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>Auth Provider</div>
            <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {user?.app_metadata?.provider === 'google' ? 'Google' : 'Email/Password'}
            </div>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="stripe-card p-6 mb-6">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
          {theme === 'dark' ? <Moon size={16} style={{ color: 'var(--color-primary)' }} /> : <Sun size={16} style={{ color: 'var(--color-primary)' }} />}
          Appearance
        </h3>
        <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--color-bg-hover)' }}>
          <div>
            <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Theme</div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {theme === 'dark' ? 'Dark mode is active' : 'Light mode is active'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => theme !== 'light' && toggleTheme()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: theme === 'light' ? 'var(--color-primary)' : 'transparent',
                color: theme === 'light' ? '#fff' : 'var(--color-text-secondary)',
                border: theme === 'light' ? 'none' : '1px solid var(--color-border-subtle)',
              }}
            >
              <Sun size={13} /> Light
            </button>
            <button
              onClick={() => theme !== 'dark' && toggleTheme()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: theme === 'dark' ? 'var(--color-primary)' : 'transparent',
                color: theme === 'dark' ? '#fff' : 'var(--color-text-secondary)',
                border: theme === 'dark' ? 'none' : '1px solid var(--color-border-subtle)',
              }}
            >
              <Moon size={13} /> Dark
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="stripe-card p-6 mb-6">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
          <Bell size={16} style={{ color: 'var(--color-primary)' }} /> Notifications
        </h3>
        <div className="space-y-3">
          {[
            { key: 'signals', label: 'Signal Alerts', desc: 'Get notified when new value bets are detected' },
            { key: 'daily', label: 'Daily Summary', desc: 'Morning briefing with upcoming fixtures and signals' },
            { key: 'weekly', label: 'Weekly Report', desc: 'Weekly P&L summary and model performance' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--color-bg-hover)' }}>
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{label}</div>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{desc}</div>
              </div>
              <button
                onClick={() => setNotifications(n => ({ ...n, [key]: !n[key] }))}
                className="w-10 h-6 rounded-full transition-colors relative"
                style={{
                  background: notifications[key] ? 'var(--color-primary)' : 'var(--color-bg-card)',
                  border: notifications[key] ? 'none' : '1px solid var(--color-border-subtle)',
                }}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  notifications[key] ? 'translate-x-5' : 'translate-x-1'
                }`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Subscription Tiers */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
          <CreditCard size={16} style={{ color: 'var(--color-primary)' }} /> Subscription Plans
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TIERS.map((tier) => {
            const Icon = tier.icon;
            const isCurrent = tier.id === currentTier;
            return (
              <div key={tier.id} className={`stripe-card p-6 relative ${
                tier.popular ? 'ring-1 ring-primary/30' : ''
              }`} style={tier.popular ? { boxShadow: '0 0 30px rgba(99,91,255,0.08)' } : {}}>
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: 'var(--color-primary)', color: '#fff' }}>
                    Most Popular
                  </div>
                )}

                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-8 h-8 rounded-lg ${tier.bg} border ${tier.border} flex items-center justify-center`}>
                    <Icon size={16} className={tier.color} />
                  </div>
                  <span className={`text-lg font-bold ${tier.color}`}>{tier.name}</span>
                </div>

                <div className="mb-4">
                  <span className="text-2xl font-black" style={{ color: 'var(--color-text-primary)' }}>{tier.price}</span>
                  <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{tier.period}</span>
                </div>

                <ul className="space-y-2 mb-6">
                  {tier.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      <Check size={14} className={`shrink-0 mt-0.5 ${tier.color}`} />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  disabled={isCurrent || checkoutLoading === tier.id}
                  onClick={() => !isCurrent && handleUpgrade(tier.id)}
                  className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    isCurrent
                      ? 'cursor-default'
                      : tier.popular
                        ? 'btn-primary'
                        : `${tier.bg} ${tier.color} border ${tier.border} hover:opacity-80`
                  }`}
                  style={isCurrent ? { background: 'var(--color-bg-hover)', color: 'var(--color-text-muted)' } : tier.popular ? { background: 'var(--color-primary)', color: '#fff' } : {}}
                >
                  {isCurrent ? 'Current Plan' : checkoutLoading === tier.id ? 'Loading…' : `Upgrade to ${tier.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info */}
      <div className="stripe-card p-4 flex items-start gap-3" style={{ borderLeft: '2px solid rgba(99,91,255,0.5)' }}>
        <Shield size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--color-primary)' }} />
        <div className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Stripe integration coming soon.</span> Payment processing
          will be powered by Stripe for secure, PCI-compliant billing. All subscription data is stored in Supabase with row-level security.
        </div>
      </div>
    </div>
  );
}
