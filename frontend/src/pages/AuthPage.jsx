import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Zap, Eye, EyeOff } from 'lucide-react';

export default function AuthPage() {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [remember, setRemember] = useState(true);

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
    <div className="se-auth-shell">
      {/* Top bar */}
      <header className="se-auth-topbar">
        <div className="se-auth-brand">
          <div className="se-auth-brand-icon">
            <Zap size={16} className="text-white" />
          </div>
          sigma edge
        </div>
      </header>

      {/* Stage with ribbon */}
      <section className="se-auth-stage">
        <div className="se-auth-ribbon" aria-hidden="true" />

        <div className="se-auth-card-wrap">
          <div className="se-auth-card">
            <h1>{mode === 'login' ? 'Sign in to your account' : 'Create your account'}</h1>

            {error && <div className="se-auth-error">{error}</div>}
            {success && <div className="se-auth-success">{success}</div>}

            <form onSubmit={handleSubmit}>
              {/* Email */}
              <div style={{ marginBottom: '1rem' }}>
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
                  autoComplete="email"
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: '0.5rem' }}>
                <div className="label-row">
                  <label style={{ marginBottom: 0 }}>Password</label>
                  {mode === 'login' && (
                    <button type="button" className="se-auth-link">
                      Forgot your password?
                    </button>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={mode === 'register' ? 'At least 6 characters' : ''}
                    required
                    minLength={6}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPw(!showPw)}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: '#97a1b4', padding: 2,
                    }}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <label className="auth-remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                />
                Remember me on this device
              </label>

              {/* Submit */}
              <button type="submit" className="se-auth-btn-primary" disabled={loading}>
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  mode === 'login' ? 'Sign in' : 'Create account'
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="se-auth-divider">
              <span>Or sign in with</span>
            </div>

            {/* Google */}
            <button type="button" onClick={handleGoogle} className="se-auth-btn-google">
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </button>

            {/* Toggle mode */}
            <div className="se-auth-toggle">
              {mode === 'login' ? (
                <>
                  New to Sigma Edge?{' '}
                  <button onClick={() => { setMode('register'); setError(''); setSuccess(''); }}>
                    Create account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>
                    Sign in
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="se-auth-footer">
        <span>&copy; Sigma Edge</span>
        <a href="#">Privacy &amp; terms</a>
      </footer>
    </div>
  );
}
