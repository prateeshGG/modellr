import { PublicNav } from '../components/layout/PublicNav';
import { Footer } from '../components/layout/Footer';
import '../styles/public-dark.css';

export function Terms() {
  return (
    <div className="pd-root">
      <PublicNav dark />
      <div className="pd-legal" style={{ paddingTop: '100px' }}>
        <h1>Terms of Service</h1>
        <span className="pd-date">Last updated: April 24, 2026</span>

        <section>
          <h2>1. Agreement to Terms</h2>
          <p>By accessing or using Modellr, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the service. These Terms apply to all visitors, users, and others who access or use the Service.</p>
        </section>

        <section>
          <h2>2. Accounts</h2>
          <p>When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service. You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password.</p>
        </section>

        <section>
          <h2>3. Acceptable Use</h2>
          <p>You agree not to use Modellr to construct schemas that explicitly facilitate illegal activities. You also agree not to reverse engineer the canvas drawing protocol, abuse the AI API limits, or spam the collaboration WebSocket channels.</p>
        </section>

        <section>
          <h2>4. Intellectual Property</h2>
          <p>Any database schemas, exported files (SQL, Prisma, DBML), and data structures you architect and export using Modellr are entirely your intellectual property. We claim no ownership over the database designs you create. The Modellr platform interface, code, and branded assets themselves remain the exclusive property of Modellr Inc.</p>
        </section>

        <section>
          <h2>5. Limitation of Liability</h2>
          <p>In no event shall Modellr, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.</p>
        </section>
      </div>
      <Footer />
    </div>
  );
}
