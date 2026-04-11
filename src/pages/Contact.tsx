import { Mail, MessageSquare, MapPin } from 'lucide-react';
import { PublicNav } from '../components/layout/PublicNav';
import { Footer } from '../components/layout/Footer';

export function Contact() {
  return (
    <div style={{ background: 'var(--canvas-bg)', color: 'var(--text-primary)', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'var(--sans)' }}>
      <PublicNav />

      <main style={{ flex: 1, padding: '100px 20px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        <h1 style={{ fontSize: 'min(3.5rem, 8vw)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '24px', textAlign: 'center' }}>
          Get in touch
        </h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '64px', lineHeight: 1.6 }}>
          Have a question about Modellr? Need enterprise pricing or custom deployment? We'd love to hear from you.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>

          <a href="mailto:hello@Modellr.com" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ background: 'var(--surface-base)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '32px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ background: 'rgba(var(--brand-rgb), 0.1)', color: 'var(--brand)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                <Mail size={24} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 12px 0' }}>Email Us</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px', flex: 1 }}>
                For general inquiries, support, and enterprise conversations.
              </p>
              <div style={{ color: 'var(--brand)', fontWeight: 600 }}>hello@Modellr.com</div>
            </div>
          </a>

          <a href="https://twitter.com/Modellr" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ background: 'var(--surface-base)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '32px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ background: 'rgba(var(--brand-rgb), 0.1)', color: 'var(--brand)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                <MessageSquare size={24} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 12px 0' }}>Twitter / X</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px', flex: 1 }}>
                Follow us for product updates, database tips, and announcements.
              </p>
              <div style={{ color: 'var(--brand)', fontWeight: 600 }}>@Modellr</div>
            </div>
          </a>

        </div>

        <div style={{ marginTop: '64px', background: 'var(--surface-base)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '40px', display: 'flex', gap: '24px', alignItems: 'center' }}>
          <div style={{ background: 'rgba(var(--text-primary-rgb), 0.05)', color: 'var(--text-primary)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <MapPin size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0' }}>Company HQ</h3>
            <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Modellr Inc.<br />
              123 Startup Blvd, Suite 100<br />
              San Francisco, CA 94107
            </p>
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}
