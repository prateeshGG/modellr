import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Maximize2, Minimize2, ExternalLink, Database, History, Zap } from 'lucide-react';
import { Footer } from '../components/layout/Footer';
import { PublicNav } from '../components/layout/PublicNav';
import Editor from './Editor';

export default function Home() {
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <div style={{ background: 'var(--canvas-bg)', color: 'var(--text-primary)', minHeight: '100vh', overflowX: 'hidden', fontFamily: 'var(--sans)' }}>
      {/* Navigation */}
      <PublicNav />

      {/* Hero Section */}
      <header style={{ textAlign: 'center', padding: '120px 20px 80px', position: 'relative' }}>
        {/* Glow behind hero */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '800px', height: '800px', background: 'rgb(162, 107, 252)', filter: 'blur(200px)', opacity: 0.1, zIndex: 0, pointerEvents: 'none' }} />
        
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', background: 'var(--surface-base)', border: '1px solid var(--border-subtle)', borderRadius: '24px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, marginBottom: '24px', position: 'relative', zIndex: 1 }}>
          <span style={{ color: 'rgb(162, 107, 252)' }}>✦</span> Introducing SchemaForge 2.0
        </div>

        <h1 style={{ fontSize: 'min(4.5rem, 12vw)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.1, maxWidth: '900px', margin: '0 auto 1.5rem', position: 'relative', zIndex: 1 }}>
          Architect databases at the <span style={{ color: 'rgb(162, 107, 252)' }}>speed of thought.</span>
        </h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 2.5rem', lineHeight: 1.6, position: 'relative', zIndex: 1 }}>
          The multiplayer visual database designer. Drag, drop, and let our AI engine generate flawless SQL migrations instantly.
        </p>
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
          <button onClick={() => navigate('/login')} style={{ background: 'rgb(162, 107, 252)', color: '#fff', padding: '1rem 2rem', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 600, border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px 0 rgba(162, 107, 252, 0.4)' }}>Start building free</button>
          <button onClick={() => document.getElementById('sandbox-anchor')?.scrollIntoView({ behavior: 'smooth' })} style={{ background: 'transparent', color: 'var(--text-primary)', padding: '1rem 2rem', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 600, border: '0.5px solid var(--border-hi)', cursor: 'pointer' }}>Try guest sandbox</button>
        </div>
        <div style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-muted)', position: 'relative', zIndex: 1 }}>No credit card required. Invite 10 collaborators.</div>
      </header>

      <section id="sandbox-anchor" style={{ padding: '0 20px 80px', position: 'relative', zIndex: 2 }}>
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
      </section>

      {/* Stats Row */}
      <section style={{ borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-base)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-around', padding: '48px 20px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '36px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>2,400+</div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Schemas created</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '36px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>120+</div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Templates used</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '36px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>4.9/5</div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg satisfaction</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '36px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>12</div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dialects supported</div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '120px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', color: 'rgb(162, 107, 252)', textTransform: 'uppercase', marginBottom: '16px' }}>Features</div>
          <h2 style={{ fontSize: '40px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>Everything you need to ship faster</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '18px', marginTop: '16px' }}>Your database is the foundation of your product. We ensure its flawless by design.</p>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
          <div style={{ background: 'var(--surface-base)', padding: '32px', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ width: '48px', height: '48px', background: 'var(--surface-raised)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '24px', border: '1px solid var(--border-hi)' }}>🤖</div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>AI schema generation</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '15px' }}>Describe your app in plain English. Our AI understands context and instantly generates a production-ready relational schema bridging PK/FK loops naturally.</p>
          </div>

          <div style={{ background: 'var(--surface-base)', padding: '32px', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ width: '48px', height: '48px', background: 'var(--surface-raised)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', marginBottom: '24px', border: '1px solid var(--border-hi)' }}>👥</div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>Real-time collaboration</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '15px' }}>Invite your whole team. See cursors fly around the canvas natively via CRDT sync engines ensuring absolutely no merge conflicts on your structures.</p>
          </div>

          <div style={{ background: 'var(--surface-base)', padding: '32px', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ width: '48px', height: '48px', background: 'var(--surface-raised)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgb(162, 107, 252)', marginBottom: '24px', border: '1px solid var(--border-hi)' }}><Zap size={24} /></div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>Instant export / Migrations</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '15px' }}>Push code instantly. Compare canvas snapshots directly against each other and output explicitly formatted `ALTER TABLE` SQL migrations intuitively.</p>
          </div>
          
          <div style={{ background: 'var(--surface-base)', padding: '32px', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ width: '48px', height: '48px', background: 'var(--surface-raised)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgb(162, 107, 252)', marginBottom: '24px', border: '1px solid var(--border-hi)' }}><Database size={24} /></div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>1-click live introspection</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '15px' }}>Paste a postgres connection string directly into our tool and instantly visualize your production schema entirely rebuilt via `information_schema`.</p>
          </div>

          <div style={{ background: 'var(--surface-base)', padding: '32px', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ width: '48px', height: '48px', background: 'var(--surface-raised)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgb(162, 107, 252)', marginBottom: '24px', border: '1px solid var(--border-hi)' }}><ExternalLink size={24} /></div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>Cross-domain ORM native</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '15px' }}>Export your canvas directly into formatted `schema.prisma` files, Drizzle ORM schema mappings, TypeORM entity blocks, or native dbml codes seamlessly.</p>
          </div>

          <div style={{ background: 'var(--surface-base)', padding: '32px', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ width: '48px', height: '48px', background: 'var(--surface-raised)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgb(162, 107, 252)', marginBottom: '24px', border: '1px solid var(--border-hi)' }}><History size={24} /></div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>Time-travel snapshots</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '15px' }}>Our robust zundo-based snapshot framework takes point-in-time pictures. Instantly restore or rewrite history if your layout gets too cluttered dynamically.</p>
          </div>
        </div>
      </section>

      {/* How it works grid */}
      <section style={{ maxWidth: '1200px', margin: '0 auto 120px', padding: '0 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', color: 'rgb(162, 107, 252)', textTransform: 'uppercase', marginBottom: '16px' }}>HOW IT WORKS</div>
          <h2 style={{ fontSize: '40px', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>From idea to production in three steps</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
          <div style={{ padding: '32px', border: '1px solid var(--border-subtle)', borderRadius: '16px', position: 'relative' }}>
            <div style={{ background: 'var(--text-primary)', color: 'var(--canvas-bg)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, marginBottom: '24px' }}>1</div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>Use AI to get a first draft</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '15px' }}>Type out what you want your app to do. The SchemaForge AI instantly spins up the foundational schema and relationships directly into the canvas.</p>
          </div>
          <div style={{ padding: '32px', border: '1px solid var(--border-subtle)', borderRadius: '16px', position: 'relative' }}>
            <div style={{ background: 'var(--text-primary)', color: 'var(--canvas-bg)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, marginBottom: '24px' }}>2</div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>Tweak visually & share</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '15px' }}>Drag fields between tables, manage relationships instantly without typing a single DROP TABLE command. Invite teammates to rubber-duck the architecture live.</p>
          </div>
          <div style={{ padding: '32px', border: '1px solid var(--border-subtle)', borderRadius: '16px', position: 'relative' }}>
            <div style={{ background: 'var(--text-primary)', color: 'var(--canvas-bg)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, marginBottom: '24px' }}>3</div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>Export natively and deploy</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '15px' }}>Generate exact alter table structures by running a diff against your existing state, then export raw DDL Postgres blocks or Prisma arrays for your ORM natively.</p>
          </div>
        </div>
      </section>

      {/* Mini-Pricing */}
      <section style={{ maxWidth: '1000px', margin: '0 auto 120px', padding: '0 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', color: 'rgb(162, 107, 252)', textTransform: 'uppercase', marginBottom: '16px' }}>PRICING</div>
        <h2 style={{ fontSize: '40px', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 16px 0' }}>Simple, honest pricing</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '18px', marginBottom: '48px' }}>Start free, upgrade when your team grows.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', textAlign: 'left', marginBottom: '48px' }}>
          <div style={{ background: 'var(--surface-base)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '32px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>FREE</div>
            <div style={{ fontSize: '48px', fontWeight: 800, marginBottom: '24px' }}>$0 <span style={{ fontSize: '16px', fontWeight: 400, color: 'var(--text-secondary)' }}>/mo</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '15px' }}>
              <div style={{ display: 'flex', gap: '12px' }}><span style={{ color: 'rgb(162, 107, 252)' }}>✓</span> 3 saved schemas</div>
              <div style={{ display: 'flex', gap: '12px' }}><span style={{ color: 'rgb(162, 107, 252)' }}>✓</span> Unlimited canvas editing</div>
              <div style={{ display: 'flex', gap: '12px' }}><span style={{ color: 'rgb(162, 107, 252)' }}>✓</span> SQL + DBML export</div>
              <div style={{ display: 'flex', gap: '12px' }}><span style={{ color: 'rgb(162, 107, 252)' }}>✓</span> AI generation (10/day)</div>
            </div>
            <button onClick={() => navigate('/login')} style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px solid var(--border-hi)', color: 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, marginTop: '32px' }}>Start free</button>
          </div>
          
          <div style={{ background: 'var(--surface-base)', border: '2px solid rgb(162, 107, 252)', borderRadius: '16px', padding: '32px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '-14px', right: '32px', background: 'rgb(162, 107, 252)', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '12px', letterSpacing: '0.05em' }}>MOST POPULAR</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'rgb(162, 107, 252)', marginBottom: '8px' }}>PRO (Developer)</div>
            <div style={{ fontSize: '48px', fontWeight: 800, marginBottom: '24px' }}>$12 <span style={{ fontSize: '16px', fontWeight: 400, color: 'var(--text-secondary)' }}>/mo</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '15px' }}>
              <div style={{ display: 'flex', gap: '12px' }}><span style={{ color: 'rgb(162, 107, 252)' }}>✓</span> Unlimited schemas</div>
              <div style={{ display: 'flex', gap: '12px' }}><span style={{ color: 'rgb(162, 107, 252)' }}>✓</span> All exports + Prisma/Drizzle</div>
              <div style={{ display: 'flex', gap: '12px' }}><span style={{ color: 'rgb(162, 107, 252)' }}>✓</span> Chat-to-Modify AI (Unlimited)</div>
              <div style={{ display: 'flex', gap: '12px' }}><span style={{ color: 'rgb(162, 107, 252)' }}>✓</span> MCP server access (Phase 5)</div>
            </div>
            <button onClick={() => navigate('/pricing')} style={{ width: '100%', padding: '12px', background: 'rgb(162, 107, 252)', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, marginTop: '32px' }}>Upgrade to Pro</button>
          </div>
        </div>
        <button onClick={() => navigate('/pricing')} style={{ background: 'transparent', border: 'none', color: 'rgb(162, 107, 252)', fontWeight: 600, cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: '0 auto' }}>
          See all pricing features <span>→</span>
        </button>
      </section>

      {/* FAQs */}
      <section style={{ maxWidth: '800px', margin: '0 auto 120px', padding: '0 20px' }}>
        <h2 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '48px', textAlign: 'center' }}>Common questions</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ padding: '24px', borderBottom: '1px solid var(--border-subtle)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 12px 0' }}>Is there a free tier for non-commercial use?</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Yes! The free tier perfectly encompasses standard academic sizes. You are permanently free for 3 active schemas running simultaneously across our entire suite containing all generic exports.</p>
          </div>
          <div style={{ padding: '24px', borderBottom: '1px solid var(--border-subtle)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 12px 0' }}>Do you store our connection strings for Live DB inspection?</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Never. Connection strings execute instantly securely on isolated API routes using node mapping. We extract the <code style={{ color: 'var(--text-primary)' }}>information_schema</code> tree via JSON dump arrays and immediately burn the TCP line.</p>
          </div>
          <div style={{ padding: '24px', borderBottom: '1px solid var(--border-subtle)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 12px 0' }}>What is the SchemaForge MCP?</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Phase 5 empowers developer tools like Cursor and Windsurf to inject your raw SQL designs explicitly into the Chat completions, giving autonomous AI deep understanding of relations intrinsically bypassing file limitations securely.</p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section style={{ textAlign: 'center', padding: '120px 20px', background: 'var(--surface-base)', borderTop: '1px solid var(--border-subtle)' }}>
        <h2 style={{ fontSize: '48px', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 16px 0' }}>Start building your <br /><span style={{ color: 'rgb(162, 107, 252)' }}>next database now.</span></h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '18px', marginBottom: '40px' }}>Free forever. No credit card required to start.</p>
        <button onClick={() => navigate('/login')} style={{ background: 'var(--text-primary)', color: 'var(--canvas-bg)', padding: '16px 32px', borderRadius: '12px', fontSize: '1.2rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}>Start building free →</button>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
