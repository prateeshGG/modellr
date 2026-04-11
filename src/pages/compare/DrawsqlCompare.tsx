import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PublicNav } from '../../components/layout/PublicNav';
import { Footer } from '../../components/layout/Footer';
import { Check, X, ArrowRight, Bot, PenTool, Focus, Workflow } from 'lucide-react';

export function DrawsqlCompare() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "DrawSQL alternative for modern developers";
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', 'drawsql alternative, database design tool prisma, ai database schema generator');
  }, []);

  return (
    <div style={{ background: 'var(--canvas-bg)', color: 'var(--text-primary)', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'var(--sans)' }}>
      <PublicNav />

      {/* 1. Hero */}
      <section style={{ textAlign: 'center', padding: '100px 20px 64px' }}>
        <h1 style={{ fontSize: 'min(3.5rem, 8vw)', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 24px 0' }}>DrawSQL vs Modellr</h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', margin: '0 auto 40px auto', maxWidth: '700px', lineHeight: 1.6 }}>
          DrawSQL is great for visual diagrams. <br />But modern development needs more than drag-and-drop.
        </p>
        <button onClick={() => navigate('/login')} style={{ background: 'var(--brand)', color: '#fff', padding: '16px 32px', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px 0 rgba(var(--brand-rgb), 0.4)' }}>
          Try it free
        </button>
      </section>

      {/* 2. Why Switch */}
      <section style={{ maxWidth: '1000px', margin: '0 auto 100px', padding: '40px 20px' }}>
        <h2 style={{ fontSize: '36px', fontWeight: 800, letterSpacing: '-0.02em', textAlign: 'center', marginBottom: '64px' }}>Why developers are switching from DrawSQL</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '64px' }}>

          {/* Reason 1 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ background: 'rgba(var(--brand-rgb), 0.1)', color: 'var(--brand)', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><PenTool size={20} /></div>
                <h3 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>1. No more manual diagram building</h3>
              </div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '16px', marginBottom: '16px' }}>DrawSQL requires manual effort:</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px 0', display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-secondary)' }}>
                <li style={{ display: 'flex', gap: '12px' }}><ArrowRight size={16} /> adding tables</li>
                <li style={{ display: 'flex', gap: '12px' }}><ArrowRight size={16} /> connecting relationships</li>
                <li style={{ display: 'flex', gap: '12px' }}><ArrowRight size={16} /> organizing layout</li>
              </ul>
              <p style={{ color: 'var(--brand)', fontWeight: 700 }}>Modellr automates all of that.</p>
            </div>
            <div style={{ background: 'var(--surface-base)', borderRadius: '16px', padding: '32px', border: '1px solid var(--border-subtle)', textAlign: 'center', color: 'var(--text-muted)' }}>
              Auto table creation & auto layout mapping
            </div>
          </div>

          {/* Reason 2 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', alignItems: 'center' }}>
            <div style={{ order: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ background: 'rgba(var(--brand-rgb), 0.1)', color: 'var(--brand)', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bot size={20} /></div>
                <h3 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>2. AI-first workflow</h3>
              </div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '16px', marginBottom: '16px' }}>Instead of building schemas manually, you can:</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px', color: 'var(--text-secondary)' }}>
                <li style={{ display: 'flex', gap: '12px' }}><ArrowRight size={20} color="var(--brand)" /> generate entire systems from prompts</li>
                <li style={{ display: 'flex', gap: '12px' }}><ArrowRight size={20} color="var(--brand)" /> modify existing schemas with AI</li>
                <li style={{ display: 'flex', gap: '12px' }}><ArrowRight size={20} color="var(--brand)" /> detect missing relationships automatically</li>
              </ul>
            </div>
            <div style={{ order: 1, background: 'var(--surface-base)', borderRadius: '16px', padding: '32px', border: '1px solid var(--border-subtle)', textAlign: 'center', color: 'var(--text-muted)' }}>
              Prompt-driven Architecture
            </div>
          </div>

          {/* Reason 3 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ background: 'rgba(var(--brand-rgb), 0.1)', color: 'var(--brand)', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Focus size={20} /></div>
                <h3 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>3. Code + visual in sync</h3>
              </div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '16px', marginBottom: '16px' }}>DrawSQL is visual-first only.</p>
              <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '16px', marginBottom: '16px' }}>Here, you can:</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px', color: 'var(--text-secondary)' }}>
                <li style={{ display: 'flex', gap: '12px' }}><ArrowRight size={20} color="var(--brand)" /> write DBML or SQL</li>
                <li style={{ display: 'flex', gap: '12px' }}><ArrowRight size={20} color="var(--brand)" /> see instant visual updates</li>
                <li style={{ display: 'flex', gap: '12px' }}><ArrowRight size={20} color="var(--brand)" /> switch seamlessly between both</li>
              </ul>
            </div>
            <div style={{ background: 'var(--surface-base)', borderRadius: '16px', padding: '32px', border: '1px solid var(--border-subtle)', textAlign: 'center', color: 'var(--text-muted)' }}>
              Integrated DBML text editor
            </div>
          </div>

          {/* Reason 4 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', alignItems: 'center' }}>
            <div style={{ order: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ background: 'rgba(var(--brand-rgb), 0.1)', color: 'var(--brand)', width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Workflow size={20} /></div>
                <h3 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>4. Built for developers</h3>
              </div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '16px', marginBottom: '16px' }}>DrawSQL focuses on visuals.</p>
              <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '16px', marginBottom: '16px' }}>This platform focuses on:</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px', color: 'var(--text-secondary)' }}>
                <li style={{ display: 'flex', gap: '12px' }}><ArrowRight size={20} color="var(--brand)" /> real development workflows</li>
                <li style={{ display: 'flex', gap: '12px' }}><ArrowRight size={20} color="var(--brand)" /> ORM exports (Prisma, Drizzle)</li>
                <li style={{ display: 'flex', gap: '12px' }}><ArrowRight size={20} color="var(--brand)" /> production-ready schemas</li>
              </ul>
            </div>
            <div style={{ order: 1, background: 'var(--surface-base)', borderRadius: '16px', padding: '32px', border: '1px solid var(--border-subtle)', textAlign: 'center', color: 'var(--text-muted)' }}>
              Developer-first Architecture
            </div>
          </div>
        </div>
      </section>

      {/* 3. Who Should Use What */}
      <section style={{ maxWidth: '800px', margin: '0 auto 100px', padding: '0 20px' }}>
        <h2 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em', textAlign: 'center', marginBottom: '40px' }}>Who should use what?</h2>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 300px', background: 'var(--surface-base)', borderRadius: '16px', padding: '32px', border: '1px solid var(--border-subtle)' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>Use DrawSQL if:</h3>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', color: 'var(--text-secondary)' }}>
              <ArrowRight size={20} style={{ minWidth: '20px' }} />
              <div>you only need to draw basic visual diagrams manually.</div>
            </div>
          </div>
          <div style={{ flex: '1 1 300px', background: 'rgba(var(--brand-rgb), 0.05)', borderRadius: '16px', padding: '32px', border: '1px solid rgba(var(--brand-rgb), 0.2)' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px', color: 'var(--brand)' }}>Use Modellr if:</h3>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', color: 'var(--text-primary)', fontWeight: 500 }}>
              <ArrowRight size={20} color="var(--brand)" style={{ minWidth: '20px' }} />
              <div>you want AI generation, a synced code editor, and actual code-ready exports.</div>
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
                <th style={{ padding: '24px', fontWeight: 700, width: '25%', textAlign: 'center', color: 'var(--text-secondary)' }}>DrawSQL</th>
                <th style={{ padding: '24px', fontWeight: 700, width: '25%', textAlign: 'center', color: 'var(--brand)' }}>Modellr</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '20px 24px', fontWeight: 500 }}>Visual editor</td>
                <td style={{ padding: '20px 24px', textAlign: 'center' }}><Check size={20} color="var(--text-secondary)" style={{ margin: '0 auto' }} /></td>
                <td style={{ padding: '20px 24px', textAlign: 'center' }}><Check size={20} color="var(--brand)" style={{ margin: '0 auto' }} /></td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '20px 24px', fontWeight: 500 }}>Code editor</td>
                <td style={{ padding: '20px 24px', textAlign: 'center' }}><X size={20} color="var(--text-muted)" style={{ margin: '0 auto' }} /></td>
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
                <td style={{ padding: '20px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Limited</td>
                <td style={{ padding: '20px 24px', textAlign: 'center', fontWeight: 600 }}>Advanced</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '20px 24px', fontWeight: 500 }}>Collaboration</td>
                <td style={{ padding: '20px 24px', textAlign: 'center' }}><Check size={20} color="var(--text-secondary)" style={{ margin: '0 auto' }} /></td>
                <td style={{ padding: '20px 24px', textAlign: 'center' }}><Check size={20} color="var(--brand)" style={{ margin: '0 auto' }} /></td>
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
        <h2 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '24px' }}>Build in seconds — not minutes</h2>
        <p style={{ color: 'var(--text-primary)', fontSize: '18px', marginBottom: '32px' }}>Describe what you need:</p>

        <div style={{ background: 'var(--surface-base)', padding: '16px 24px', borderRadius: '12px', border: '1px solid var(--border-subtle)', display: 'inline-flex', alignItems: 'center', gap: '12px', margin: '0 auto 32px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <Bot size={20} color="var(--brand)" />
          <code style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: 600, fontFamily: 'var(--mono)' }}>
            "E-commerce schema with carts, orders, and payments"
          </code>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ArrowRight size={16} color="var(--brand)" /> Complete schema generated instantly</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ArrowRight size={16} color="var(--brand)" /> Fully structured relationships</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ArrowRight size={16} color="var(--brand)" /> Ready to export and use</div>
        </div>
      </section>

      {/* 6. Positioning Punch & Final CTA */}
      <section style={{ textAlign: 'center', padding: '100px 20px', background: 'var(--surface-base)', borderTop: '1px solid var(--border-subtle)', marginTop: 'auto' }}>
        <h2 style={{ fontSize: '40px', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 40px 0' }}>Stop drawing. <span style={{ color: 'var(--brand)' }}>Start building.</span></h2>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '48px', marginBottom: '64px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>
            DrawSQL helps you draw diagrams.
          </div>
          <div style={{ fontSize: '18px', color: 'var(--text-primary)', fontWeight: 700 }}>
            Modellr helps you generate real systems.
          </div>
        </div>

        <h3 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 24px 0' }}>Design your next schema faster</h3>
        <button onClick={() => navigate('/login')} style={{ background: 'var(--brand)', color: '#fff', padding: '16px 32px', borderRadius: '12px', fontSize: '1.2rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}>Start building free</button>
      </section>

      <Footer />
    </div>
  );
}
