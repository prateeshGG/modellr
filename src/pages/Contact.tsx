import { Bug, GitBranch } from 'lucide-react';
import { PublicNav } from '../components/layout/PublicNav';
import { Footer } from '../components/layout/Footer';
import '../styles/public-dark.css';

const REPO_URL = 'https://github.com/prateesh7777/modellr';

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
              Modellr is an open-source project. Bugs, questions and ideas all go through GitHub.
            </p>
          </div>
        </div>

        {/* ── Contact cards ── */}
        <section className="pd-section">
          <div className="pd-inner" style={{ maxWidth: '760px' }}>
            <div className="pd-grid-2">

              <a href={`${REPO_URL}/issues`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <div className="pd-card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                  <div className="pd-card__icon"><Bug size={24} /></div>
                  <h3 className="pd-h3">Report a bug or suggest an idea</h3>
                  <p className="pd-body-text" style={{ marginBottom: '20px', flex: 1 }}>
                    Open a GitHub issue. For bugs, include your browser, what you did, and a small example schema if you can.
                  </p>
                  <span style={{ fontFamily: 'var(--pd-mono)', fontSize: '13px', color: 'var(--pd-brand)' }}>GitHub Issues</span>
                </div>
              </a>

              <a href={REPO_URL} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <div className="pd-card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                  <div className="pd-card__icon"><GitBranch size={24} /></div>
                  <h3 className="pd-h3">Source code</h3>
                  <p className="pd-body-text" style={{ marginBottom: '20px', flex: 1 }}>
                    Read the code, fork it, or send a pull request. Modellr is MIT licensed.
                  </p>
                  <span style={{ fontFamily: 'var(--pd-mono)', fontSize: '13px', color: 'var(--pd-brand)' }}>prateesh7777/modellr</span>
                </div>
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
