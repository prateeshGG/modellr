import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import '../styles/public-dark.css';

type LoginView = 'auth' | 'forgot';

export function Login() {
  const { session } = useAuthStore();
  const navigate = useNavigate();
  const [view, setView] = useState<LoginView>('auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', isError: false });

  if (session) return <Navigate to="/app" replace />;

  const handleEmailAuth = async (isSignUp: boolean) => {
    if (isLoading) return;
    if (!email.trim() || !password.trim()) {
      setMsg({ text: 'Please enter your email and password.', isError: true });
      return;
    }
    if (isSignUp && password.length < 6) {
      setMsg({ text: 'Password must be at least 6 characters.', isError: true });
      return;
    }
    setIsLoading(true);
    setMsg({ text: 'Processing...', isError: false });

    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    setIsLoading(false);
    if (error) {
      setMsg({ text: error.message, isError: true });
    } else {
      setMsg({ text: isSignUp ? 'Check your email for confirmation!' : 'Logged in!', isError: false });
    }
  };

  const signInWithGithub = async () => {
    if (isLoading) return;
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'github' });
    setIsLoading(false);
    if (error) setMsg({ text: `GitHub sign-in failed: ${error.message}`, isError: true });
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setMsg({ text: 'Please enter your email address.', isError: true });
      return;
    }
    setIsLoading(true);
    setMsg({ text: 'Sending reset link…', isError: false });
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
      redirectTo: `${window.location.origin}/login?reset=true`,
    });
    setIsLoading(false);
    if (error) {
      setMsg({ text: error.message, isError: true });
    } else {
      setMsg({ text: 'Password reset email sent! Check your inbox.', isError: false });
    }
  };

  const msgStyle: React.CSSProperties = {
    padding: '10px 14px',
    borderRadius: '4px',
    fontSize: '13px',
    marginBottom: '16px',
    fontFamily: 'var(--pd-mono)',
    background: msg.isError ? 'rgba(248,113,113,0.1)' : 'rgba(74,222,128,0.1)',
    color: msg.isError ? '#f87171' : '#4ade80',
    border: `1px solid ${msg.isError ? 'rgba(248,113,113,0.2)' : 'rgba(74,222,128,0.2)'}`,
  };

  return (
    <div className="pd-root" style={{ minHeight: '100vh' }}>
      {/* Minimal nav */}
      <nav style={{ padding: '20px 5%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div
          onClick={() => navigate('/')}
          style={{ fontFamily: 'var(--pd-display)', fontWeight: 800, fontSize: '18px', color: 'var(--pd-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <div style={{ width: '22px', height: '22px', background: 'var(--pd-brand)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px', fontWeight: 700 }}>M</div>
          Modellr
        </div>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'transparent', border: 'none', color: 'var(--pd-muted)', fontFamily: 'var(--pd-mono)', fontSize: '13px', cursor: 'pointer' }}
        >
          ← Back to home
        </button>
      </nav>

      <div className="pd-login-wrap">
        <div className="pd-login-glow" aria-hidden />

        {view === 'forgot' ? (
          /* ── Forgot password ── */
          <div className="pd-login-card">
            <div className="pd-label" style={{ marginBottom: '8px' }}>// Reset password</div>
            <h1 style={{ fontFamily: 'var(--pd-display)', fontSize: '22px', fontWeight: 800, color: 'var(--pd-text)', margin: '0 0 8px 0' }}>Reset your password</h1>
            <p style={{ fontSize: '13px', color: 'var(--pd-muted)', marginBottom: '24px', lineHeight: 1.6 }}>
              Enter the email address linked to your account and we'll send a reset link.
            </p>

            {msg.text && <div style={msgStyle}>{msg.text}</div>}

            <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="email"
                placeholder="Email address"
                value={resetEmail}
                onChange={e => setResetEmail(e.target.value)}
                disabled={isLoading}
                className="pd-login-input"
                autoFocus
              />
              <button
                type="submit"
                disabled={isLoading}
                className="pd-btn-primary"
                style={{ width: '100%', opacity: isLoading ? 0.6 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}
              >
                {isLoading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>

            <button
              onClick={() => { setView('auth'); setMsg({ text: '', isError: false }); }}
              style={{ marginTop: '16px', background: 'transparent', border: 'none', color: 'var(--pd-muted)', fontFamily: 'var(--pd-mono)', fontSize: '12px', cursor: 'pointer', padding: 0 }}
            >
              ← Back to sign in
            </button>
          </div>
        ) : (
          /* ── Auth ── */
          <div className="pd-login-card">
            <div className="pd-label" style={{ marginBottom: '8px' }}>// Welcome back</div>
            <h1 style={{ fontFamily: 'var(--pd-display)', fontSize: '22px', fontWeight: 800, color: 'var(--pd-text)', margin: '0 0 8px 0' }}>Welcome to Modellr</h1>
            <p style={{ fontSize: '13px', color: 'var(--pd-muted)', marginBottom: '24px', lineHeight: 1.6 }}>
              Sign in or create an account to access your cloud schemas.
            </p>

            {msg.text && <div style={msgStyle}>{msg.text}</div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* GitHub */}
              <button
                onClick={signInWithGithub}
                disabled={isLoading}
                style={{
                  padding: '11px', background: '#161b22', color: '#e8e8f0',
                  border: '1px solid #30363d', borderRadius: '4px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.6 : 1,
                  fontFamily: 'var(--pd-mono)', fontSize: '13px', fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--pd-brand)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#30363d')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
                Continue with GitHub
              </button>

              <div className="pd-login-divider">
                <hr /><span>or with email</span><hr />
              </div>

              <form
                onSubmit={e => { e.preventDefault(); handleEmailAuth(false); }}
                style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
              >
                <input
                  type="email" placeholder="Email address"
                  value={email} onChange={e => setEmail(e.target.value)}
                  disabled={isLoading} className="pd-login-input"
                />
                <input
                  type="password" placeholder="Password"
                  value={password} onChange={e => setPassword(e.target.value)}
                  disabled={isLoading} className="pd-login-input"
                />

                <button
                  type="button"
                  onClick={() => { setView('forgot'); setMsg({ text: '', isError: false }); setResetEmail(email); }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--pd-muted)', fontFamily: 'var(--pd-mono)', fontSize: '11px', cursor: 'pointer', textAlign: 'right', padding: 0, alignSelf: 'flex-end' }}
                >
                  Forgot password?
                </button>

                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="pd-btn-primary"
                    style={{ flex: 1, opacity: isLoading ? 0.6 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleEmailAuth(true)}
                    className="pd-btn-outline"
                    style={{ flex: 1, opacity: isLoading ? 0.6 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}
                  >
                    Sign Up
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
