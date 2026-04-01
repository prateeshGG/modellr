import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ACCENT_HEX } from '../../utils/constants';

interface ProjectCardProps {
  schema: any;
  onDuplicate: (e: React.MouseEvent, schema: any) => void;
  onExport: (e: React.MouseEvent, schema: any) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ schema, onDuplicate, onExport, onDelete }) => {
  const navigate = useNavigate();
  
  let tables: any[] = [];
  try {
    const cs = typeof schema.canvas_state === 'string' ? JSON.parse(schema.canvas_state) : schema.canvas_state;
    tables = cs?.tables || [];
  } catch {}

  const lastUpdate = new Date(schema.updated_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });

  return (
    <div className="project-card" onClick={() => navigate(`/app/${schema.id}`)}>
      <div className="project-thumbnail">
        <div className="mini-map-container">
          {tables.slice(0, 6).map((t, idx) => {
            // Simple deterministic layout for the mini-map
            const x = (idx % 3) * 70 - 70;
            const y = Math.floor(idx / 3) * 40 - 20;
            
            return (
              <div 
                key={t.id} 
                className="mini-map-table"
                style={{ 
                  transform: `translate(${x}px, ${y}px) scale(0.8)`,
                  opacity: 0.7 
                }}
              >
                <div className="mini-map-header" style={{ background: ACCENT_HEX[t.accentColor] || 'rgb(162, 107, 252)' }}></div>
                <div style={{ width: '80%', height: '2px', background: 'var(--border-default)', marginBottom: '1px' }}></div>
                <div style={{ width: '60%', height: '2px', background: 'var(--border-default)', marginBottom: '1px' }}></div>
                <div style={{ width: '70%', height: '2px', background: 'var(--border-default)' }}></div>
              </div>
            );
          })}
          {tables.length === 0 && <div style={{ fontSize: '12px', color: 'var(--text-muted)', opacity: 0.5 }}>Empty Canvas</div>}
        </div>
      </div>

      <div className="project-info">
        <div className="project-title-row">
          <h3 className="project-title">{schema.name}</h3>
          {schema.is_public && <span className="status-badge status-badge--public">Public</span>}
        </div>
        
        <div className="project-meta">
          {tables.length} tables · Updated {lastUpdate}
        </div>

        <div className="project-actions">
          <button className="action-btn" onClick={(e) => { e.stopPropagation(); navigate(`/app/${schema.id}`) }}>Open</button>
          <button className="action-btn" onClick={(e) => onDuplicate(e, schema)}>Copy</button>
          <button className="action-btn" onClick={(e) => onExport(e, schema)}>Export</button>
          <button className="action-btn action-btn--danger" onClick={(e) => onDelete(e, schema.id)}>Delete</button>
        </div>
      </div>
    </div>
  );
};
