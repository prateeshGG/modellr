import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

type LoginView = 'auth' | 'forgot';

export function Login() {
  const { session } = useAuthStore();
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
    if (error) {
      setMsg({ text: `GitHub sign-in failed: ${error.message}`, isError: true });
    }
  };

  // Fix #96: handle forgot password via Supabase reset email
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

  const cardStyle: React.CSSProperties = {
    background: 'var(--surface-base)',
    padding: '32px',
    borderRadius: '16px',
    border: '1px solid var(--border-subtle)',
    width: '360px',
    boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
  };

  const inputStyle: React.CSSProperties = {
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid var(--border-default)',
    background: 'var(--surface-low)',
    color: 'var(--text-primary)',
    opacity: isLoading ? 0.6 : 1,
    width: '100%',
    boxSizing: 'border-box',
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh',
      background: 'var(--canvas-bg)', color: 'var(--text-primary)', fontFamily: '"Geist", sans-serif'
    }}>
      {/* ── Forgot-password view ── */}
      {view === 'forgot' ? (
        <div style={cardStyle}>
          <h1 style={{ fontSize: '20px', marginBottom: '8px' }}>Reset your password</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Enter the email address linked to your account and we'll send a reset link.
          </p>

          {msg.text && (
            <div style={{
              background: msg.isError ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
              color: msg.isError ? '#ef4444' : '#10b981',
              padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px',
            }}>
              {msg.text}
            </div>
          )}

          <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              type="email"
              placeholder="Email address"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              disabled={isLoading}
              style={inputStyle}
              autoFocus
            />
            <button
              type="submit"
              disabled={isLoading}
              style={{ padding: '10px', background: 'var(--text-primary)', color: 'var(--canvas-bg)', border: 'none', borderRadius: '8px', cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: isLoading ? 0.6 : 1 }}
            >
              {isLoading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>

          <button
            onClick={() => { setView('auth'); setMsg({ text: '', isError: false }); }}
            style={{ marginTop: '16px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', padding: 0 }}
          >
            ← Back to sign in
          </button>
        </div>
      ) : (
        /* ── Auth view (sign-in / sign-up) ── */
        <div style={cardStyle}>
          <h1 style={{ fontSize: '20px', marginBottom: '8px' }}>Welcome to Modellr</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Sign in or create an account to access your cloud schemas.
          </p>

          {msg.text && (
            <div style={{
              background: msg.isError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              color: msg.isError ? '#ef4444' : '#10b981',
              padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px'
            }}>
              {msg.text}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={signInWithGithub}
              disabled={isLoading}
              style={{
                padding: '10px', background: '#24292f', color: 'white',
                border: 'none', borderRadius: '8px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1,
                fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              Continue with GitHub
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '12px 0' }}>
              <hr style={{ flex: 1, borderTop: '1px solid var(--border-subtle)' }} />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Or with Email</span>
              <hr style={{ flex: 1, borderTop: '1px solid var(--border-subtle)' }} />
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); handleEmailAuth(false); }}
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <input
                type="email" placeholder="Email address"
                value={email} onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                style={inputStyle}
              />
              <input
                type="password" placeholder="Password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                style={inputStyle}
              />

              {/* Fix #96: Forgot password link */}
              <button
                type="button"
                onClick={() => { setView('forgot'); setMsg({ text: '', isError: false }); setResetEmail(email); }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer', textAlign: 'right', padding: 0, alignSelf: 'flex-end' }}
              >
                Forgot password?
              </button>

              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{ flex: 1, padding: '10px', background: 'var(--text-primary)', color: 'var(--surface-base)', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: isLoading ? 0.6 : 1 }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleEmailAuth(true)}
                  style={{ flex: 1, padding: '10px', background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-focus)', borderRadius: '8px', fontSize: '14px', cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: isLoading ? 0.6 : 1 }}
                >
                  Sign Up
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
