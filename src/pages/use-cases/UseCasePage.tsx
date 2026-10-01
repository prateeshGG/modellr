import { Link } from 'react-router-dom';
import { SiteShell } from '../../components/site/SiteShell';
import { MiniSchema } from '../../components/site/MiniSchema';
import { TEMPLATES } from '../../utils/templates';

export interface UseCaseData {
  path: '/use-cases/saas-database-schema' | '/use-cases/ecommerce-schema' | '/use-cases/auth-schema';
  eyebrow: string;
  h1: string;
  lead: string;
  templateId: keyof typeof TEMPLATES;
  challengeTitle: string;
  challengeIntro: string;
  challenge: string[];
  tables: { name: string; desc: string }[];
  relationships: string[];
  closingTitle: string;
  closingBody: string;
  ctaTitle: string;
}

export function UseCasePage({ data }: { data: UseCaseData }) {
  const tpl = TEMPLATES[data.templateId];
  return (
    <SiteShell route={data.path}>
      <section className="n-pagehead">
        <div className="n-dots" aria-hidden="true" />
        <div className="n-wrap">
          <span className="n-eyebrow">{data.eyebrow}</span>
          <h1 className="n-h1">{data.h1}</h1>
          <p className="n-lead">{data.lead}</p>
          <div className="n-actions">
            <Link to="/app/templates" className="n-btn n-btn--lg">Use this template</Link>
            <Link to="/docs/import" className="n-arrow">Import your own schema</Link>
          </div>
        </div>
      </section>

      <section className="n-section n-section--tight" style={{ paddingTop: 24 }}>
        <div className="n-wrap n-grid-2" style={{ alignItems: 'center', gap: 48 }}>
          <div className="n-card">
            <div className="n-card__art"><MiniSchema tables={tpl.tables} label={`The ${tpl.label} template: ${tpl.tables.map((t) => t.name).join(', ')}`} /></div>
            <span className="n-card__meta">{tpl.label} template · {tpl.tables.length} tables</span>
            <p className="n-small">{tpl.description}</p>
          </div>
          <div className="n-stack">
            <h2 className="n-h2">{data.challengeTitle}</h2>
            <p className="n-lead" style={{ fontSize: '1rem' }}>{data.challengeIntro}</p>
            <ul className="n-stack" style={{ gap: 10 }}>
              {data.challenge.map((c) => <li key={c} className="n-row" style={{ gap: 10 }}><span className="n-badge n-badge--pk">+</span><span>{c}</span></li>)}
            </ul>
          </div>
        </div>
      </section>

      <section className="n-section n-section--tight">
        <div className="n-wrap n-grid-2" style={{ gap: 48, alignItems: 'start' }}>
          <div>
            <span className="n-eyebrow">Typical tables</span>
            <dl className="n-linklist" style={{ gridTemplateColumns: '1fr', borderTop: 0, paddingTop: 16, marginTop: 0 }}>
              {data.tables.map((t) => <div key={t.name}><dt>{t.name}</dt><dd>{t.desc}</dd></div>)}
            </dl>
          </div>
          <div className="n-stack">
            <span className="n-eyebrow">Relationships</span>
            <ul className="n-card" style={{ gap: 12 }}>
              {data.relationships.map((r) => <li key={r} className="n-small" style={{ color: 'var(--n-text)' }}>{r}</li>)}
            </ul>
            <h3 className="n-h3">{data.closingTitle}</h3>
            <p className="n-small">{data.closingBody}</p>
          </div>
        </div>
      </section>

      <section className="n-section n-cta">
        <div className="n-wrap n-center">
          <h2 className="n-h1">{data.ctaTitle}</h2>
          <p className="n-lead">Free and open source. Start from the template in your browser, edit it on the canvas, and export SQL, Prisma or Drizzle.</p>
          <div className="n-cta__actions"><Link to="/app/templates" className="n-btn n-btn--lg">Open the templates</Link></div>
        </div>
      </section>
    </SiteShell>
  );
}
