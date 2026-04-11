import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export const PublicNav: React.FC = () => {
  const navigate = useNavigate();
  const { session } = useAuthStore();

  return (
    <nav style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5rem 2rem', alignItems: 'center', maxWidth: '1400px', margin: '0 auto', borderBottom: '1px solid var(--border-subtle)', width: '100%', background: 'var(--canvas-bg)' }}>
      <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
        <div 
          onClick={() => navigate('/')}
          style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
        >
          <div style={{ width: '24px', height: '24px', background: 'var(--brand)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px' }}>SF</div>
          SchemaForge
        </div>
        <div style={{ display: 'flex', gap: '24px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500 }}>
          <span onClick={() => navigate('/templates')} style={{ cursor: 'pointer' }}>Templates</span>
          <span onClick={() => navigate('/pricing')} style={{ cursor: 'pointer', color: 'inherit' }}>Pricing</span>
          <span onClick={() => navigate('/docs')} style={{ cursor: 'pointer' }}>Docs</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '1rem' }}>
        {session ? (
          <button 
            onClick={() => navigate('/app')}
            style={{ padding: '0.6rem 1.2rem', background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
          >Go to Dashboard</button>
        ) : (
          <>
            <button 
              onClick={() => navigate('/login')}
              style={{ padding: '0.6rem 1.2rem', background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
            >Log in</button>
            <button 
              onClick={() => navigate('/login')}
              style={{ padding: '0.6rem 1.2rem', background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
            >Sign up free</button>
          </>
        )}
      </div>
    </nav>
  );
};
