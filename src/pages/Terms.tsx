import { PublicNav } from '../components/layout/PublicNav';
import { Footer } from '../components/layout/Footer';
import { DONATE_URL } from '../config';
import '../styles/public-dark.css';

export function Terms() {
  return (
    <div className="pd-root">
      <PublicNav dark />
      <div className="pd-legal" style={{ paddingTop: '100px' }}>
        <h1>Terms of Use</h1>
        <span className="pd-date">Last updated: 2026-10-01</span>

        <section>
          <h2>1. License</h2>
          <p>Modellr is free, open-source software released under the MIT license. The full license text is in the <a href="https://github.com/prateesh7777/schemaforge" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--pd-brand)' }}>project repository</a>. You may use, copy, modify and distribute it under those terms.</p>
        </section>

        <section>
          <h2>2. No warranty</h2>
          <p>The software and this website are provided "as is", without warranty of any kind, express or implied. To the extent permitted by law, the authors and contributors are not liable for any claim, damages or other liability arising from the use of the software.</p>
        </section>

        <section>
          <h2>3. Your schemas and exports</h2>
          <p>Your schemas and anything you export from Modellr belong to you. They are stored in your browser, not by us. You are responsible for keeping backups: clearing browser data deletes your projects.</p>
        </section>

        <section>
          <h2>4. Review before you run</h2>
          <p>Generated SQL, Prisma and Drizzle code, and migration scripts from the diff viewer are starting points. Importers may not support every syntax. Review everything before running it against a real database, and test it on a copy first.</p>
        </section>

        <section>
          <h2>5. AI output</h2>
          <p>The optional AI assistant uses a provider and key that you supply. Its output can be wrong or incomplete, and your use of that provider is subject to that provider's terms.</p>
        </section>

        {DONATE_URL && (
          <section>
            <h2>6. Voluntary donations</h2>
            <p>If you donate through the support link, the donation is voluntary and processed by a third party. It does not buy features, support, or any commitment to maintain or fix the software.</p>
          </section>
        )}

        <section>
          <h2>{DONATE_URL ? 7 : 6}. Changes</h2>
          <p>These terms may be updated as the project evolves. This page is a plain-language summary and is not legal advice.</p>
        </section>
      </div>
      <Footer />
    </div>
  );
}
