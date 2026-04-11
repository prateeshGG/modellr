import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { PublicNav } from '../components/layout/PublicNav';
import { Footer } from '../components/layout/Footer';
import { Check, X, Bot, ExternalLink, Zap, Users } from 'lucide-react';

export function Pricing() {
  const navigate = useNavigate();
  const { session } = useAuthStore();

  return (
    <div style={{ background: 'var(--canvas-bg)', minHeight: '100vh', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', fontFamily: 'var(--sans)' }}>
      
      <PublicNav />

      {/* 1. Hero */}
      <div style={{ textAlign: 'center', padding: '100px 20px 64px' }}>
        <h1 style={{ fontSize: 'min(3.5rem, 10vw)', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 16px 0' }}>Simple pricing for builders</h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', margin: '0 auto 24px auto', maxWidth: '600px', lineHeight: 1.6 }}>Start free. Upgrade when you need more power, AI, and exports.</p>
        <div style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 600 }}>No credit card required. Cancel anytime.</div>
      </div>

      {/* 2. Pricing Cards */}
      <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '32px', padding: '0 20px 80px', width: '100%', alignItems: 'stretch' }}>
        
        {/* Free Tier */}
        <div style={{ background: 'var(--surface-base)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '48px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>Free</div>
          <div style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '32px' }}>Start building instantly.</div>
          
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '40px' }}>
            <span style={{ fontSize: '48px', fontWeight: 800, lineHeight: 1 }}>$0</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '48px', flex: 1, fontSize: '16px' }}>
            <div style={{ display: 'flex', gap: '12px' }}><Check size={20} color="var(--brand)" /> Unlimited canvas editing</div>
            <div style={{ display: 'flex', gap: '12px' }}><Check size={20} color="var(--brand)" /> Up to 3 saved schemas</div>
            <div style={{ display: 'flex', gap: '12px' }}><Check size={20} color="var(--brand)" /> SQL & DBML exports</div>
            <div style={{ display: 'flex', gap: '12px' }}><Check size={20} color="var(--brand)" /> 10 AI generations per day</div>
            <div style={{ display: 'flex', gap: '12px' }}><Check size={20} color="var(--brand)" /> Guest sandbox access</div>
          </div>
          <button onClick={() => navigate(session ? '/app' : '/login')} style={{ width: '100%', padding: '16px', background: 'transparent', border: '1px solid var(--border-hi)', color: 'var(--text-primary)', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '16px', transition: 'background 0.2s' }}>Start building free</button>
        </div>

        {/* Pro Tier (Highlight) */}
        <div style={{ background: 'var(--surface-base)', border: '2px solid var(--brand)', borderRadius: '16px', padding: '48px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '-14px', right: '48px', background: 'var(--brand)', color: '#fff', fontSize: '12px', fontWeight: 700, padding: '4px 16px', borderRadius: '12px', letterSpacing: '0.05em' }}>
            Most popular
          </div>
          
          <div style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px', color: 'var(--brand)' }}>Pro</div>
          <div style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '32px' }}>Everything you need to ship faster.</div>
          
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '40px' }}>
            <span style={{ fontSize: '48px', fontWeight: 800, lineHeight: 1 }}>$15</span>
            <span style={{ fontSize: '16px', color: 'var(--text-secondary)', fontWeight: 600 }}>/ month</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '48px', flex: 1, fontSize: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', fontWeight: 500 }}><Check size={20} color="var(--brand)" /> Unlimited schemas</div>
            <div style={{ display: 'flex', gap: '12px', fontWeight: 500 }}><Check size={20} color="var(--brand)" /> Prisma & Drizzle exports</div>
            <div style={{ display: 'flex', gap: '12px', fontWeight: 500 }}><Check size={20} color="var(--brand)" /> Unlimited AI chat-to-modify</div>
            <div style={{ display: 'flex', gap: '12px', fontWeight: 500 }}><Check size={20} color="var(--brand)" /> Up to 200 AI generations per day</div>
            <div style={{ display: 'flex', gap: '12px', fontWeight: 500 }}><Check size={20} color="var(--brand)" /> Version history (50 snapshots)</div>
            <div style={{ display: 'flex', gap: '12px', fontWeight: 500 }}><Check size={20} color="var(--brand)" /> Real-time collaboration (up to 10 users)</div>
            <div style={{ display: 'flex', gap: '12px', fontWeight: 500 }}><Check size={20} color="var(--brand)" /> Priority performance</div>
          </div>
          <button style={{ width: '100%', padding: '16px', background: 'var(--brand)', border: 'none', color: '#fff', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '16px', boxShadow: '0 8px 16px rgba(var(--brand-rgb), 0.2)' }}>Upgrade to Pro</button>
        </div>
      </div>

      {/* 3. Value Justification */}
      <section style={{ maxWidth: '800px', margin: '0 auto 120px', padding: '0 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 24px' }}>Built to save you hours every week</h2>
        <div style={{ fontSize: '18px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
          <p style={{ marginBottom: '16px' }}>Designing a database shouldn't take hours of switching between tools, fixing relationships, and rewriting schemas.</p>
          <p style={{ marginBottom: '16px' }}>This platform helps you generate, refine, and export production-ready schemas in minutes.</p>
          <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '24px', fontSize: '20px' }}>If it saves you even 2–3 hours on a single project, it pays for itself.</p>
        </div>
      </section>

      {/* 4. Comparison Table */}
      <section style={{ maxWidth: '900px', margin: '0 auto 120px', padding: '0 20px' }}>
        <h2 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em', textAlign: 'center', marginBottom: '40px' }}>Compare plans</h2>
        <div style={{ background: 'var(--surface-base)', borderRadius: '16px', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '15px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-raised)' }}>
                <th style={{ padding: '24px', fontWeight: 700 }}>Feature</th>
                <th style={{ padding: '24px', fontWeight: 700, width: '25%', textAlign: 'center' }}>Free</th>
                <th style={{ padding: '24px', fontWeight: 700, width: '25%', textAlign: 'center', color: 'var(--brand)' }}>Pro</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '20px 24px', fontWeight: 500 }}>Canvas editing</td>
                <td style={{ padding: '20px 24px', textAlign: 'center' }}><Check size={20} color="var(--brand)" style={{ margin: '0 auto' }} /></td>
                <td style={{ padding: '20px 24px', textAlign: 'center' }}><Check size={20} color="var(--brand)" style={{ margin: '0 auto' }} /></td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '20px 24px', fontWeight: 500 }}>Saved schemas</td>
                <td style={{ padding: '20px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>3</td>
                <td style={{ padding: '20px 24px', textAlign: 'center', fontWeight: 600 }}>Unlimited</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '20px 24px', fontWeight: 500 }}>SQL export</td>
                <td style={{ padding: '20px 24px', textAlign: 'center' }}><Check size={20} color="var(--brand)" style={{ margin: '0 auto' }} /></td>
                <td style={{ padding: '20px 24px', textAlign: 'center' }}><Check size={20} color="var(--brand)" style={{ margin: '0 auto' }} /></td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '20px 24px', fontWeight: 500 }}>DBML export</td>
                <td style={{ padding: '20px 24px', textAlign: 'center' }}><Check size={20} color="var(--brand)" style={{ margin: '0 auto' }} /></td>
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
                <td style={{ padding: '20px 24px', fontWeight: 500 }}>AI generation</td>
                <td style={{ padding: '20px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>10 / day</td>
                <td style={{ padding: '20px 24px', textAlign: 'center', fontWeight: 600 }}>200 / day</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '20px 24px', fontWeight: 500 }}>AI chat-to-modify</td>
                <td style={{ padding: '20px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Limited</td>
                <td style={{ padding: '20px 24px', textAlign: 'center', fontWeight: 600 }}>Unlimited</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '20px 24px', fontWeight: 500 }}>Version history</td>
                <td style={{ padding: '20px 24px', textAlign: 'center' }}><X size={20} color="var(--text-muted)" style={{ margin: '0 auto' }} /></td>
                <td style={{ padding: '20px 24px', textAlign: 'center' }}><Check size={20} color="var(--brand)" style={{ margin: '0 auto' }} /></td>
              </tr>
              <tr>
                <td style={{ padding: '20px 24px', fontWeight: 500 }}>Collaboration</td>
                <td style={{ padding: '20px 24px', textAlign: 'center' }}><X size={20} color="var(--text-muted)" style={{ margin: '0 auto' }} /></td>
                <td style={{ padding: '20px 24px', textAlign: 'center', fontWeight: 600 }}>Up to 10 users</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. Objection Handling */}
      <section style={{ maxWidth: '1000px', margin: '0 auto 120px', padding: '0 20px' }}>
        <h2 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em', textAlign: 'center', marginBottom: '48px' }}>Why upgrade?</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '40px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ color: 'var(--brand)' }}><Bot size={24} /></div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Faster workflow</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '16px' }}>Generate and modify schemas instantly with AI.</p>
          </div>
          
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ color: 'var(--brand)' }}><ExternalLink size={24} /></div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Modern stack support</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '16px' }}>Export directly to Prisma and Drizzle without manual rewriting.</p>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ color: 'var(--brand)' }}><Zap size={24} /></div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>No limitations</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '16px' }}>Work on unlimited projects without hitting caps.</p>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ color: 'var(--brand)' }}><Users size={24} /></div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Collaboration</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '16px' }}>Share and explain your architecture with your team or clients.</p>
          </div>
        </div>
      </section>

      {/* 6. FAQ Section */}
      <section style={{ maxWidth: '800px', margin: '0 auto 120px', padding: '0 20px' }}>
        <h2 style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em', textAlign: 'center', marginBottom: '48px' }}>Frequently asked questions</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div>
            <h4 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>1. Do I need a credit card to start?</h4>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '16px' }}>No. You can start using the product for free without entering any payment details.</p>
          </div>
          <div>
            <h4 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>2. Can I cancel anytime?</h4>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '16px' }}>Yes. You can cancel your subscription at any time. You'll continue to have access until the end of your billing period.</p>
          </div>
          <div>
            <h4 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>3. What happens if I hit the AI limit?</h4>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '16px' }}>On the free plan, you'll need to wait until the next day. Pro users get significantly higher limits for uninterrupted workflows.</p>
          </div>
          <div>
            <h4 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>4. Is this a replacement for my database?</h4>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '16px' }}>No. This is a design and architecture tool. You generate schemas and export them to your actual database or ORM.</p>
          </div>
          <div>
            <h4 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>5. Do you support teams?</h4>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '16px' }}>Yes. The Pro plan includes collaboration features for up to 10 users per project.</p>
          </div>
          <div>
            <h4 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>6. Do you connect to my database?</h4>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '16px' }}>No. This tool focuses on schema design and code generation, without direct database access—keeping things fast and secure.</p>
          </div>
        </div>
      </section>

      {/* 7. Final CTA Section */}
      <section style={{ textAlign: 'center', padding: '100px 20px', background: 'var(--surface-base)', borderTop: '1px solid var(--border-subtle)' }}>
        <h2 style={{ fontSize: '48px', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 16px 0' }}>Start designing your database today</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '18px', marginBottom: '40px' }}>No setup. No friction. Just build.</p>
        <button onClick={() => navigate('/login')} style={{ background: 'var(--text-primary)', color: 'var(--canvas-bg)', padding: '16px 32px', borderRadius: '12px', fontSize: '1.2rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}>Start building free</button>
      </section>

      <Footer />
    </div>
  );
}
