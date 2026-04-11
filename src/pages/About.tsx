import { useNavigate } from 'react-router-dom';
import { PublicNav } from '../components/layout/PublicNav';
import { Footer } from '../components/layout/Footer';
import { Zap, Code2, Database, Bot, CheckCircle2 } from 'lucide-react';

export function About() {
  const navigate = useNavigate();

  return (
    <div style={{ background: 'var(--canvas-bg)', color: 'var(--text-primary)', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'var(--sans)' }}>
      <PublicNav />
      
      {/* 1. Hero */}
      <section style={{ textAlign: 'center', padding: '100px 20px 64px' }}>
        <h1 style={{ fontSize: 'min(3.5rem, 8vw)', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 24px 0' }}>Built for developers who <span style={{ color: 'var(--brand)' }}>want to move fast</span></h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', margin: '0 auto 40px auto', maxWidth: '600px', lineHeight: 1.6 }}>
          Designing databases shouldn’t slow you down.
        </p>
      </section>

      {/* 2. Why this exists */}
      <section style={{ maxWidth: '800px', margin: '0 auto 100px', padding: '0 20px' }}>
        <h2 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '32px' }}>Why we built this</h2>
        <div style={{ fontSize: '18px', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <p style={{ marginBottom: '24px' }}>Designing a database today is still more painful than it should be.</p>
          <p style={{ marginBottom: '24px' }}>You switch between SQL, ORM docs, and diagram tools — trying to keep everything in sync.</p>
          <p style={{ marginBottom: '40px' }}>It breaks your flow. It wastes time. And the result is often messy.</p>
          
          <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '24px' }}>This platform was built to fix that.</p>
          <p style={{ marginBottom: '24px' }}>One place where you can:</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            <div style={{ background: 'var(--surface-base)', border: '1px solid var(--border-subtle)', padding: '24px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ color: 'var(--brand)' }}><Database size={24} /></div>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>design visually</span>
            </div>
            <div style={{ background: 'var(--surface-base)', border: '1px solid var(--border-subtle)', padding: '24px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ color: 'var(--brand)' }}><Code2 size={24} /></div>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>write code</span>
            </div>
            <div style={{ background: 'var(--surface-base)', border: '1px solid var(--border-subtle)', padding: '24px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ color: 'var(--brand)' }}><Bot size={24} /></div>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>generate with AI</span>
            </div>
          </div>
          
          <p style={{ fontWeight: 700, color: 'var(--brand)' }}>— all working together in real time.</p>
        </div>
      </section>

      {/* 3. Philosophy */}
      <section style={{ maxWidth: '800px', margin: '0 auto 100px', padding: '0 20px' }}>
        <h2 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '40px' }}>Our philosophy</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ color: 'var(--brand)' }}><Zap size={24} /></div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>1. Speed over complexity</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '18px' }}>Tools should help you think faster — not slow you down with configuration and friction.</p>
          </div>
          
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ color: 'var(--brand)' }}><Code2 size={24} /></div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>2. Developers first</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '18px' }}>Built for real workflows: Prisma, Drizzle, modern stacks. Not generic enterprise diagramming.</p>
          </div>
          
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ color: 'var(--brand)' }}><Database size={24} /></div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>3. One source of truth</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '18px' }}>Your schema should live in one place — not scattered across code, diagrams, and docs.</p>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ color: 'var(--brand)' }}><Bot size={24} /></div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>4. AI as a tool, not a gimmick</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '18px' }}>AI should actually build and improve your schema — not just autocomplete it.</p>
          </div>
        </div>
      </section>

      {/* 4. What makes this different */}
      <section style={{ maxWidth: '800px', margin: '0 auto 100px', padding: '0 20px', background: 'var(--surface-base)', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
        <div style={{ padding: '48px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '32px' }}>What makes this different</h2>
          <div style={{ fontSize: '18px', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            <p style={{ marginBottom: '24px' }}>Most tools force you into one way of working.</p>
            <p style={{ marginBottom: '24px', fontWeight: 600, color: 'var(--text-primary)' }}>This platform adapts to how you think:</p>
            
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><CheckCircle2 size={20} color="var(--brand)" /> <span><strong style={{ color: 'var(--text-primary)' }}>visual</strong> when you want clarity</span></li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><CheckCircle2 size={20} color="var(--brand)" /> <span><strong style={{ color: 'var(--text-primary)' }}>code</strong> when you want control</span></li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><CheckCircle2 size={20} color="var(--brand)" /> <span><strong style={{ color: 'var(--text-primary)' }}>AI</strong> when you want speed</span></li>
            </ul>
            
            <p style={{ fontWeight: 700, color: 'var(--brand)', margin: 0 }}>All perfectly in sync.</p>
          </div>
        </div>
      </section>

      {/* 5. Closing */}
      <section style={{ textAlign: 'center', padding: '100px 20px', background: 'var(--surface-base)', borderTop: '1px solid var(--border-subtle)', marginTop: 'auto' }}>
        <h2 style={{ fontSize: '40px', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 24px 0' }}>Build faster. <span style={{ color: 'var(--brand)' }}>Ship sooner.</span></h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '18px', marginBottom: '16px', maxWidth: '600px', margin: '0 auto 16px' }}>
          Whether you're building a side project or your next product, your database shouldn't be the bottleneck.
        </p>
        <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '18px', marginBottom: '40px' }}>Start with a better foundation.</p>
        <button onClick={() => navigate('/login')} style={{ background: 'var(--text-primary)', color: 'var(--canvas-bg)', padding: '16px 32px', borderRadius: '12px', fontSize: '1.2rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}>Start building free</button>
      </section>

      <Footer />
    </div>
  );
}
