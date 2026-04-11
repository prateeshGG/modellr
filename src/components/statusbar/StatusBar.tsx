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

      {/* Right: density */}
      {/* Fix #83: expose all 3 density options — spacious was previously missing */}
      <div className="statusbar__right">
        <div className="density-toggle" role="group" aria-label="Node density">
          {/* Fix #84: add aria-pressed for accessibility */}
          <button
            className={`density-btn ${density === 'spacious' ? 'density-btn--active' : ''}`}
            onClick={() => setDensity('spacious')}
            title="Spacious density"
            aria-pressed={density === 'spacious'}
          >
            ☰
          </button>
          <button
            className={`density-btn ${density === 'comfortable' ? 'density-btn--active' : ''}`}
            onClick={() => setDensity('comfortable')}
            title="Comfortable density"
            aria-pressed={density === 'comfortable'}
          >
            ≡
          </button>
          <button
            className={`density-btn ${density === 'compact' ? 'density-btn--active' : ''}`}
            onClick={() => setDensity('compact')}
            title="Compact density"
            aria-pressed={density === 'compact'}
          >
            ≣
          </button>
        </div>
      </div>
    </footer>
  );
};
