import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { TrendingUp, Mail, Lock, Eye, EyeOff, ArrowRight, Sun, Moon } from 'lucide-react';

export default function AuthPage() {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const { error: authError } = mode === 'login'
      ? await signIn(email, password)
      : await signUp(email, password);

    if (authError) {
      setError(authError.message);
    } else if (mode === 'register') {
      setSuccess('Check your email to confirm your account.');
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setError('');
    const { error: authError } = await signInWithGoogle();
    if (authError) setError(authError.message);
  };

  return (
    <div className="min-h-screen auth-bg flex flex-col items-center justify-center px-4">
      {/* Theme Toggle — top right */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 p-2.5 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)] transition-all z-50"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--stripe-gradient)' }}>
          <TrendingUp size={22} className="text-white" />
        </div>
        <span className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight">Sigma Edge</span>
      </div>

      {/* Auth Card — Stripe style centered card */}
      <div className="w-full max-w-[400px] stripe-card p-8">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">
          {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mb-6">
          {mode === 'login' ? 'Access your betting intelligence dashboard' : 'Start your free trial today'}
        </p>

        {/* Google OAuth — Stripe style */}
        <button
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] text-sm font-medium transition-all"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div className="stripe-divider my-6">or</div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[var(--color-text-secondary)] block mb-1.5">Email</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="stripe-input pl-10"
              />
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-[var(--color-text-secondary)]">Password</label>
              {mode === 'login' && (
                <button type="button" className="text-xs text-[var(--color-text-link)] hover:underline font-medium">
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="stripe-input pl-10 pr-10"
              />
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-[var(--color-danger-dim)] border border-[var(--color-danger)]/20 text-[var(--color-danger)] text-sm font-medium">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 rounded-lg bg-[var(--color-success-dim)] border border-[var(--color-success)]/20 text-[var(--color-success)] text-sm font-medium">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary flex items-center justify-center gap-2 py-2.5"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {mode === 'login' ? 'Sign in' : 'Create account'}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
          {mode === 'login' ? (
            <>
              New to Sigma Edge?{' '}
              <button onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
                className="text-[var(--color-text-link)] font-medium hover:underline">
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                className="text-[var(--color-text-link)] font-medium hover:underline">
                Sign in
              </button>
            </>
          )}
        </div>
      </div>

      {/* Footer — Stripe style */}
      <div className="mt-8 flex items-center gap-4 text-xs text-[var(--color-text-muted)]">
        <span>&copy; {new Date().getFullYear()} Sigma Edge</span>
        <span className="w-1 h-1 rounded-full bg-[var(--color-border-default)]" />
        <a href="#" className="hover:text-[var(--color-text-secondary)] transition-colors">Privacy</a>
        <span className="w-1 h-1 rounded-full bg-[var(--color-border-default)]" />
        <a href="#" className="hover:text-[var(--color-text-secondary)] transition-colors">Terms</a>
      </div>
    </div>
  );
}
