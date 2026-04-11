import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Maximize2, Minimize2, ExternalLink, Bot, Eye, Code2, Users, Share2, Layers, RefreshCw, Box, History as HistoryIcon, Zap } from 'lucide-react';
import { Footer } from '../components/layout/Footer';
import { PublicNav } from '../components/layout/PublicNav';
import Editor from './Editor';

export default function Home() {
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <div style={{ background: 'var(--canvas-bg)', color: 'var(--text-primary)', minHeight: '100vh', overflowX: 'hidden', fontFamily: 'var(--sans)' }}>
      <PublicNav />

      {/* 1. Hero Section */}
      <header style={{ textAlign: 'center', padding: '120px 20px 80px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '800px', height: '800px', background: 'var(--brand)', filter: 'blur(200px)', opacity: 0.1, zIndex: 0, pointerEvents: 'none' }} />
        
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', background: 'var(--surface-base)', border: '1px solid var(--border-subtle)', borderRadius: '24px', color: 'var(--brand)', fontSize: '13px', fontWeight: 600, marginBottom: '24px', position: 'relative', zIndex: 1 }}>
          An AI-first database design tool built for modern developers
        </div>

        <h1 style={{ fontSize: 'min(4.2rem, 11vw)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.1, maxWidth: '900px', margin: '0 auto 1.5rem', position: 'relative', zIndex: 1 }}>
          Generate production-ready schemas from a <span style={{ color: 'var(--brand)' }}>single prompt.</span>
        </h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', maxWidth: '650px', margin: '0 auto 2.5rem', lineHeight: 1.6, position: 'relative', zIndex: 1 }}>
          Visualize, write, or generate schemas with AI — then ship directly to Prisma or Drizzle.
        </p>
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
          <button onClick={() => navigate('/login')} style={{ background: 'var(--brand)', color: '#fff', padding: '1rem 2rem', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 600, border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px 0 rgba(var(--brand-rgb), 0.4)' }}>
            Start building free
          </button>
          <button onClick={() => document.getElementById('demo-anchor')?.scrollIntoView({ behavior: 'smooth' })} style={{ background: 'transparent', color: 'var(--text-primary)', padding: '1rem 2rem', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 600, border: '0.5px solid var(--border-hi)', cursor: 'pointer' }}>
            See how it works
          </button>
        </div>
        <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-muted)', position: 'relative', zIndex: 1 }}>
          No signup required. Start instantly in your browser.
        </div>
      </header>

      {/* 2. Conversion Trigger Section (Demo) - Moved Up */}
      <section id="demo-anchor" style={{ padding: '40px 20px 120px', position: 'relative', zIndex: 2 }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 24px 0' }}>From idea → schema in seconds</h2>
          
          <div style={{ background: 'var(--surface-base)', padding: '16px 24px', borderRadius: '12px', border: '1px solid var(--border-subtle)', display: 'inline-flex', alignItems: 'center', gap: '12px', margin: '0 auto', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <Bot size={20} color="var(--brand)" />
            <code style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: 600, fontFamily: 'var(--mono)' }}>
              "Build a SaaS schema with users, billing, and analytics"
            </code>
          </div>
        </div>
        
        <div style={{ 
          margin: '0 auto',
          ...(isFullscreen ? {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            height: '100vh',
            width: '100vw',
            zIndex: 9999,
            borderRadius: 0,
          } : {
            maxWidth: '1200px', 
            height: '600px', 
            borderRadius: '16px',
          }),
          overflow: 'hidden', 
          border: isFullscreen ? 'none' : '1px solid var(--border-subtle)', 
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          background: 'var(--surface-base)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          {/* Glass header for the mock window */}
          <div style={{ height: '40px', background: 'var(--surface-raised)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#EF4444' }} />
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#F59E0B' }} />
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10B981' }} />
              <span style={{ marginLeft: '12px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Live Sandbox — Try editing!</span>
            </div>
            <button 
              onClick={() => setIsFullscreen(!isFullscreen)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '4px' }}
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
          {/* The sandbox itself */}
          <div style={{ height: 'calc(100% - 40px)', width: '100%', position: 'relative' }}>
             <Editor isSandbox={true} />
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '32px', fontSize: '18px', fontWeight: 600, color: 'var(--text-secondary)' }}>
          <span style={{ color: 'var(--brand)', marginRight: '8px' }}>→</span> 15 tables generated instantly. Fully linked. Ready to export.
        </div>
      </section>

      {/* 3. "Why this exists" Section */}
      <section style={{ maxWidth: '800px', margin: '0 auto 100px', padding: '0 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '36px', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 24px' }}>Stop wasting time designing schemas</h2>
        <div style={{ fontSize: '18px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
          <p style={{ marginBottom: '16px' }}>Designing a database today means jumping between SQL, ORM docs, and clunky diagram tools.</p>
          <p style={{ marginBottom: '16px' }}>You lose time. You lose clarity. And your schema still ends up messy.</p>
          <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '20px', marginTop: '24px' }}>Stop wasting time switching between tools.</p>
        </div>
      </section>

      {/* 4. "Why this is different" Section (NEW) */}
      <section style={{ background: 'var(--surface-base)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '100px 20px' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <h2 style={{ fontSize: '40px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>Built for modern stacks — not outdated workflows</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '18px', marginTop: '16px' }}>Why struggle with legacy visual tools when you can just build?</p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '48px' }}>
            <div>
              <div style={{ color: 'var(--brand)', marginBottom: '16px' }}><Zap size={32} /></div>
              <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '12px' }}>Prisma & Drizzle First</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '16px' }}>Stop handwriting ORM schemas. We treat modern TypeScript ORMs as first-class citizens, not afterthoughts.</p>
            </div>
            
            <div>
              <div style={{ color: 'var(--brand)', marginBottom: '16px' }}><Bot size={32} /></div>
              <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '12px' }}>AI Deeply Integrated</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '16px' }}>AI isn't a bolt-on gimmick. It's built into the core to analyze relationships, suggest indexes, and write boilerplate for you.</p>
            </div>

            <div>
              <div style={{ color: 'var(--brand)', marginBottom: '16px' }}><Layers size={32} /></div>
              <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '12px' }}>No Manual Diagram Mess</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '16px' }}>Never waste 20 minutes untangling lines again. Our auto-layout engine perfectly organizes complex relation trees instantly.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Core Differentiation */}
      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '120px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <h2 style={{ fontSize: '40px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>One tool. Three ways to build.</h2>
          <p style={{ color: 'var(--brand)', fontWeight: 600, fontSize: '18px', marginTop: '16px' }}>The only tool where AI, code, and visual design are fully synchronized.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
          <div style={{ padding: '32px', border: '1px solid var(--border-subtle)', borderRadius: '16px', background: 'var(--surface-base)' }}>
            <div style={{ background: 'rgba(var(--brand-rgb), 0.1)', color: 'var(--brand)', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}><Eye /></div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>Visual</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '15px' }}>Design with a clean, auto-layout canvas.</p>
          </div>
          <div style={{ padding: '32px', border: '1px solid var(--border-subtle)', borderRadius: '16px', background: 'var(--surface-base)' }}>
            <div style={{ background: 'rgba(var(--brand-rgb), 0.1)', color: 'var(--brand)', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}><Code2 /></div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>Code</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '15px' }}>Write DBML or SQL with instant preview.</p>
          </div>
          <div style={{ padding: '32px', border: '1px solid var(--border-subtle)', borderRadius: '16px', background: 'var(--surface-base)' }}>
            <div style={{ background: 'rgba(var(--brand-rgb), 0.1)', color: 'var(--brand)', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}><Bot /></div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>AI</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '15px' }}>Describe your system — get a full schema instantly.</p>
          </div>
        </div>
      </section>

      {/* 6. Feature -> Outcome */}
      <section style={{ maxWidth: '1200px', margin: '0 auto 120px', padding: '0 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <h2 style={{ fontSize: '40px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>Built for how developers actually work</h2>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
          <div style={{ background: 'var(--surface-base)', padding: '32px', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ width: '48px', height: '48px', background: 'rgba(var(--brand-rgb), 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand)', marginBottom: '24px' }}><Bot size={24} /></div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>AI Schema Generation</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '15px' }}>Generate complete schemas — not just tables, but relationships, indexes, and structure mapped perfectly.</p>
          </div>

          <div style={{ background: 'var(--surface-base)', padding: '32px', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ width: '48px', height: '48px', background: 'rgba(var(--brand-rgb), 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand)', marginBottom: '24px' }}><RefreshCw size={24} /></div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>Real-Time Sync</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '15px' }}>Code, canvas, and AI — perfectly in sync. No switching tools. No mental overhead.</p>
          </div>

          <div style={{ background: 'var(--surface-base)', padding: '32px', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ width: '48px', height: '48px', background: 'rgba(var(--brand-rgb), 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand)', marginBottom: '24px' }}><ExternalLink size={24} /></div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>Modern Exports</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '15px' }}>Export production-ready Prisma or Drizzle code in one click.</p>
          </div>
          
          <div style={{ background: 'var(--surface-base)', padding: '32px', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ width: '48px', height: '48px', background: 'rgba(var(--brand-rgb), 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand)', marginBottom: '24px' }}><Layers size={24} /></div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>Auto Layout</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '15px' }}>Never manually untangle diagrams again. Clean, readable schemas — automatically.</p>
          </div>

          <div style={{ background: 'var(--surface-base)', padding: '32px', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ width: '48px', height: '48px', background: 'rgba(var(--brand-rgb), 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand)', marginBottom: '24px' }}><Share2 size={24} /></div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>Collaboration</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '15px' }}>Share and explain your system easily with real-time cursors and read-only links.</p>
          </div>

          <div style={{ background: 'var(--surface-base)', padding: '32px', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ width: '48px', height: '48px', background: 'rgba(var(--brand-rgb), 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand)', marginBottom: '24px' }}><HistoryIcon size={24} /></div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>Version History</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '15px' }}>Experiment without fear. Snapshots and diffs let you roll back anytime instantly.</p>
          </div>
        </div>
      </section>

      {/* 7. Use Cases */}
      <section style={{ background: 'var(--surface-base)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '120px 20px' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <h2 style={{ fontSize: '40px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>Built for real workflows</h2>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '48px' }}>
            <div>
              <div style={{ color: 'var(--brand)', marginBottom: '16px' }}><Box size={32} /></div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>For Indie Hackers</div>
              <h3 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px' }}>Launch your SaaS without overthinking your database</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '16px' }}>Generate auth, users, billing schemas instantly.</p>
            </div>
            
            <div>
              <div style={{ color: 'var(--brand)', marginBottom: '16px' }}><Code2 size={32} /></div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>For Developers</div>
              <h3 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px' }}>Avoid painful schema refactors later</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '16px' }}>Design clearly before you write a single line of backend code.</p>
            </div>

            <div>
              <div style={{ color: 'var(--brand)', marginBottom: '16px' }}><Users size={32} /></div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>For Client Work</div>
              <h3 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px' }}>Communicate clearly</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '16px' }}>Share beautiful diagrams with stakeholders easily.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Pricing Copy */}
      <section style={{ maxWidth: '1000px', margin: '0 auto 120px', padding: '120px 20px 0', textAlign: 'center' }}>
        <div style={{ color: 'var(--brand)', fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>
          Used by developers to save hours of schema design every week
        </div>
        <h2 style={{ fontSize: '40px', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 16px 0' }}>Simple, honest pricing</h2>
        <p style={{ color: 'var(--text-primary)', fontSize: '20px', marginBottom: '48px', fontWeight: 700 }}>If this saves you even 2 hours, it pays for itself.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', textAlign: 'left' }}>
          <div style={{ background: 'var(--surface-base)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '40px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>Free</div>
            <div style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '32px' }}>Start building instantly.</div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '16px', flexGrow: 1, marginBottom: '40px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}><span style={{ color: 'var(--brand)' }}>✓</span> Unlimited editing</div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}><span style={{ color: 'var(--brand)' }}>✓</span> 3 saved schemas</div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}><span style={{ color: 'var(--brand)' }}>✓</span> SQL / DBML export</div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}><span style={{ color: 'var(--brand)' }}>✓</span> Limited AI usage</div>
            </div>
            
            <button onClick={() => navigate('/login')} style={{ width: '100%', padding: '14px', background: 'transparent', border: '1px solid var(--border-hi)', color: 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '16px' }}>Start free</button>
          </div>
          
          <div style={{ background: 'var(--surface-base)', border: '2px solid var(--brand)', borderRadius: '16px', padding: '40px', position: 'relative', display: 'flex', flexDirection: 'column' }}>
            <div style={{ position: 'absolute', top: '-14px', right: '32px', background: 'var(--brand)', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '12px', letterSpacing: '0.05em' }}>MOST POPULAR</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
              <div style={{ fontSize: '24px', fontWeight: 800 }}>Pro</div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-secondary)' }}>$15<span style={{ fontSize: '14px', fontWeight: 400 }}>/mo</span></div>
            </div>
            
            <div style={{ fontSize: '16px', color: 'var(--brand)', fontWeight: 600, marginBottom: '32px' }}>Everything you need to ship faster.</div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '16px', flexGrow: 1, marginBottom: '40px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}><span style={{ color: 'var(--brand)' }}>✓</span> Unlimited schemas</div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}><span style={{ color: 'var(--brand)' }}>✓</span> Prisma & Drizzle export</div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}><span style={{ color: 'var(--brand)' }}>✓</span> Full AI capabilities</div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}><span style={{ color: 'var(--brand)' }}>✓</span> Version history</div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}><span style={{ color: 'var(--brand)' }}>✓</span> Collaboration</div>
            </div>
            
            <button onClick={() => navigate('/pricing')} style={{ width: '100%', padding: '14px', background: 'var(--brand)', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '16px' }}>Upgrade to Pro</button>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section style={{ textAlign: 'center', padding: '100px 20px', background: 'var(--surface-base)', borderTop: '1px solid var(--border-subtle)' }}>
        <h2 style={{ fontSize: '48px', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 16px 0' }}>Design your database in <br /><span style={{ color: 'var(--brand)' }}>minutes — not hours.</span></h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '18px', marginBottom: '40px' }}>Free forever. No credit card required to start.</p>
        <button onClick={() => navigate('/login')} style={{ background: 'var(--text-primary)', color: 'var(--canvas-bg)', padding: '16px 32px', borderRadius: '12px', fontSize: '1.2rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}>Start building free →</button>
      </section>

      <Footer />
    </div>
  );
}
