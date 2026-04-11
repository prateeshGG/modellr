import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PublicNav } from '../../components/layout/PublicNav';
import { Footer } from '../../components/layout/Footer';
import { ArrowRight, Columns, Database } from 'lucide-react';

export function CompareIndex() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Compare Database Design Tools";
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', 'database design tools comparison, dbdiagram alternative, drawsql alternative');
  }, []);

  return (
    <div style={{ background: 'var(--canvas-bg)', color: 'var(--text-primary)', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'var(--sans)' }}>
      <PublicNav />

      {/* 1. Hero */}
      <section style={{ textAlign: 'center', padding: '100px 20px 64px' }}>
        <h1 style={{ fontSize: 'min(3.5rem, 8vw)', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 24px 0' }}>Compare tools</h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', margin: '0 auto 64px auto', maxWidth: '600px', lineHeight: 1.6 }}>
          See how Modellr stacks up against the legacy alternatives on the market.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', maxWidth: '800px', margin: '0 auto' }}>

          <div style={{ background: 'var(--surface-base)', borderRadius: '16px', border: '1px solid var(--border-subtle)', padding: '32px', textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: 'rgba(var(--brand-rgb), 0.1)', color: 'var(--brand)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}><Columns size={24} /></div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 12px 0' }}>dbdiagram vs Modellr</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '32px', flex: 1 }}>
              dbdiagram is great for simple DBML. Learn why modern teams using Prisma and Drizzle are switching to a synced workflow.
            </p>
            <button
              onClick={() => navigate('/compare/dbdiagram')}
              style={{ background: 'transparent', color: 'var(--text-primary)', padding: '12px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, border: '1px solid var(--border-hi)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              See comparison <ArrowRight size={16} />
            </button>
          </div>

          <div style={{ background: 'var(--surface-base)', borderRadius: '16px', border: '1px solid var(--border-subtle)', padding: '32px', textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: 'rgba(var(--brand-rgb), 0.1)', color: 'var(--brand)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}><Database size={24} /></div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 12px 0' }}>DrawSQL vs Modellr</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '32px', flex: 1 }}>
              DrawSQL requires manual canvas building. See how AI generation and auto-layout replaces the friction.
            </p>
            <button
              onClick={() => navigate('/compare/drawsql')}
              style={{ background: 'transparent', color: 'var(--text-primary)', padding: '12px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, border: '1px solid var(--border-hi)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              See comparison <ArrowRight size={16} />
            </button>
          </div>

        </div>
      </section>

      <Footer />
    </div>
  );
}
