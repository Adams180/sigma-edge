import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export default function AuthPage() {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mode, setMode] = useState('login');
  const [step, setStep] = useState('email'); // 'email' | 'password'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleEmailContinue = (e) => {
    e.preventDefault();
    if (!email) return;
    setError('');
    setStep('password');
  };

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

  const handleBack = () => {
    setStep('email');
    setPassword('');
    setError('');
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: theme === 'dark' ? '#0A2540' : '#f6f9fc' }}
    >
      {/* Theme toggle — top right */}
      <button
        onClick={toggleTheme}
        className="fixed top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full transition-all z-50"
        style={{
          background: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
          color: theme === 'dark' ? '#A3ACB9' : '#697386',
        }}
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
      </button>

      {/* Main centered container */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {/* Stripe-style wordmark */}
        <div className="mb-8">
          <svg viewBox="0 0 120 28" width="120" height="28" aria-label="Sigma Edge">
            <text
              x="0"
              y="22"
              style={{
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                fontSize: '22px',
                fontWeight: '700',
                letterSpacing: '-0.02em',
                fill: theme === 'dark' ? '#FFFFFF' : '#0A2540',
              }}
            >
              sigma edge
            </text>
          </svg>
        </div>

        {/* Auth card — exact Stripe proportions */}
        <div
          className="w-full max-w-[400px] rounded-lg p-8"
          style={{
            background: theme === 'dark' ? '#0E2F4F' : '#FFFFFF',
            boxShadow: theme === 'dark'
              ? '0 2px 4px rgba(0,0,0,0.3), 0 15px 35px rgba(0,0,0,0.25)'
              : '0 2px 4px rgba(0,0,0,0.05), 0 15px 35px rgba(0,0,0,0.07)',
            border: theme === 'dark' ? '1px solid rgba(255,255,255,0.06)' : 'none',
          }}
        >
          {/* Card header */}
          <h1
            className="text-xl font-semibold mb-1"
            style={{ color: theme === 'dark' ? '#FFFFFF' : '#1A1F36', letterSpacing: '-0.01em' }}
          >
            {mode === 'login' ? 'Sign in' : 'Create your account'}
          </h1>
          {step === 'password' && mode === 'login' ? (
            <div className="flex items-center gap-2 mb-6">
              <span
                className="text-sm"
                style={{ color: theme === 'dark' ? '#A3ACB9' : '#697386' }}
              >
                {email}
              </span>
              <span className="text-sm" style={{ color: theme === 'dark' ? '#A3ACB9' : '#697386' }}>·</span>
              <button
                type="button"
                onClick={handleBack}
                className="text-sm font-medium hover:underline"
                style={{ color: '#635BFF' }}
              >
                Use a different email
              </button>
            </div>
          ) : (
            <p
              className="text-sm mb-6"
              style={{ color: theme === 'dark' ? '#A3ACB9' : '#697386' }}
            />
          )}

          {/* Step 1: Email */}
          {step === 'email' && (
            <form onSubmit={handleEmailContinue}>
              <div className="mb-4">
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: theme === 'dark' ? '#A3ACB9' : '#1A1F36' }}
                >
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
                  className="w-full px-3 py-2.5 rounded-md text-sm transition-all"
                  style={{
                    background: theme === 'dark' ? '#132F4C' : '#FFFFFF',
                    border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.12)' : '#D8DEE4'}`,
                    color: theme === 'dark' ? '#FFFFFF' : '#1A1F36',
                    outline: 'none',
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = '#635BFF';
                    e.target.style.boxShadow = '0 0 0 3px rgba(99,91,255,0.12)';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = theme === 'dark' ? 'rgba(255,255,255,0.12)' : '#D8DEE4';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-md text-sm font-semibold transition-all"
                style={{
                  background: '#635BFF',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(99,91,255,0.3)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#7A73FF'}
                onMouseLeave={e => e.currentTarget.style.background = '#635BFF'}
              >
                Continue
              </button>

              {error && (
                <div
                  className="mt-4 p-3 rounded-md text-sm"
                  style={{
                    background: 'rgba(223,27,65,0.08)',
                    color: '#DF1B41',
                    border: '1px solid rgba(223,27,65,0.15)',
                  }}
                >
                  {error}
                </div>
              )}

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#E3E8EE' }} />
                <span className="text-xs" style={{ color: theme === 'dark' ? '#697386' : '#8898AA' }}>OR</span>
                <div className="flex-1 h-px" style={{ background: theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#E3E8EE' }} />
              </div>

              {/* Google */}
              <button
                type="button"
                onClick={handleGoogle}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-md text-sm font-medium transition-all"
                style={{
                  background: 'transparent',
                  border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.12)' : '#D8DEE4'}`,
                  color: theme === 'dark' ? '#FFFFFF' : '#1A1F36',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => e.currentTarget.style.background = theme === 'dark' ? 'rgba(255,255,255,0.04)' : '#F6F8FA'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              {/* Toggle mode link */}
              <div className="mt-6 text-center text-sm" style={{ color: theme === 'dark' ? '#A3ACB9' : '#697386' }}>
                {mode === 'login' ? (
                  <>
                    Don&rsquo;t have an account?{' '}
                    <button
                      type="button"
                      onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
                      className="font-medium hover:underline"
                      style={{ color: '#635BFF' }}
                    >
                      Sign up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                      className="font-medium hover:underline"
                      style={{ color: '#635BFF' }}
                    >
                      Sign in
                    </button>
                  </>
                )}
              </div>
            </form>
          )}

          {/* Step 2: Password */}
          {step === 'password' && (
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    className="block text-sm font-medium"
                    style={{ color: theme === 'dark' ? '#A3ACB9' : '#1A1F36' }}
                  >
                    Password
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      className="text-xs font-medium hover:underline"
                      style={{ color: '#635BFF' }}
                    >
                      Forgot your password?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'At least 6 characters' : ''}
                  required
                  minLength={6}
                  autoFocus
                  className="w-full px-3 py-2.5 rounded-md text-sm transition-all"
                  style={{
                    background: theme === 'dark' ? '#132F4C' : '#FFFFFF',
                    border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.12)' : '#D8DEE4'}`,
                    color: theme === 'dark' ? '#FFFFFF' : '#1A1F36',
                    outline: 'none',
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = '#635BFF';
                    e.target.style.boxShadow = '0 0 0 3px rgba(99,91,255,0.12)';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = theme === 'dark' ? 'rgba(255,255,255,0.12)' : '#D8DEE4';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {error && (
                <div
                  className="mb-4 p-3 rounded-md text-sm"
                  style={{
                    background: 'rgba(223,27,65,0.08)',
                    color: '#DF1B41',
                    border: '1px solid rgba(223,27,65,0.15)',
                  }}
                >
                  {error}
                </div>
              )}

              {success && (
                <div
                  className="mb-4 p-3 rounded-md text-sm"
                  style={{
                    background: 'rgba(48,177,48,0.08)',
                    color: '#30B130',
                    border: '1px solid rgba(48,177,48,0.15)',
                  }}
                >
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-md text-sm font-semibold transition-all flex items-center justify-center"
                style={{
                  background: '#635BFF',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: loading ? 'default' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  boxShadow: '0 1px 3px rgba(99,91,255,0.3)',
                }}
                onMouseEnter={e => !loading && (e.currentTarget.style.background = '#7A73FF')}
                onMouseLeave={e => !loading && (e.currentTarget.style.background = '#635BFF')}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  mode === 'login' ? 'Sign in' : 'Create account'
                )}
              </button>

              {mode === 'login' && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="w-full mt-3 py-2.5 rounded-md text-sm font-medium transition-all"
                  style={{
                    background: 'transparent',
                    border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.12)' : '#D8DEE4'}`,
                    color: theme === 'dark' ? '#FFFFFF' : '#1A1F36',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = theme === 'dark' ? 'rgba(255,255,255,0.04)' : '#F6F8FA'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  Back
                </button>
              )}
            </form>
          )}
        </div>
      </div>

      {/* Footer — exact Stripe style */}
      <div
        className="py-6 px-4 flex items-center justify-center gap-4 text-xs"
        style={{ color: theme === 'dark' ? '#697386' : '#8898AA' }}
      >
        <span>&copy; Sigma Edge</span>
        <span style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#E3E8EE' }}>·</span>
        <a href="#" className="hover:underline" style={{ color: theme === 'dark' ? '#697386' : '#8898AA' }}>Privacy & terms</a>
        <span style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#E3E8EE' }}>·</span>
        <a href="#" className="hover:underline" style={{ color: theme === 'dark' ? '#697386' : '#8898AA' }}>Contact</a>
      </div>
    </div>
  );
}
