import { PublicNav } from '../components/layout/PublicNav';
import { Footer } from '../components/layout/Footer';
import '../styles/public-dark.css';

export function Privacy() {
  return (
    <div className="pd-root">
      <PublicNav dark />
      <div className="pd-legal" style={{ paddingTop: '100px' }}>
        <h1>Privacy Policy</h1>
        <span className="pd-date">Last updated: April 24, 2026</span>

        <section>
          <h2>1. Information We Collect</h2>
          <p>We collect information you provide directly to us when you log in via Github, Google, or Email through Supabase Auth. This includes your basic profile information (name, email) and the schema configurations you explicitly save on our platform.</p>
        </section>

        <section>
          <h2>2. Database Connection Strings</h2>
          <p><strong>We do not store your connection strings.</strong> When you use our Live Database Introspection feature, your PostgreSQL connection string is exclusively used transiently in server memory to query <code style={{ fontFamily: 'var(--pd-mono)', color: 'var(--pd-brand)', fontSize: '13px' }}>information_schema</code>. It is never written to disk, and the TCP connection is immediately closed upon layout generation.</p>
        </section>

        <section>
          <h2>3. How We Use Information</h2>
          <p>We only use your information to provide, maintain, and improve our services to you. Schema canvas states are stored using Yjs awareness engines mapped to Supabase Storage. AI queries are passed anonymously to OpenAI to generate table structures, and no PII is included in those system prompts.</p>
        </section>

        <section>
          <h2>4. Data Security</h2>
          <p>We have implemented stringent Row Level Security (RLS) and Zero-Trust gatekeeping on our backend. No user can read or write to your schema unless they are explicitly invited via secure magic links and authenticated tokens.</p>
        </section>

        <section>
          <h2>5. Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, please contact us via our support channels or at <a href="mailto:privacy@modellr.com" style={{ color: 'var(--pd-brand)' }}>privacy@modellr.com</a>.</p>
        </section>
      </div>
      <Footer />
    </div>
  );
}
