import React from 'react';
import { Panel } from '@xyflow/react';
import { useSchemaStore } from '../../store/schema';
import { TEMPLATES } from '../../utils/templates';
import './EmptyState.css';

export const EmptyState: React.FC = () => {
  const { importTables } = useSchemaStore();

  const loadTemplate = (key: keyof typeof TEMPLATES) => {
    const t = TEMPLATES[key];
    importTables(t.tables, t.relationships);
  };

  return (
    <Panel position="top-center" style={{ top: '50%', transform: 'translate(-50%, -50%)' }}>
      <div className="empty-state">
        <div className="empty-state__card">
          <div className="empty-state__icon">⬡</div>
          <h2 className="empty-state__title">Start designing</h2>
          <p className="empty-state__sub">
            Double-click the canvas to add a table, drop a SQL file, or start from a template.
          </p>
          <div className="empty-state__templates">
            {(Object.keys(TEMPLATES) as (keyof typeof TEMPLATES)[]).map((key) => (
              <button
                key={key}
                className="template-chip"
                onClick={() => loadTemplate(key)}
              >
                {TEMPLATES[key].label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
};
