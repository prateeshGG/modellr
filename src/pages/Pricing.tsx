import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { PublicNav } from '../components/layout/PublicNav';
import { Footer } from '../components/layout/Footer';

export function Pricing() {
  const navigate = useNavigate();
  const { session } = useAuthStore();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  return (
    <div style={{ background: 'var(--canvas-bg)', minHeight: '100vh', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column' }}>
      
      <PublicNav />

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '64px 20px 48px' }}>
        <h1 style={{ fontSize: '40px', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 16px 0' }}>Simple, honest pricing</h1>
        <p style={{ fontSize: '18px', color: 'var(--text-secondary)', margin: '0 0 40px 0' }}>Start free. No credit card. Upgrade when your project grows.</p>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', fontSize: '14px', fontWeight: 600 }}>
          <span style={{ color: billingCycle === 'monthly' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>Monthly</span>
          <div 
            onClick={() => setBillingCycle(b => b === 'monthly' ? 'annual' : 'monthly')}
            style={{ width: '44px', height: '24px', background: 'rgb(162, 107, 252)', borderRadius: '12px', position: 'relative', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            <div style={{ width: '18px', height: '18px', background: '#fff', borderRadius: '50%', position: 'absolute', top: '3px', left: billingCycle === 'monthly' ? '3px' : '23px', transition: 'all 0.2s' }}></div>
          </div>
          <span style={{ color: billingCycle === 'annual' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
            Annual <span style={{ color: 'var(--alert-success)', background: 'rgba(40,167,69,0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', marginLeft: '8px' }}>Save 30%</span>
          </span>
        </div>
      </div>

      {/* Pricing Grid */}
      <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', padding: '0 20px 80px', width: '100%', alignItems: 'stretch' }}>
        
        {/* Free Tier */}
        <div style={{ background: 'var(--surface-base)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '32px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '16px', textTransform: 'uppercase' }}>Free</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', marginBottom: '8px' }}>
            <span style={{ fontSize: '40px', fontWeight: 800, lineHeight: 1 }}>$0</span>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '6px' }}>/mo</span>
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '32px', minHeight: '40px' }}>For individuals getting started.</div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '40px', flex: 1, fontSize: '14px' }}>
            <div style={{ display: 'flex', gap: '12px' }}><span style={{ color: 'rgb(162, 107, 252)' }}>✓</span> 3 saved schemas</div>
            <div style={{ display: 'flex', gap: '12px' }}><span style={{ color: 'rgb(162, 107, 252)' }}>✓</span> Unlimited canvas editing</div>
            <div style={{ display: 'flex', gap: '12px' }}><span style={{ color: 'rgb(162, 107, 252)' }}>✓</span> SQL + DBML export</div>
            <div style={{ display: 'flex', gap: '12px' }}><span style={{ color: 'rgb(162, 107, 252)' }}>✓</span> AI generation (10/day)</div>
            <div style={{ display: 'flex', gap: '12px' }}><span style={{ color: 'rgb(162, 107, 252)' }}>✓</span> Guest sandbox</div>
            <div style={{ display: 'flex', gap: '12px', color: 'var(--text-muted)' }}><span>—</span> AI Chat-to-Modify</div>
            <div style={{ display: 'flex', gap: '12px', color: 'var(--text-muted)' }}><span>—</span> Prisma + Drizzle export</div>
            <div style={{ display: 'flex', gap: '12px', color: 'var(--text-muted)' }}><span>—</span> MCP server access</div>
          </div>
          <button onClick={() => navigate(session ? '/app' : '/login')} style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px solid var(--border-focus)', color: 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Get started free</button>
        </div>

        {/* Pro Tier (Highlight) */}
        <div style={{ background: 'var(--surface-base)', border: '2px solid rgb(162, 107, 252)', borderRadius: '16px', padding: '32px', display: 'flex', flexDirection: 'column', position: 'relative', transform: 'scale(1.02)' }}>
          <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', background: 'rgb(162, 107, 252)', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '12px', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
            ✦ Most popular
          </div>
          
          <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em', color: 'rgb(162, 107, 252)', marginBottom: '16px', textTransform: 'uppercase' }}>Pro</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', marginBottom: '8px' }}>
            <span style={{ fontSize: '40px', fontWeight: 800, lineHeight: 1, color: 'rgb(162, 107, 252)' }}>
              ${billingCycle === 'monthly' ? '12' : '9'}
            </span>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '6px' }}>/mo</span>
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '32px', minHeight: '40px' }}>
            {billingCycle === 'annual' ? 'Billed $108 yearly. For developers who ship seriously.' : 'For developers who ship seriously.'}
          </div>
          
          <div style={{ height: '1px', background: 'var(--border-subtle)', marginBottom: '32px' }}></div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '40px', flex: 1, fontSize: '14px' }}>
            <div style={{ display: 'flex', gap: '12px' }}><span style={{ color: 'rgb(162, 107, 252)' }}>✓</span> Unlimited schemas</div>
            <div style={{ display: 'flex', gap: '12px' }}><span style={{ color: 'rgb(162, 107, 252)' }}>✓</span> Unlimited snapshots</div>
            <div style={{ display: 'flex', gap: '12px' }}><span style={{ color: 'rgb(162, 107, 252)' }}>✓</span> All exports incl. Prisma, Drizzle</div>
            <div style={{ display: 'flex', gap: '12px' }}><span style={{ color: 'rgb(162, 107, 252)' }}>✓</span> AI generation (200/day)</div>
            <div style={{ display: 'flex', gap: '12px' }}><span style={{ color: 'rgb(162, 107, 252)' }}>✓</span> AI Chat-to-Modify (unlimited)</div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}><span style={{ color: 'rgb(162, 107, 252)' }}>✓</span> 10 collaborators/schema</div>
            <div style={{ display: 'flex', gap: '12px', fontWeight: 600 }}><span style={{ color: 'rgb(162, 107, 252)' }}>✓</span> MCP server + API key</div>
          </div>
          <button style={{ width: '100%', padding: '12px', background: 'rgb(162, 107, 252)', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>Upgrade to Pro</button>
        </div>

        {/* Enterprise Tier */}
        <div style={{ background: 'var(--surface-base)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '32px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '16px', textTransform: 'uppercase' }}>Enterprise</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', marginBottom: '8px' }}>
            <span style={{ fontSize: '36px', fontWeight: 800, lineHeight: 1 }}>Custom</span>
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '32px', minHeight: '40px' }}>For teams that need custom limits and support.</div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '40px', flex: 1, fontSize: '14px' }}>
            <div style={{ display: 'flex', gap: '12px' }}><span style={{ color: 'rgb(162, 107, 252)' }}>✓</span> Everything in Pro</div>
            <div style={{ display: 'flex', gap: '12px' }}><span style={{ color: 'rgb(162, 107, 252)' }}>✓</span> SSO / SAML</div>
            <div style={{ display: 'flex', gap: '12px' }}><span style={{ color: 'rgb(162, 107, 252)' }}>✓</span> Unlimited collaborators</div>
            <div style={{ display: 'flex', gap: '12px' }}><span style={{ color: 'rgb(162, 107, 252)' }}>✓</span> Audit logs</div>
            <div style={{ display: 'flex', gap: '12px' }}><span style={{ color: 'rgb(162, 107, 252)' }}>✓</span> SLA + dedicated support</div>
            <div style={{ display: 'flex', gap: '12px' }}><span style={{ color: 'rgb(162, 107, 252)' }}>✓</span> Custom export formats</div>
            <div style={{ display: 'flex', gap: '12px' }}><span style={{ color: 'rgb(162, 107, 252)' }}>✓</span> On-prem / self-hosted option</div>
          </div>
          <button style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px solid var(--border-default)', color: 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Contact us</button>
        </div>

      </div>
      <Footer />
    </div>
  );
}
