import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TEMPLATES } from '../utils/templates';
import { TEMPLATE_CATEGORIES } from '../utils/constants';
import { PublicNav } from '../components/layout/PublicNav';
import { Footer } from '../components/layout/Footer';
import '../styles/public-dark.css';

export const PublicTemplates: React.FC = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');

  const templateList = Object.entries(TEMPLATES).map(([id, tpl]) => ({ id, ...tpl }));
  const filteredTemplates = activeCategory === 'all'
    ? templateList
    : templateList.filter(t => t.id === activeCategory || t.label.toLowerCase().includes(activeCategory.toLowerCase()));

  return (
    <div className="pd-root">
      <PublicNav dark />

      {/* ── Hero ── */}
      <div className="pd-hero" style={{ paddingTop: '140px' }}>
        <div className="pd-hero-dot-grid" aria-hidden />
        <div className="pd-hero-glow" aria-hidden />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="pd-label">// Templates</div>
          <h1 className="pd-h1">Template Gallery</h1>
          <p className="pd-lead">
            Jumpstart your architecture. Browse pre-built canonical schemas designed for production scale.
          </p>
        </div>
      </div>

      {/* ── Filter tabs ── */}
      <section className="pd-section" style={{ paddingBottom: '0' }}>
        <div className="pd-inner--wide">
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '40px' }}>
            {TEMPLATE_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                className={`pd-template-filter-btn${activeCategory === cat.id ? ' pd-template-filter-btn--active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Grid ── */}
      <section className="pd-section" style={{ paddingTop: '0' }}>
        <div className="pd-inner--wide">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {filteredTemplates.map(tpl => (
              <div
                key={tpl.id}
                className="pd-card"
                style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
              >
                {/* Mini schema preview */}
                <div className="pd-code-block" style={{ padding: '14px 16px', marginBottom: '4px' }}>
                  <div style={{ fontFamily: 'var(--pd-mono)', fontSize: '11px', color: 'var(--pd-muted)', marginBottom: '6px' }}>// {tpl.label}</div>
                  {tpl.tables.slice(0, 3).map((t: { name: string }) => (
                    <div key={t.name} style={{ fontFamily: 'var(--pd-mono)', fontSize: '12px', color: 'var(--pd-text)', lineHeight: 1.6 }}>
                      <span className="tok-keyword">model </span>
                      <span className="tok-name">{t.name}</span>
                    </div>
                  ))}
                  {tpl.tables.length > 3 && (
                    <div style={{ fontFamily: 'var(--pd-mono)', fontSize: '11px', color: 'var(--pd-muted)', marginTop: '4px' }}>
                      + {tpl.tables.length - 3} more tables
                    </div>
                  )}
                </div>

                <h3 className="pd-h3" style={{ fontSize: '16px', margin: 0 }}>{tpl.label}</h3>
                <p className="pd-body-text" style={{ fontSize: '13px', flex: 1 }}>{tpl.description}</p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ fontFamily: 'var(--pd-mono)', fontSize: '11px', color: 'var(--pd-brand)', background: 'var(--pd-brand-glow)', padding: '3px 8px', borderRadius: '3px' }}>
                    {tpl.tables.length} tables
                  </span>
                  <button
                    onClick={() => navigate(`/?template=${tpl.id}#demo-anchor`)}
                    className="pd-btn-primary"
                    style={{ padding: '7px 14px', fontSize: '12px' }}
                  >
                    Use template
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
