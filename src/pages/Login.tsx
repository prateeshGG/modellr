import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export function Login() {
  const { session } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState({ text: '', isError: false });

  if (session) return <Navigate to="/app" replace />;

  const handleEmailAuth = async (isSignUp: boolean) => {
    setMsg({ text: 'Processing...', isError: false });
    const { error } = isSignUp 
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMsg({ text: error.message, isError: true });
    } else {
      setMsg({ text: isSignUp ? 'Check your email for confirmation!' : 'Logged in natively!', isError: false });
    }
  };

  const signInWithGithub = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
    });
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh',
      background: 'var(--canvas-bg)', color: 'var(--text-primary)', fontFamily: '"Geist", sans-serif'
    }}>
      <div style={{
        background: 'var(--surface-base)',
        padding: '32px',
        borderRadius: '16px',
        border: '1px solid var(--border-subtle)',
        width: '360px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)'
      }}>
        <h1 style={{ fontSize: '20px', marginBottom: '8px' }}>Log in to SchemaForge</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Welcome back! Access your cloud schemas.
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
            style={{
              padding: '10px', background: '#24292f', color: 'white',
              border: 'none', borderRadius: '8px', cursor: 'pointer',
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

          <input
            type="email" placeholder="Email address"
            value={email} onChange={(e) => setEmail(e.target.value)}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-default)', background: 'var(--surface-low)', color: 'var(--text-primary)' }}
          />
          <input
            type="password" placeholder="Password"
            value={password} onChange={(e) => setPassword(e.target.value)}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-default)', background: 'var(--surface-low)', color: 'var(--text-primary)' }}
          />

          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button 
              onClick={() => handleEmailAuth(false)}
              style={{ flex: 1, padding: '10px', background: 'var(--text-primary)', color: 'var(--surface-base)', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', fontWeight: 600 }}
            >
              Sign In
            </button>
            <button 
              onClick={() => handleEmailAuth(true)}
              style={{ flex: 1, padding: '10px', background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-focus)', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', fontWeight: 600 }}
            >
              Sign Up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
