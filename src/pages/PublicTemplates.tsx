import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TEMPLATES } from '../utils/templates';
import { TEMPLATE_CATEGORIES } from '../utils/constants';
import { PublicNav } from '../components/layout/PublicNav';
import { Footer } from '../components/layout/Footer';
import './TemplateGallery.css';

export const PublicTemplates: React.FC = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('all');

  const templateList = Object.entries(TEMPLATES).map(([id, tpl]) => ({ id, ...tpl }));
  
  const filteredTemplates = activeCategory === 'all' 
    ? templateList 
    : templateList.filter(t => t.id === activeCategory || t.label.toLowerCase().includes(activeCategory.toLowerCase()));

  return (
    <div style={{ background: 'var(--canvas-bg)', minHeight: '100vh', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column' }}>
      
      <PublicNav />

      <div className="template-gallery" style={{ padding: '48px 20px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <h1 style={{ fontSize: '40px', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '16px' }}>Template Gallery</h1>
          <p style={{ fontSize: '18px', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
            Jumpstart your architecture. Browse pre-built canonical schemas designed for production scale.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '48px', flexWrap: 'wrap' }}>
          {TEMPLATE_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              style={{
                background: activeCategory === cat.id ? 'var(--surface-raised)' : 'transparent',
                border: activeCategory === cat.id ? '1px solid var(--border-hi)' : '1px solid var(--border-subtle)',
                color: activeCategory === cat.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s'
              }}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="gallery-grid">
          {filteredTemplates.map(tpl => (
            <div key={tpl.id} className="template-card">
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
                    onClick={() => navigate(`/?template=${tpl.id}#demo-anchor`)}
                    style={{ background: 'var(--brand)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
                  >
                    Use template
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
};
