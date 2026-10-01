import { Plus } from 'lucide-react';

interface DashboardHeaderProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  onCreateNew: () => void;
  onImport: () => void;
  onBackup: () => void;
  canBackup: boolean;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  searchQuery,
  setSearchQuery,
  onCreateNew,
  onImport,
  onBackup,
  canBackup,
}) => {
  return (
    <div className="dashboard-header">
      <div>
        <h1>My projects</h1>
        <p className="dashboard-description">Design and export database schemas. Everything stays in your browser.</p>
      </div>

      <div className="header-actions">
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search projects..."
            aria-label="Search projects"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '16px' }}
          />
        </div>

        <button className="action-btn" onClick={onImport}>Import JSON</button>
        <button className="action-btn" onClick={onBackup} disabled={!canBackup}>Backup all</button>

        <button className="btn-primary" onClick={onCreateNew} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={16} />
          New schema
        </button>
      </div>
    </div>
  );
};
