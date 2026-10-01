import { SiteShell, PageHead } from '../components/site/SiteShell';
import { SupportLink } from '../components/shared/SupportLink';
import { DONATE_URL, REPO_URL } from '../config';

export function Contact() {
  return (
    <SiteShell route="/contact">
      <PageHead eyebrow="Contact" title="Found a bug? Tell us." lead="Modellr is an open-source project. Bugs, questions and ideas all go through GitHub." />
      <section className="n-section n-section--tight" style={{ paddingTop: 8 }}>
        <div className="n-wrap">
          <div className="n-grid-3">
            <a className="n-card" href={`${REPO_URL}/issues/new`} target="_blank" rel="noopener noreferrer">
              <span className="n-card__meta">Bug</span><h2 className="n-h3">Report a bug</h2>
              <p className="n-small">Open a GitHub issue. Include your browser, what you did, and a small example schema if you can.</p>
              <span className="n-arrow">Open an issue</span>
            </a>
            <a className="n-card" href={`${REPO_URL}/issues/new?title=Feature+request%3A+`} target="_blank" rel="noopener noreferrer">
              <span className="n-card__meta">Idea</span><h2 className="n-h3">Suggest a feature</h2>
              <p className="n-small">Describe the problem first; the solution can come second.</p>
              <span className="n-arrow">Open a feature request</span>
            </a>
            <a className="n-card" href={REPO_URL} target="_blank" rel="noopener noreferrer">
              <span className="n-card__meta">Source</span><h2 className="n-h3">Read the code</h2>
              <p className="n-small">Fork it, or send a pull request. Modellr is MIT licensed.</p>
              <span className="n-arrow">prateesh7777/modellr</span>
            </a>
          </div>
          {DONATE_URL && (
            <p className="n-small" style={{ marginTop: 32 }}>
              Optional: if Modellr saved you time you can <SupportLink className="n-link">buy the author a coffee</SupportLink>. It unlocks nothing.
            </p>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
