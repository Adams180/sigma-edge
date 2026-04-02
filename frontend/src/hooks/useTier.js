import { useAuth } from '../contexts/AuthContext';

const SUPERADMIN_EMAILS = [
  'adamou.ben033@gmail.com',
];

/**
 * Returns tier helpers for the current user.
 * isPro  — true if pro or elite (or superadmin)
 * isElite — true only if elite (or superadmin)
 * isSuperAdmin — bypasses all billing gates
 */
export function useTier() {
  const { profile, user } = useAuth();

  const isSuperAdmin = SUPERADMIN_EMAILS.includes(
    user?.email?.toLowerCase() ?? ''
  );

  if (isSuperAdmin) {
    return {
      tier: 'elite',
      isFree: false,
      isPro: true,
      isElite: true,
      isSuperAdmin: true,
    };
  }

  const tier = profile?.tier ?? 'free';
  return {
    tier,
    isFree: tier === 'free',
    isPro: tier === 'pro' || tier === 'elite',
    isElite: tier === 'elite',
    isSuperAdmin: false,
  };
}
