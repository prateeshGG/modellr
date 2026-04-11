import { PublicNav } from '../components/layout/PublicNav';
import { Footer } from '../components/layout/Footer';

export function Privacy() {

  return (
    <div style={{ background: 'var(--canvas-bg)', minHeight: '100vh', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column' }}>
      
      <PublicNav />

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '64px 20px', flex: 1, lineHeight: 1.8 }}>
        <h1 style={{ fontSize: '40px', fontWeight: 800, marginBottom: '16px' }}>Privacy Policy</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '48px' }}>Last updated: January 1, 2025</p>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px' }}>1. Information We Collect</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
            We collect information you provide directly to us when you log in via Github, Google, or Email through Supabase Auth.
            This includes your basic profile information (name, email) and the schema configurations you explicitly save on our platform.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px' }}>2. Database Connection Strings</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
            <strong>We do not store your connection strings.</strong> When you use our Live Database Introspection feature, your PostgreSQL connection string is exclusively used transiently in server memory to query `information_schema`. It is never written to disk, and the TCP connection is immediately closed upon layout generation.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px' }}>3. How We Use Information</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            We only use your information to provide, maintain, and improve our services to you. Schema canvas states are stored using Yjs awareness engines mapped to Supabase Storage. AI queries are passed anonymously to OpenAI to generate table structures, and no PII is included in those system prompts.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px' }}>4. Data Security</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            We have implemented stringent Row Level Security (RLS) and Zero-Trust gatekeeping on our backend. No user can read or write to your schema unless they are explicitly invited via secure magic links and authenticated tokens.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px' }}>5. Contact Us</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            If you have any questions about this Privacy Policy, please contact us via our support channels or at privacy@schemaforge.com.
          </p>
        </section>
      </div>
      <Footer />
    </div>
  );
}
