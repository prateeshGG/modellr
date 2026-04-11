import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PublicNav } from '../../components/layout/PublicNav';
import { Footer } from '../../components/layout/Footer';
import { Check, X, ArrowRight, Bot, Code2, Sparkles, LayoutTemplate } from 'lucide-react';

export function DbdiagramCompare() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "dbdiagram vs SchemaForge: Which is better in 2026?";
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', 'dbdiagram alternative, database design tool prisma, ai database schema generator');
  }, []);

  return (
    <div style={{ background: 'var(--canvas-bg)', color: 'var(--text-primary)', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'var(--sans)' }}>
      <PublicNav />
      
      {/* 1. Hero */}
      <section style={{ textAlign: 'center', padding: '100px 20px 64px' }}>
        <h1 style={{ fontSize: 'min(3.5rem, 8vw)', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 24px 0' }}>dbdiagram vs SchemaForge</h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', margin: '0 auto 40px auto', maxWidth: '700px', lineHeight: 1.6 }}>
          dbdiagram is great for simple diagrams. <br />But modern workflows need more than static DBML.
        </p>
        <button onClick={() => navigate('/login')} style={{ background: 'var(--brand)', color: '#fff', padding: '16px 32px', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px 0 rgba(var(--brand-rgb), 0.4)' }}>
          Try it free
        </button>
      </section>

      {/* 2. Why Switch */}
      <section style={{ maxWidth: '1000px', margin: '0 auto 100px', padding: '40px 20px' }}>
        <h2 style={{ fontSize: '36px', fontWeight: 800, letterSpacing: '-0.02em', textAlign: 'center', marginBottom: '64px' }}>Why developers are moving beyond dbdiagram</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '64px' }}>
          {/* Reason 1 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ background: 'rgba(var(--brand-rgb), 0.1)', color: 'var(--brand)', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LayoutTemplate size={20} /></div>
                <h3 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>1. From static diagrams → interactive workflows</h3>
              </div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '16px', marginBottom: '16px' }}>dbdiagram is primarily code-first with limited interaction. You get diagrams — but not a full design workflow.</p>
              <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '16px', marginBottom: '16px' }}>SchemaForge lets you:</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px', color: 'var(--text-secondary)' }}>
                <li style={{ display: 'flex', gap: '12px' }}><ArrowRight size={20} color="var(--brand)" /> visually design</li>
                <li style={{ display: 'flex', gap: '12px' }}><ArrowRight size={20} color="var(--brand)" /> write code</li>
                <li style={{ display: 'flex', gap: '12px' }}><ArrowRight size={20} color="var(--brand)" /> generate with AI</li>
              </ul>
              <p style={{ color: 'var(--brand)', fontWeight: 700, marginTop: '16px' }}>— all in sync.</p>
            </div>
            <div style={{ background: 'var(--surface-base)', borderRadius: '16px', padding: '32px', border: '1px solid var(--border-subtle)', textAlign: 'center', color: 'var(--text-muted)' }}>
              Interactive Canvas + Code + AI
            </div>
          </div>

          {/* Reason 2 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', alignItems: 'center' }}>
            <div style={{ order: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ background: 'rgba(var(--brand-rgb), 0.1)', color: 'var(--brand)', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Code2 size={20} /></div>
                <h3 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>2. Built for modern stacks</h3>
              </div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '16px', marginBottom: '16px' }}>dbdiagram focuses on DBML and SQL.</p>
              <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '16px', marginBottom: '16px' }}>Modern developers use Prisma and Drizzle.</p>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '16px' }}>Here, you export directly to your stack — no manual rewriting.</p>
            </div>
            <div style={{ order: 1, background: 'var(--surface-base)', borderRadius: '16px', padding: '32px', border: '1px solid var(--border-subtle)', textAlign: 'center', color: 'var(--text-muted)' }}>
              Native exports to Prisma & Drizzle
            </div>
          </div>

          {/* Reason 3 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ background: 'rgba(var(--brand-rgb), 0.1)', color: 'var(--brand)', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Sparkles size={20} /></div>
                <h3 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>3. AI that actually builds schemas</h3>
              </div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '16px', marginBottom: '16px' }}>dbdiagram doesn't help you design.</p>
              <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '16px', marginBottom: '16px' }}>SchemaForge lets you:</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px', color: 'var(--text-secondary)' }}>
                <li style={{ display: 'flex', gap: '12px' }}><ArrowRight size={20} color="var(--brand)" /> generate full schemas from prompts</li>
                <li style={{ display: 'flex', gap: '12px' }}><ArrowRight size={20} color="var(--brand)" /> modify tables using AI</li>
                <li style={{ display: 'flex', gap: '12px' }}><ArrowRight size={20} color="var(--brand)" /> analyze relationships automatically</li>
              </ul>
            </div>
            <div style={{ background: 'var(--surface-base)', borderRadius: '16px', padding: '32px', border: '1px solid var(--border-subtle)', textAlign: 'center', color: 'var(--text-muted)' }}>
              Direct natural language prompt to schema
            </div>
          </div>
        </div>
      </section>

      {/* 3. Who Should Use What */}
      <section style={{ maxWidth: '800px', margin: '0 auto 100px', padding: '0 20px' }}>
        <h2 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em', textAlign: 'center', marginBottom: '40px' }}>Who should use what?</h2>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 300px', background: 'var(--surface-base)', borderRadius: '16px', padding: '32px', border: '1px solid var(--border-subtle)' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>Use dbdiagram if:</h3>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', color: 'var(--text-secondary)' }}>
              <ArrowRight size={20} style={{ minWidth: '20px' }} />
              <div>you only need basic DBML diagrams.</div>
            </div>
          </div>
          <div style={{ flex: '1 1 300px', background: 'rgba(var(--brand-rgb), 0.05)', borderRadius: '16px', padding: '32px', border: '1px solid rgba(var(--brand-rgb), 0.2)' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px', color: 'var(--brand)' }}>Use SchemaForge if:</h3>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', color: 'var(--text-primary)', fontWeight: 500 }}>
              <ArrowRight size={20} color="var(--brand)" style={{ minWidth: '20px' }} />
              <div>you want AI generation, modern workflow sync, and direct Prisma/Drizzle exports.</div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Feature Comparison */}
      <section style={{ maxWidth: '900px', margin: '0 auto 120px', padding: '0 20px' }}>
        <h2 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em', textAlign: 'center', marginBottom: '40px' }}>Feature comparison</h2>
        <div style={{ background: 'var(--surface-base)', borderRadius: '16px', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '15px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-raised)' }}>
                <th style={{ padding: '24px', fontWeight: 700 }}>Feature</th>
                <th style={{ padding: '24px', fontWeight: 700, width: '25%', textAlign: 'center', color: 'var(--text-secondary)' }}>dbdiagram</th>
                <th style={{ padding: '24px', fontWeight: 700, width: '25%', textAlign: 'center', color: 'var(--brand)' }}>SchemaForge</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '20px 24px', fontWeight: 500 }}>Visual editor</td>
                <td style={{ padding: '20px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Limited</td>
                <td style={{ padding: '20px 24px', textAlign: 'center', fontWeight: 600 }}>Advanced canvas</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '20px 24px', fontWeight: 500 }}>Code editor (DBML)</td>
                <td style={{ padding: '20px 24px', textAlign: 'center' }}><Check size={20} color="var(--text-secondary)" style={{ margin: '0 auto' }} /></td>
                <td style={{ padding: '20px 24px', textAlign: 'center' }}><Check size={20} color="var(--brand)" style={{ margin: '0 auto' }} /></td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '20px 24px', fontWeight: 500 }}>AI schema generation</td>
                <td style={{ padding: '20px 24px', textAlign: 'center' }}><X size={20} color="var(--text-muted)" style={{ margin: '0 auto' }} /></td>
                <td style={{ padding: '20px 24px', textAlign: 'center' }}><Check size={20} color="var(--brand)" style={{ margin: '0 auto' }} /></td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '20px 24px', fontWeight: 500 }}>AI modify schema</td>
                <td style={{ padding: '20px 24px', textAlign: 'center' }}><X size={20} color="var(--text-muted)" style={{ margin: '0 auto' }} /></td>
                <td style={{ padding: '20px 24px', textAlign: 'center' }}><Check size={20} color="var(--brand)" style={{ margin: '0 auto' }} /></td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '20px 24px', fontWeight: 500 }}>Prisma export</td>
                <td style={{ padding: '20px 24px', textAlign: 'center' }}><X size={20} color="var(--text-muted)" style={{ margin: '0 auto' }} /></td>
                <td style={{ padding: '20px 24px', textAlign: 'center' }}><Check size={20} color="var(--brand)" style={{ margin: '0 auto' }} /></td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '20px 24px', fontWeight: 500 }}>Drizzle export</td>
                <td style={{ padding: '20px 24px', textAlign: 'center' }}><X size={20} color="var(--text-muted)" style={{ margin: '0 auto' }} /></td>
                <td style={{ padding: '20px 24px', textAlign: 'center' }}><Check size={20} color="var(--brand)" style={{ margin: '0 auto' }} /></td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '20px 24px', fontWeight: 500 }}>Auto layout</td>
                <td style={{ padding: '20px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Basic</td>
                <td style={{ padding: '20px 24px', textAlign: 'center', fontWeight: 600 }}>Advanced</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '20px 24px', fontWeight: 500 }}>Collaboration</td>
                <td style={{ padding: '20px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Limited</td>
                <td style={{ padding: '20px 24px', textAlign: 'center', fontWeight: 600 }}>Real-time</td>
              </tr>
              <tr>
                <td style={{ padding: '20px 24px', fontWeight: 500 }}>Version history</td>
                <td style={{ padding: '20px 24px', textAlign: 'center' }}><Check size={20} color="var(--text-secondary)" style={{ margin: '0 auto' }} /></td>
                <td style={{ padding: '20px 24px', textAlign: 'center' }}><Check size={20} color="var(--brand)" style={{ margin: '0 auto' }} /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. Demo Section */}
      <section style={{ maxWidth: '800px', margin: '0 auto 100px', padding: '0 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '24px' }}>See the difference</h2>
        <p style={{ color: 'var(--text-primary)', fontSize: '18px', marginBottom: '32px' }}>Instead of writing everything manually, just describe your system:</p>
        
        <div style={{ background: 'var(--surface-base)', padding: '16px 24px', borderRadius: '12px', border: '1px solid var(--border-subtle)', display: 'inline-flex', alignItems: 'center', gap: '12px', margin: '0 auto 32px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <Bot size={20} color="var(--brand)" />
          <code style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: 600, fontFamily: 'var(--mono)' }}>
            "Build a SaaS schema with users, billing, and analytics"
          </code>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ArrowRight size={16} color="var(--brand)"/> Full schema generated instantly</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ArrowRight size={16} color="var(--brand)"/> Relationships mapped automatically</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ArrowRight size={16} color="var(--brand)"/> Ready to export to Prisma or Drizzle</div>
        </div>
      </section>

      {/* 6. Positioning Punch & Final CTA */}
      <section style={{ textAlign: 'center', padding: '100px 20px', background: 'var(--surface-base)', borderTop: '1px solid var(--border-subtle)', marginTop: 'auto' }}>
        <h2 style={{ fontSize: '40px', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 40px 0' }}>Not just diagrams — a complete workflow</h2>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '48px', marginBottom: '64px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>
            dbdiagram helps you visualize.
          </div>
          <div style={{ fontSize: '18px', color: 'var(--text-primary)', fontWeight: 700 }}>
            SchemaForge helps you design, generate, and ship.
          </div>
        </div>

        <h3 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 24px 0' }}>Try a faster way to design databases</h3>
        <button onClick={() => navigate('/login')} style={{ background: 'var(--brand)', color: '#fff', padding: '16px 32px', borderRadius: '12px', fontSize: '1.2rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}>Start building free</button>
      </section>

      <Footer />
    </div>
  );
}
