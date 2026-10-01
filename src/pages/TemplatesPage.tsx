import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TEMPLATES, getTemplate } from '../utils/templates';
import { TEMPLATE_CATEGORIES, templateInCategory } from '../utils/constants';
import { createProject } from '../lib/projectStore';
import { useUIStore } from '../store/ui';
import { useSeo } from '../lib/seo';
import { MiniSchema } from '../components/site/MiniSchema';
import { TemplatePreviewModal } from '../components/dashboard/TemplatePreviewModal';

export function TemplatesPage() {
  useSeo({ title: 'Templates', noindex: true });
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const handleUseTemplate = async (templateId: string) => {
    const tpl = getTemplate(templateId);
    if (!tpl || creating) return;
    setCreating(true);
    try {
      const project = await createProject({
        name: `${tpl.label} starter`,
        canvas_state: { tables: tpl.tables, relationships: tpl.relationships },
      });
      navigate(`/app/${project.id}`);
    } catch {
      useUIStore.getState().showToast('Could not create the project (browser storage may be full or blocked).', 'error');
      setCreating(false);
    }
  };

  const list = Object.entries(TEMPLATES)
    .map(([id, tpl]) => ({ id, ...tpl }))
    .filter((t) => templateInCategory(t.id, activeCategory));

  return (
    <>
      <div className="n-main__head">
        <div>
          <span className="n-eyebrow">Templates</span>
          <h1 className="n-h2" style={{ marginTop: 10 }}>Template gallery</h1>
          <p className="n-small" style={{ marginTop: 6 }}>Start with a battle-tested database architecture. A copy opens as a new project.</p>
        </div>
      </div>

      <div className="n-toolbar" role="group" aria-label="Filter by category">
        {TEMPLATE_CATEGORIES.map((c) => (
          <button key={c.id} type="button" className="n-chip" aria-pressed={activeCategory === c.id} onClick={() => setActiveCategory(c.id)}>{c.label}</button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="n-empty">
          <h2 className="n-h3">No templates in that category yet.</h2>
          <button type="button" className="n-btn" onClick={() => setActiveCategory('all')}>Show all templates</button>
        </div>
      ) : (
        <div className="n-cards-fit">
          {list.map((tpl) => (
            <article key={tpl.id} className="n-card">
              <button type="button" className="n-card__art" style={{ border: 0, padding: 0, cursor: 'pointer', width: 'calc(100% + 16px)' }} onClick={() => setSelectedTemplateId(tpl.id)} aria-label={`Preview ${tpl.label}`}>
                <MiniSchema tables={tpl.tables} />
              </button>
              <span className="n-card__meta">{tpl.tables.length} tables</span>
              <h2 className="n-h3">{tpl.label}</h2>
              <p className="n-small">{tpl.description}</p>
              <div className="n-row" style={{ marginTop: 6 }}>
                <button type="button" className="n-btn n-btn--sm" onClick={() => handleUseTemplate(tpl.id)} disabled={creating}>Use template</button>
                <button type="button" className="n-btn n-btn--secondary n-btn--sm" onClick={() => setSelectedTemplateId(tpl.id)}>Preview</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {selectedTemplateId && (
        <TemplatePreviewModal templateId={selectedTemplateId} onClose={() => setSelectedTemplateId(null)} onUse={() => handleUseTemplate(selectedTemplateId)} />
      )}
    </>
  );
}
