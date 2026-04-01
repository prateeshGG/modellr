import { PublicNav } from '../components/layout/PublicNav';
import { Footer } from '../components/layout/Footer';

export function Terms() {

  return (
    <div style={{ background: 'var(--canvas-bg)', minHeight: '100vh', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column' }}>
      
      <PublicNav />

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '64px 20px', flex: 1, lineHeight: 1.8 }}>
        <h1 style={{ fontSize: '40px', fontWeight: 800, marginBottom: '16px' }}>Terms of Service</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '48px' }}>Last updated: {new Date().toLocaleDateString()}</p>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px' }}>1. Agreement to Terms</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            By accessing or using SchemaForge, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the service. These Terms apply to all visitors, users, and others who access or use the Service.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px' }}>2. Accounts</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service. You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px' }}>3. Acceptable Use</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            You agree not to use SchemaForge to construct schemas that explicitly facilitate illegal activities. You also agree not to reverse engineer the canvas drawing protocol, abuse the AI API limits, or spam the collaboration WebSocket channels.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px' }}>4. Intellectual Property</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Any database schemas, exported files (SQL, Prisma, DBML), and data structures you architect and export using SchemaForge are entirely your intellectual property. We claim no ownership over the database designs you create. The SchemaForge platform interface, code, and branded assets themselves remain the exclusive property of SchemaForge Inc.
          </p>
        </section>

        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px' }}>5. Limitation of Liability</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            In no event shall SchemaForge, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
          </p>
        </section>
      </div>
      <Footer />
    </div>
  );
}
