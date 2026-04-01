import { useAuth } from '../contexts/AuthContext';

/**
 * Returns tier helpers for the current user.
 * isPro  — true if pro or elite
 * isElite — true only if elite
 * tier — 'free' | 'pro' | 'elite'
 */
export function useTier() {
  const { profile } = useAuth();
  const tier = profile?.tier ?? 'free';
  return {
    tier,
    isFree: tier === 'free',
    isPro: tier === 'pro' || tier === 'elite',
    isElite: tier === 'elite',
  };
}
