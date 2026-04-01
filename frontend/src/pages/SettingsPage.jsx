import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PageHeader } from '../components/ui';
import { Settings, User, CreditCard, Bell, Shield, Check, Zap, Crown } from 'lucide-react';

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

export default function SettingsPage() {
  const { user } = useAuth();
  const [currentTier] = useState('free');
  const [notifications, setNotifications] = useState({
    signals: true,
    daily: false,
    weekly: true,
  });

  return (
    <div>
      <PageHeader title="Settings" subtitle="Account, subscription, and notification preferences">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-card border border-border-subtle">
          <Settings size={14} className="text-text-muted" />
          <span className="text-xs font-medium text-text-secondary">Account</span>
        </div>
      </PageHeader>

      {/* Account Info */}
      <div className="glass-card p-6 mb-6">
        <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <User size={16} className="text-primary" /> Account
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">Email</div>
            <div className="text-sm text-text-primary font-medium">{user?.email || 'Not set'}</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">Member Since</div>
            <div className="text-sm text-text-primary font-medium">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">Current Plan</div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              <Zap size={11} /> {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}
            </span>
          </div>
          <div>
            <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">Auth Provider</div>
            <div className="text-sm text-text-primary font-medium">
              {user?.app_metadata?.provider === 'google' ? 'Google' : 'Email/Password'}
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="glass-card p-6 mb-6">
        <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Bell size={16} className="text-primary" /> Notifications
        </h3>
        <div className="space-y-3">
          {[
            { key: 'signals', label: 'Signal Alerts', desc: 'Get notified when new value bets are detected' },
            { key: 'daily', label: 'Daily Summary', desc: 'Morning briefing with upcoming fixtures and signals' },
            { key: 'weekly', label: 'Weekly Report', desc: 'Weekly P&L summary and model performance' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-bg-hover">
              <div>
                <div className="text-sm font-semibold text-text-primary">{label}</div>
                <div className="text-xs text-text-muted">{desc}</div>
              </div>
              <button
                onClick={() => setNotifications(n => ({ ...n, [key]: !n[key] }))}
                className={`w-10 h-6 rounded-full transition-colors relative ${
                  notifications[key] ? 'bg-primary' : 'bg-bg-card border border-border-subtle'
                }`}
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
        <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <CreditCard size={16} className="text-primary" /> Subscription Plans
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TIERS.map((tier) => {
            const Icon = tier.icon;
            const isCurrent = tier.id === currentTier;
            return (
              <div key={tier.id} className={`glass-card p-6 relative ${
                tier.popular ? 'border-primary/30 shadow-[0_0_30px_rgba(0,212,170,0.06)]' : ''
              }`}>
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-white text-[10px] font-bold uppercase tracking-wider">
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
                  <span className="text-2xl font-black text-text-primary">{tier.price}</span>
                  <span className="text-sm text-text-muted">{tier.period}</span>
                </div>

                <ul className="space-y-2 mb-6">
                  {tier.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs text-text-secondary">
                      <Check size={14} className={`shrink-0 mt-0.5 ${tier.color}`} />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  disabled={isCurrent}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isCurrent
                      ? 'bg-bg-hover text-text-muted cursor-default'
                      : tier.popular
                        ? 'bg-gradient-to-r from-primary to-accent text-white hover:opacity-90'
                        : `${tier.bg} ${tier.color} border ${tier.border} hover:opacity-80`
                  }`}
                >
                  {isCurrent ? 'Current Plan' : `Upgrade to ${tier.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info */}
      <div className="glass-card p-4 flex items-start gap-3 border-l-2 border-l-primary/50">
        <Shield size={16} className="text-primary mt-0.5 shrink-0" />
        <div className="text-xs text-text-secondary leading-relaxed">
          <span className="font-semibold text-text-primary">Stripe integration coming soon.</span> Payment processing
          will be powered by Stripe for secure, PCI-compliant billing. All subscription data is stored in Supabase with row-level security.
        </div>
      </div>
    </div>
  );
}
