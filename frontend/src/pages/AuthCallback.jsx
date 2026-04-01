import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code');

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        navigate(error ? '/login' : '/', { replace: true });
      });
    } else {
      // Implicit flow — session already in hash, just wait for onAuthStateChange
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
          subscription.unsubscribe();
          navigate('/', { replace: true });
        }
      });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-text-muted">Completing sign in...</p>
      </div>
    </div>
  );
}
