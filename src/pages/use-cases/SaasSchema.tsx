import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PublicNav } from '../../components/layout/PublicNav';
import { Footer } from '../../components/layout/Footer';
import { Database, Users, CreditCard, Box, Zap, ArrowRight, LayoutTemplate } from 'lucide-react';

export function SaasSchema() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "SaaS Database Schema Example (Free Template)";
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', 'saas database schema');
  }, []);

  return (
    <div style={{ background: 'var(--canvas-bg)', color: 'var(--text-primary)', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'var(--sans)' }}>
      <PublicNav />
      
      {/* 1. Hero */}
      <section style={{ textAlign: 'center', padding: '100px 20px 64px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', background: 'var(--surface-base)', border: '1px solid var(--border-subtle)', borderRadius: '24px', color: 'var(--brand)', fontSize: '13px', fontWeight: 600, marginBottom: '24px' }}>
          <LayoutTemplate size={14} /> Official Schema Template
        </div>
        <h1 style={{ fontSize: 'min(3.5rem, 8vw)', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 24px 0' }}>SaaS Database Schema <br/><span style={{ color: 'var(--brand)', fontSize: 'min(2.5rem, 6vw)' }}>(Complete Guide + Template)</span></h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', margin: '0 auto 40px auto', maxWidth: '700px', lineHeight: 1.6 }}>
          A production-ready SaaS schema with users, billing, subscriptions, and analytics — ready to use or customize.
        </p>
        <button onClick={() => navigate('/login')} style={{ background: 'var(--brand)', color: '#fff', padding: '16px 32px', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px 0 rgba(var(--brand-rgb), 0.4)' }}>
          Use this schema
        </button>
      </section>

      {/* 2. Problem Section */}
      <section style={{ maxWidth: '800px', margin: '0 auto 80px', padding: '40px 20px' }}>
        <h2 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '32px' }}>Designing a SaaS database is harder than it looks</h2>
        <div style={{ fontSize: '18px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          <p style={{ marginBottom: '24px' }}>Most SaaS applications need the same core systems:</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><div style={{ color: 'var(--brand)' }}><ArrowRight size={20} /></div> User authentication</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><div style={{ color: 'var(--brand)' }}><ArrowRight size={20} /></div> Subscriptions and billing</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><div style={{ color: 'var(--brand)' }}><ArrowRight size={20} /></div> Teams or organizations</li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><div style={{ color: 'var(--brand)' }}><ArrowRight size={20} /></div> Usage tracking</li>
          </ul>
          <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>But designing these relationships correctly takes time — and small mistakes can lead to painful refactors later.</p>
        </div>
      </section>

      {/* 3. Visual Example */}
      <section style={{ maxWidth: '1000px', margin: '0 auto 100px', padding: '0 20px' }}>
        <div style={{ background: 'var(--surface-base)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '64px', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
          {/* Abstract Database Graphic */}
          <div style={{ display: 'flex', gap: '48px', alignItems: 'center', position: 'relative', zIndex: 1 }}>
            <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-hi)', padding: '24px', borderRadius: '12px', width: '200px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '12px', fontWeight: 700 }}>
                <Users size={16} color="var(--brand)" /> Users
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>id (PK)</div>
                <div>email</div>
                <div>org_id (FK)</div>
              </div>
            </div>
            <div style={{ width: '40px', height: '2px', background: 'var(--brand)' }} />
            <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-hi)', padding: '24px', borderRadius: '12px', width: '200px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '12px', fontWeight: 700 }}>
                <Box size={16} color="var(--brand)" /> Organizations
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>id (PK)</div>
                <div>name</div>
                <div>stripe_customer_id</div>
              </div>
            </div>
            <div style={{ width: '40px', height: '2px', background: 'var(--brand)' }} />
            <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-hi)', padding: '24px', borderRadius: '12px', width: '200px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '12px', fontWeight: 700 }}>
                <CreditCard size={16} color="var(--brand)" /> Subscriptions
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>id (PK)</div>
                <div>org_id (FK)</div>
                <div>status</div>
              </div>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '14px', color: 'var(--text-muted)' }}>
          A typical SaaS schema with users, organizations, subscriptions, and usage tracking.
        </div>
      </section>

      {/* 4. Explanation Section */}
      <section style={{ maxWidth: '1200px', margin: '0 auto 100px', padding: '0 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '64px' }}>
        <div>
          <h2 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '40px' }}>How this schema is structured</h2>
          
          <h3 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '24px', fontWeight: 700 }}>Core Tables</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}><Users size={20} color="var(--brand)"/> Users</div>
              <div style={{ color: 'var(--text-secondary)' }}>Stores authentication and profile data. Linked to organizations or workspaces.</div>
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}><Box size={20} color="var(--brand)"/> Organizations / Teams</div>
              <div style={{ color: 'var(--text-secondary)' }}>Enables multi-tenant architecture. Users can belong to multiple teams.</div>
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}><CreditCard size={20} color="var(--brand)"/> Subscriptions</div>
              <div style={{ color: 'var(--text-secondary)' }}>Tracks billing plans and status. Linked to Stripe or payment provider.</div>
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}><Database size={20} color="var(--brand)"/> Products / Plans</div>
              <div style={{ color: 'var(--text-secondary)' }}>Defines pricing tiers.</div>
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}><Zap size={20} color="var(--brand)"/> Usage / Events</div>
              <div style={{ color: 'var(--text-secondary)' }}>Tracks feature usage for metering.</div>
            </div>
          </div>
        </div>
        
        <div>
          <div style={{ background: 'var(--surface-base)', borderRadius: '16px', padding: '40px', border: '1px solid var(--border-subtle)' }}>
            <h3 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '24px', fontWeight: 700 }}>Relationships</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '16px', color: 'var(--text-secondary)' }}>
              <li style={{ display: 'flex', gap: '12px' }}><span style={{ color: 'var(--brand)' }}>✓</span> A user can belong to multiple organizations</li>
              <li style={{ display: 'flex', gap: '12px' }}><span style={{ color: 'var(--brand)' }}>✓</span> An organization has one active subscription</li>
              <li style={{ display: 'flex', gap: '12px' }}><span style={{ color: 'var(--brand)' }}>✓</span> Subscriptions map to plans</li>
              <li style={{ display: 'flex', gap: '12px' }}><span style={{ color: 'var(--brand)' }}>✓</span> Usage is tracked per organization or user</li>
            </ul>
          </div>
          
          <h2 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em', margin: '48px 0 24px' }}>Avoid costly mistakes early</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '16px' }}>A poorly designed SaaS schema leads to billing inconsistencies, broken permissions, and hard-to-scale systems.</p>
          <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '16px' }}>Starting with a solid structure saves hours of rework later.</p>
        </div>
      </section>

      {/* 5. Bottom CTA */}
      <section style={{ textAlign: 'center', padding: '100px 20px', background: 'var(--surface-base)', borderTop: '1px solid var(--border-subtle)', marginTop: 'auto' }}>
        <h2 style={{ fontSize: '40px', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 16px 0' }}>Start with this schema — <span style={{ color: 'var(--brand)' }}>customize it in seconds.</span></h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '18px', marginBottom: '40px' }}>Generate, modify, and export to Prisma or Drizzle instantly.</p>
        <button onClick={() => navigate('/login')} style={{ background: 'var(--text-primary)', color: 'var(--canvas-bg)', padding: '16px 32px', borderRadius: '12px', fontSize: '1.2rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}>Open in editor</button>
      </section>

      <Footer />
    </div>
  );
}
