import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface PublicNavProps {
  /** When true, renders the frosted-glass dark variant used on the home page */
  dark?: boolean;
}

export const PublicNav: React.FC<PublicNavProps> = ({ dark = false }) => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!dark) return;
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [dark]);

  /* ── Dark (home page) variant ─────────────────────────────── */
  if (dark) {
    return (
      <nav
        style={{
          position: 'fixed',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '92%',
          maxWidth: '1200px',
          background: scrolled
            ? 'rgba(5, 5, 7, 0.85)'
            : 'rgba(5, 5, 7, 0.6)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid #1e1e2e',
          borderRadius: '8px',
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 100,
          transition: 'background 0.3s',
        }}
      >
        {/* Left: logo + links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
          <div
            onClick={() => navigate('/')}
            style={{
              fontFamily: "'Syne', 'Geist', sans-serif",
              fontWeight: 800,
              fontSize: '18px',
              letterSpacing: '-0.02em',
              color: '#e8e8f0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div
              style={{
                width: '22px', height: '22px',
                background: 'rgb(174, 122, 255)',
                borderRadius: '4px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: '10px', fontWeight: 700,
              }}
            >
              M
            </div>
            Modellr
          </div>

          <div style={{ display: 'flex', gap: '28px' }}>
            {[
              { label: 'Templates', path: '/templates' },
              { label: 'Blog',      path: '/blog' },
              { label: 'Docs',      path: '/docs' },
            ].map(({ label, path }) => (
              <span
                key={label}
                onClick={() => navigate(path)}
                style={{
                  color: '#6b6b80',
                  fontSize: '14px',
                  fontFamily: "'Instrument Sans', 'Geist', sans-serif",
                  cursor: 'pointer',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#e8e8f0')}
                onMouseLeave={e => (e.currentTarget.style.color = '#6b6b80')}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Right: auth buttons */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={() => navigate('/app')}
            style={{
              background: '#00e5a0',
              color: '#050507',
              border: 'none',
              padding: '8px 18px',
              borderRadius: '4px',
              fontFamily: "'Geist Mono', monospace",
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Open editor
          </button>
        </div>
      </nav>
    );
  }

  /* ── Default (light) variant ──────────────────────────────── */
  return (
    <nav
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '1.5rem 2rem',
        alignItems: 'center',
        maxWidth: '1400px',
        margin: '0 auto',
        borderBottom: '1px solid var(--border-subtle)',
        width: '100%',
        background: 'var(--canvas-bg)',
      }}
    >
      <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
        <div
          onClick={() => navigate('/')}
          style={{
            fontWeight: 800,
            fontSize: '1.2rem',
            letterSpacing: '-0.02em',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: '24px', height: '24px',
              background: 'var(--brand)',
              borderRadius: '6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: '12px',
            }}
          >
            M
          </div>
          Modellr
        </div>
        <div style={{ display: 'flex', gap: '24px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500 }}>
          <span onClick={() => navigate('/templates')} style={{ cursor: 'pointer' }}>Templates</span>
          <span onClick={() => navigate('/blog')}      style={{ cursor: 'pointer' }}>Blog</span>
          <span onClick={() => navigate('/docs')}      style={{ cursor: 'pointer' }}>Docs</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          onClick={() => navigate('/app')}
          style={{ padding: '0.6rem 1.2rem', background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
        >
          Open editor
        </button>
      </div>
    </nav>
  );
};
