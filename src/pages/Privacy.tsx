import { SiteShell } from '../components/site/SiteShell';
import { DONATE_URL, GITHUB_REPO } from '../config';

export function Privacy() {
  let n = 0;
  const h = (t: string) => <h2>{`${++n}. ${t}`}</h2>;
  return (
    <SiteShell title="Privacy policy" path="/privacy" description="Modellr is a static, local-first app with no accounts, no analytics and no cookies. Your schemas stay in your browser.">
      <div className="n-wrap" style={{ paddingTop: 72, paddingBottom: 120 }}>
        <div className="n-prose">
          <span className="n-eyebrow">Legal</span>
          <h1>Privacy policy</h1>
          <p className="n-small">Last updated: 2026-10-01</p>

          {h('The short version')}
          <p>Modellr is a static, local-first web app. There are no accounts and no sign-in. The app does not collect personal data, and your schemas stay in your browser.</p>

          {h('Your schemas')}
          <p>Projects, snapshots and settings are stored in your browser (IndexedDB and local storage on your device). They are not uploaded to any server operated by this project. Clearing your browser's site data deletes them, so use the backup feature for anything important.</p>
          <p>Share links and embeds contain the schema itself, compressed into the URL. Anyone who has the link can read that schema, so only share links you are comfortable making visible. The part of the URL after the <code>#</code> is normally not sent to the web server when the page is loaded, but it may be stored by whatever app or service you paste the link into.</p>

          {h('Optional AI assistant')}
          <p>AI features are off until you configure them. If you do, the app sends your prompt and the schema context from your browser straight to the AI endpoint you chose (for example OpenAI, OpenRouter, or a local model such as Ollama). Your API key is stored only in your browser. These requests do not pass through any server of ours, and the provider you chose handles that data under its own terms and privacy policy. With a local model, nothing leaves your machine.</p>

          {h('Analytics and cookies')}
          <p>The app does not include analytics or tracking scripts and does not set cookies. It uses browser storage only to save your projects, your theme, your AI settings and a cached GitHub star count on your device.</p>

          {h('GitHub star count')}
          <p>The public pages show the repository's star count. To get it, your browser makes one request to <code>api.github.com</code> (for <code>{GITHUB_REPO}</code>) with no token or cookies, and caches the answer for a few hours. GitHub can see that request as it would any visit to its API, under GitHub's privacy statement. If the request fails, the number is simply not shown. The editor and dashboard do not make this request.</p>

          {h('Hosting and fonts')}
          <p>The site is delivered by a static web host, which may keep ordinary server or access logs (such as IP address and requested URL) as part of operating the service. Fonts are served from this site itself, so no font provider is contacted. If you self-host Modellr, hosting is under your control.</p>

          {DONATE_URL && (<>
            {h('Optional support link')}
            <p>The site links to a Buy Me a Coffee page where you can choose to make a voluntary donation. That link opens in a new tab on a third-party site. If you use it, your payment and personal details are handled by Buy Me a Coffee under its own terms and privacy policy; this app never sees them. Nothing in Modellr requires or depends on a donation.</p>
          </>)}

          {h('Contact')}
          <p>Questions about this policy can be raised as an issue at <a href={`https://github.com/${GITHUB_REPO}/issues`} target="_blank" rel="noopener noreferrer">github.com/{GITHUB_REPO}/issues</a>.</p>
        </div>
      </div>
    </SiteShell>
  );
}
