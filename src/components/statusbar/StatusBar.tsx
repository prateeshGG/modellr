import React from 'react';
import { useSchemaStore } from '../../store/schema';
import { useUIStore } from '../../store/ui';
import './StatusBar.css';

export const StatusBar: React.FC = () => {
  const { tables, relationships, isSaving, lastSaved } = useSchemaStore();
  const { density, setDensity } = useUIStore();

  const totalFields = tables.reduce((acc, t) => acc + t.fields.length, 0);

  const savedLabel = isSaving
    ? 'Saving…'
    : lastSaved
    ? 'Saved'
    : '';

  return (
    <footer className="statusbar" role="status" aria-label="Schema status">
      {/* Left: counts */}
      <div className="statusbar__left">
        <span className="statusbar__stat">{tables.length} tables</span>
        <span className="statusbar__dot">·</span>
        <span className="statusbar__stat">{totalFields} fields</span>
        <span className="statusbar__dot">·</span>
        <span className="statusbar__stat">{relationships.length} relationships</span>
      </div>

      {/* Center: autosave */}
      <div className="statusbar__center">
        {savedLabel && (
          <span className={`statusbar__save-status ${isSaving ? '' : 'statusbar__save-status--saved'}`}>
            {savedLabel}
          </span>
        )}
      </div>

      {/* Right: density + zoom */}
      <div className="statusbar__right">
        <div className="density-toggle" role="group" aria-label="Node density">
          <button
            className={`density-btn ${density === 'comfortable' ? 'density-btn--active' : ''}`}
            onClick={() => setDensity('comfortable')}
            title="Comfortable density"
          >
            ≡
          </button>
          <button
            className={`density-btn ${density === 'compact' ? 'density-btn--active' : ''}`}
            onClick={() => setDensity('compact')}
            title="Compact density"
          >
            ≣
          </button>
        </div>

      </div>
    </footer>
  );
};
