import { PublicNav } from '../components/layout/PublicNav';
import { Footer } from '../components/layout/Footer';
import '../styles/public-dark.css';

export function Privacy() {
  return (
    <div className="pd-root">
      <PublicNav dark />
      <div className="pd-legal" style={{ paddingTop: '100px' }}>
        <h1>Privacy Policy</h1>
        <span className="pd-date">Last updated: 2026-10-01</span>

        <section>
          <h2>1. The short version</h2>
          <p>Modellr is a static, local-first web app. There are no accounts and no sign-in. The app does not collect personal data, and your schemas stay in your browser.</p>
        </section>

        <section>
          <h2>2. Your schemas</h2>
          <p>Projects, snapshots and settings are stored in your browser (IndexedDB and local storage on your device). They are not uploaded to any server operated by this project. Clearing your browser's site data deletes them, so use the backup feature for anything important.</p>
          <p>Share links and embeds contain the schema itself, compressed into the URL. Anyone who has the link can read that schema, so only share links you are comfortable making visible. The part of the URL after the <code style={{ fontFamily: 'var(--pd-mono)', color: 'var(--pd-brand)', fontSize: '13px' }}>#</code> is normally not sent to the web server when the page is loaded, but it may be stored by whatever app or service you paste the link into.</p>
        </section>

        <section>
          <h2>3. Optional AI assistant</h2>
          <p>AI features are off until you configure them. If you do, the app sends your prompt and the schema context from your browser straight to the AI endpoint you chose (for example OpenAI, OpenRouter, or a local model such as Ollama). Your API key is stored only in your browser. These requests do not pass through any server of ours, and the provider you chose handles that data under its own terms and privacy policy. With a local model, nothing leaves your machine.</p>
        </section>

        <section>
          <h2>4. Analytics and cookies</h2>
          <p>The app does not include analytics or tracking scripts and does not set cookies. It uses browser storage only to save your projects, your theme and your AI settings on your device.</p>
        </section>

        <section>
          <h2>5. Hosting and third parties</h2>
          <p>The site is delivered by a static web host, which may keep ordinary server or access logs (such as IP address and requested URL) as part of operating the service. The pages also load fonts from Google Fonts, so your browser contacts Google when a page loads. If you self-host Modellr, that is under your control.</p>
        </section>

        <section>
          <h2>6. Contact</h2>
          <p>Questions about this policy can be raised as an issue at <a href="https://github.com/prateesh7777/schemaforge/issues" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--pd-brand)' }}>github.com/prateesh7777/schemaforge/issues</a>.</p>
        </section>
      </div>
      <Footer />
    </div>
  );
}
