import { SiteShell } from '../components/site/SiteShell';
import { DONATE_URL, REPO_URL } from '../config';

export function Terms() {
  let n = 0;
  const h = (t: string) => <h2>{`${++n}. ${t}`}</h2>;
  return (
    <SiteShell route="/terms">
      <div className="n-wrap" style={{ paddingTop: 72, paddingBottom: 120 }}>
        <div className="n-prose">
          <span className="n-eyebrow">Legal</span>
          <h1>Terms of use</h1>
          <p className="n-small">Last updated: 2026-10-01</p>

          {h('License')}
          <p>Modellr is free, open-source software released under the MIT license. The full license text is in the <a href={REPO_URL} target="_blank" rel="noopener noreferrer">project repository</a>. You may use, copy, modify and distribute it under those terms.</p>

          {h('No warranty')}
          <p>The software and this website are provided "as is", without warranty of any kind, express or implied. To the extent permitted by law, the authors and contributors are not liable for any claim, damages or other liability arising from the use of the software.</p>

          {h('Your schemas and exports')}
          <p>Your schemas and anything you export from Modellr belong to you. They are stored in your browser, not by us. You are responsible for keeping backups: clearing browser data deletes your projects.</p>

          {h('Review before you run')}
          <p>Generated SQL, Prisma and Drizzle code, and migration scripts from the diff viewer are starting points. Importers may not support every syntax. Review everything before running it against a real database, and test it on a copy first.</p>

          {h('AI output')}
          <p>The optional AI assistant uses a provider and key that you supply. Its output can be wrong or incomplete, and your use of that provider is subject to that provider's terms.</p>

          {DONATE_URL && (<>
            {h('Voluntary donations')}
            <p>If you donate through the support link, the donation is voluntary and processed by a third party. It does not buy features, support, or any commitment to maintain or fix the software.</p>
          </>)}

          {h('Changes')}
          <p>These terms may be updated as the project evolves. This page is a plain-language summary and is not legal advice.</p>
        </div>
      </div>
    </SiteShell>
  );
}
