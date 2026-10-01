import type { ReactNode } from 'react';
import { useSeo, type SeoOptions } from '../../lib/seo';
import { SiteFooter } from './SiteFooter';
import { SiteNav } from './SiteNav';

/** Page frame for every public page: skip link, nav, main landmark, footer, and per-route SEO. */
export function SiteShell({ children, ...seo }: SeoOptions & { children: ReactNode }) {
  useSeo(seo);
  return (
    <div className="n-root">
      <a className="n-skip" href="#main">Skip to content</a>
      <SiteNav />
      <main id="main">{children}</main>
      <SiteFooter />
    </div>
  );
}

/** Inner-page heading block (eyebrow, H1, lead). */
export function PageHead({ eyebrow, title, lead, children }: { eyebrow: string; title: ReactNode; lead?: ReactNode; children?: ReactNode }) {
  return (
    <section className="n-pagehead">
      <div className="n-dots" aria-hidden="true" />
      <div className="n-wrap">
        <span className="n-eyebrow">{eyebrow}</span>
        <h1 className="n-h1">{title}</h1>
        {lead && <p className="n-lead">{lead}</p>}
        {children}
      </div>
    </section>
  );
}
