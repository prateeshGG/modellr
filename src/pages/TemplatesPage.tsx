import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TEMPLATES, getTemplate } from '../utils/templates';
import { TEMPLATE_CATEGORIES } from '../utils/constants';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { useUIStore } from '../store/ui';
import { TemplatePreviewModal } from '../components/dashboard/TemplatePreviewModal';
import './TemplateGallery.css';



export const TemplatesPage: React.FC = () => {
  const { session } = useAuthStore();
  const showDialog = useUIStore((s) => s.showDialog);
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const handleUseTemplate = async (templateId: string) => {
    // Fix #78: guests get a sign-in prompt instead of a silent no-op
    if (!session?.user?.id) {
      showDialog({
        title: 'Sign in to use templates',
        message: 'Create a free account to save this template to your dashboard and start building.',
        type: 'alert',
      });
      return;
    }
    
    // Check limit (shared with Dashboard logic)
    const { count } = await supabase
      .from('schemas')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', session.user.id);
      
    if (count !== null && count >= 3) {
      showDialog({
        title: 'Upgrade Required',
        message: 'Free tier limit reached (3 schemas). Upgrade to Pro to use more templates.',
        type: 'alert'
      });
      return;
    }

    const tpl = getTemplate(templateId);
    if (!tpl) return;

    const { data, error } = await supabase
      .from('schemas')
      .insert([{ 
        owner_id: session.user.id, 
        name: tpl.label + ' Starter',
        canvas_state: { tables: tpl.tables, relationships: tpl.relationships, viewport: { x: 0, y: 0, zoom: 1 } }
      }])
      .select()
      .single();

    if (error || !data) {
      useUIStore.getState().showToast('Failed to create schema from template. Try again.', 'error');
      return;
    }
    navigate(`/app/${data.id}`);
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
