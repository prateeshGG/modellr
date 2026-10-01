import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TEMPLATES, getTemplate } from '../utils/templates';
import { TEMPLATE_CATEGORIES } from '../utils/constants';
import { createProject } from '../lib/projectStore';
import { useUIStore } from '../store/ui';
import { TemplatePreviewModal } from '../components/dashboard/TemplatePreviewModal';
import './TemplateGallery.css';



export const TemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const handleUseTemplate = async (templateId: string) => {
    const tpl = getTemplate(templateId);
    if (!tpl) return;
    try {
      const project = await createProject({
        name: tpl.label + ' starter',
        canvas_state: { tables: tpl.tables, relationships: tpl.relationships },
      });
      navigate(`/app/${project.id}`);
    } catch {
      useUIStore.getState().showToast('Could not create the project (browser storage may be full or blocked).', 'error');
    }
  };

  const templateList = Object.entries(TEMPLATES).map(([id, tpl]) => ({ id, ...tpl }));
  const filteredTemplates = activeCategory === 'all' 
    ? templateList 
    : templateList.filter(t => t.id === activeCategory || t.label.toLowerCase().includes(activeCategory.toLowerCase()));

  return (
    <div style={{ display: 'flex', width: '100%', minHeight: '100%' }}>
      
      <div className="templates-sidebar">
        <div className="category-title">Categories</div>
        {TEMPLATE_CATEGORIES.map(cat => (
          <div 
            key={cat.id} 
            className={`category-item ${activeCategory === cat.id ? 'category-item--active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            {cat.label}
          </div>
        ))}
      </div>

      <main className="templates-main">
        <header style={{ marginBottom: '36px' }}>
          <h1 style={{ fontFamily: "'Syne','Geist',sans-serif", fontSize: '28px', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.03em', color: '#e8e8f0' }}>Template Gallery</h1>
          <p style={{ color: '#6b6b80', fontSize: '14px', margin: 0, fontFamily: "'Instrument Sans','Geist',sans-serif" }}>Start with a battle-tested database architecture.</p>
        </header>

        <div className="gallery-grid">
          {filteredTemplates.map(tpl => (
            <div key={tpl.id} className="template-card" onClick={() => setSelectedTemplateId(tpl.id)}>
              <div className="template-thumb">
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '4px' }}>{tpl.label}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{tpl.tables.length} tables rendered</div>
                </div>
              </div>
              <div className="template-content">
                <h3 className="template-name">{tpl.label}</h3>
                <p className="template-desc">{tpl.description}</p>
                <div className="template-footer">
                  <span className="template-badge">Starter</span>
                  <button 
                    className="btn-primary" 
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                    onClick={(e) => { e.stopPropagation(); handleUseTemplate(tpl.id); }}
                  >
                    Use Template
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {selectedTemplateId && (
        <TemplatePreviewModal 
          templateId={selectedTemplateId} 
          onClose={() => setSelectedTemplateId(null)}
          onUse={() => handleUseTemplate(selectedTemplateId)}
        />
      )}
    </div>
  );
};
