import { IconPlus } from '../site/icons';

interface DashboardHeaderProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  onCreateNew: () => void;
  onImport: () => void;
  onBackup: () => void;
  canBackup: boolean;
  creating?: boolean;
}

export function DashboardHeader({ searchQuery, setSearchQuery, onCreateNew, onImport, onBackup, canBackup, creating }: DashboardHeaderProps) {
  return (
    <div className="n-main__head">
      <div>
        <span className="n-eyebrow">Projects</span>
        <h1 className="n-h2" style={{ marginTop: 10 }}>My projects</h1>
        <p className="n-small" style={{ marginTop: 6 }}>Design and export database schemas. Everything stays in this browser.</p>
      </div>
      <div className="n-row">
        <div className="n-search">
          <input type="search" className="n-input" placeholder="Search projects" aria-label="Search projects" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <button type="button" className="n-btn n-btn--secondary" onClick={onImport}>Import JSON</button>
        <button type="button" className="n-btn n-btn--secondary" onClick={onBackup} disabled={!canBackup}>Backup all</button>
        <button type="button" className="n-btn" onClick={onCreateNew} disabled={creating}><IconPlus /> New schema</button>
      </div>
    </div>
  );
}
