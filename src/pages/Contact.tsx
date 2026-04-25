import { Mail, MessageSquare, MapPin } from 'lucide-react';
import { PublicNav } from '../components/layout/PublicNav';
import { Footer } from '../components/layout/Footer';
import '../styles/public-dark.css';

export function Contact() {
  return (
    <div className="pd-root">
      <PublicNav dark />

      <main style={{ flex: 1 }}>
        {/* ── Hero ── */}
        <div className="pd-hero" style={{ paddingTop: '140px' }}>
          <div className="pd-hero-dot-grid" aria-hidden />
          <div className="pd-hero-glow" aria-hidden />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div className="pd-label">// Contact</div>
            <h1 className="pd-h1">Get in touch</h1>
            <p className="pd-lead">
              Have a question about Modellr? Need enterprise pricing or custom deployment? We'd love to hear from you.
            </p>
          </div>
        </div>

        {/* ── Contact cards ── */}
        <section className="pd-section">
          <div className="pd-inner" style={{ maxWidth: '760px' }}>
            <div className="pd-grid-2">

              <a href="mailto:hello@modellr.com" style={{ textDecoration: 'none' }}>
                <div className="pd-card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                  <div className="pd-card__icon"><Mail size={24} /></div>
                  <h3 className="pd-h3">Email Us</h3>
                  <p className="pd-body-text" style={{ marginBottom: '20px', flex: 1 }}>
                    For general inquiries, support, and enterprise conversations.
                  </p>
                  <span style={{ fontFamily: 'var(--pd-mono)', fontSize: '13px', color: 'var(--pd-brand)' }}>hello@modellr.com</span>
                </div>
              </a>

              <a href="https://twitter.com/modellr" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <div className="pd-card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                  <div className="pd-card__icon"><MessageSquare size={24} /></div>
                  <h3 className="pd-h3">Twitter / X</h3>
                  <p className="pd-body-text" style={{ marginBottom: '20px', flex: 1 }}>
                    Follow us for product updates, database tips, and announcements.
                  </p>
                  <span style={{ fontFamily: 'var(--pd-mono)', fontSize: '13px', color: 'var(--pd-brand)' }}>@modellr</span>
                </div>
              </a>
            </div>

            {/* HQ */}
            <div className="pd-card" style={{ marginTop: '24px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
              <div className="pd-card__icon" style={{ marginBottom: 0, flexShrink: 0 }}><MapPin size={22} /></div>
              <div>
                <h3 className="pd-h3">Company HQ</h3>
                <p className="pd-body-text" style={{ margin: 0 }}>
                  Modellr Inc.<br />
                  123 Startup Blvd, Suite 100<br />
                  San Francisco, CA 94107
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
