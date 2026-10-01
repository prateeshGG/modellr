import React from 'react';
import { useNavigate } from 'react-router-dom';

export const Footer: React.FC = () => {
  const navigate = useNavigate();

  const linkStyle: React.CSSProperties = {
    cursor: 'pointer',
    color: '#6b6b80',
    fontSize: '14px',
    transition: 'color 0.15s',
    fontFamily: "'Instrument Sans', 'Geist', sans-serif",
  };

  const onHover = (e: React.MouseEvent<HTMLElement>) => (e.currentTarget.style.color = '#e8e8f0');
  const onLeave = (e: React.MouseEvent<HTMLElement>) => (e.currentTarget.style.color = '#6b6b80');

  const Link: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => (
    <span
      onClick={() => navigate(to)}
      style={linkStyle}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      {children}
    </span>
  );

  const cols = [
    {
      heading: 'Product',
      links: [
        { label: 'Templates', to: '/templates' },
        { label: 'Blog',      to: '/blog' },
        { label: 'Docs',      to: '/docs' },
        { label: 'Features',  to: '/features' },
      ],
    },
    {
      heading: 'Use Cases',
      links: [
        { label: 'SaaS Schema',       to: '/use-cases/saas-database-schema' },
        { label: 'E-commerce Schema', to: '/use-cases/ecommerce-schema' },
        { label: 'Auth Schema',       to: '/use-cases/auth-schema' },
      ],
    },
    {
      heading: 'Project',
      links: [
        { label: 'About',   to: '/about' },
        { label: 'Blog',    to: '/blog' },
        { label: 'Contact', to: '/contact' },
      ],
    },
    {
      heading: 'Legal',
      links: [
        { label: 'Privacy Policy',   to: '/privacy' },
        { label: 'Terms of Use', to: '/terms' },
      ],
    },
  ];

  return (
    <footer style={{
      borderTop: '1px solid #1e1e2e',
      padding: '72px 5% 36px',
      background: '#0c0c10',
      color: '#6b6b80',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '48px' }}>

        {/* Brand */}
        <div style={{ maxWidth: '240px' }}>
          <div
            onClick={() => navigate('/')}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}
          >
            <div style={{ width: '22px', height: '22px', background: '#ae7aff', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px', fontWeight: 700 }}>M</div>
            <span style={{ fontFamily: "'Syne', 'Geist', sans-serif", fontWeight: 800, fontSize: '18px', color: '#e8e8f0' }}>Modellr</span>
          </div>
          <p style={{ fontSize: '13px', lineHeight: 1.65, color: '#6b6b80', fontFamily: "'Instrument Sans', 'Geist', sans-serif" }}>
            A free, open-source, local-first database schema designer. Runs in your browser; no account needed.
          </p>
        </div>

        {/* Nav columns */}
        <div style={{ display: 'flex', gap: '48px', flexWrap: 'wrap' }}>
          {cols.map(col => (
            <div key={col.heading} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <strong style={{
                fontFamily: "'Geist Mono', monospace",
                color: '#e8e8f0',
                fontSize: '11px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}>
                {col.heading}
              </strong>
              {col.links.map(l => <Link key={l.to} to={l.to}>{l.label}</Link>)}
              {col.heading === 'Project' && (
                <a
                  href="https://github.com/prateesh7777/schemaforge"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ ...linkStyle, textDecoration: 'none' }}
                  onMouseEnter={onHover}
                  onMouseLeave={onLeave}
                >
                  GitHub
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        maxWidth: '1200px',
        margin: '56px auto 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '12px',
        borderTop: '1px solid #1e1e2e',
        paddingTop: '24px',
        flexWrap: 'wrap',
        gap: '8px',
        fontFamily: "'Geist Mono', monospace",
      }}>
        <span>Modellr is free and open-source software, released under the MIT license.</span>
        <span style={{ color: '#2e2e4e' }}>Your schemas stay in your browser.</span>
      </div>
    </footer>
  );
};
