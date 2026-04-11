import React from 'react';
import { useNavigate } from 'react-router-dom';

export const Footer: React.FC = () => {
  const navigate = useNavigate();

  return (
    <footer style={{ borderTop: '1px solid var(--border-subtle)', padding: '80px 20px 40px', background: 'var(--canvas-bg)', color: 'var(--text-secondary)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '48px' }}>
        <div>
          <div
            onClick={() => navigate('/')}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.2rem' }}
          >
            <div style={{ width: '20px', height: '20px', background: 'var(--brand)', borderRadius: '4px' }}></div>
            Modellr
          </div>
          <p style={{ maxWidth: '250px', lineHeight: 1.6, fontSize: '14px' }}>
            The intelligent choice for modern data architecture and relational diagramming natively built for modern frameworks.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '64px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '14px' }}>
            <strong style={{ color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '12px' }}>Product</strong>
            <span onClick={() => navigate('/templates')} style={{ cursor: 'pointer' }}>Templates</span>
            <span onClick={() => navigate('/pricing')} style={{ cursor: 'pointer' }}>Pricing</span>
            <span onClick={() => navigate('/docs')} style={{ cursor: 'pointer' }}>Docs</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '14px' }}>
            <strong style={{ color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '12px' }}>Use Cases</strong>
            <span onClick={() => navigate('/use-cases/saas-database-schema')} style={{ cursor: 'pointer' }}>SaaS Schema</span>
            <span onClick={() => navigate('/use-cases/ecommerce-schema')} style={{ cursor: 'pointer' }}>E-commerce Schema</span>
            <span onClick={() => navigate('/use-cases/auth-schema')} style={{ cursor: 'pointer' }}>Auth Schema</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '14px' }}>
            <strong style={{ color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '12px' }}>Compare</strong>
            <span onClick={() => navigate('/compare/dbdiagram')} style={{ cursor: 'pointer' }}>vs dbdiagram</span>
            <span onClick={() => navigate('/compare/drawsql')} style={{ cursor: 'pointer' }}>vs DrawSQL</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '14px' }}>
            <strong style={{ color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '12px' }}>Company</strong>
            <span onClick={() => navigate('/about')} style={{ cursor: 'pointer' }}>About</span>
            <span onClick={() => navigate('/blog')} style={{ cursor: 'pointer' }}>Blog</span>
            <span onClick={() => navigate('/contact')} style={{ cursor: 'pointer' }}>Contact</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '14px' }}>
            <strong style={{ color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '12px' }}>Legal</strong>
            <span onClick={() => navigate('/privacy')} style={{ cursor: 'pointer' }}>Privacy Policy</span>
            <span onClick={() => navigate('/terms')} style={{ cursor: 'pointer' }}>Terms of Service</span>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: '1200px', margin: '64px auto 0', display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderTop: '1px solid var(--border-subtle)', paddingTop: '24px' }}>
        <span>© {new Date().getFullYear()} Modellr Inc. All rights reserved.</span>
        <span>Designed natively on the grid.</span>
      </div>
    </footer>
  );
};
