import { Lock, Plus } from 'lucide-react';

interface DashboardHeaderProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  onCreateNew: () => void;
  limitReached: boolean;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ 
  searchQuery, 
  setSearchQuery, 
  onCreateNew, 
  limitReached 
}) => {
  return (
    <div className="dashboard-header">
      <div>
        <h1>My Projects</h1>
        <p className="dashboard-description">Design, collaborate, and ship your database schemas.</p>
      </div>
      
      <div className="header-actions">
        <div className="search-container">
          <input 
            type="text" 
            className="search-input" 
            placeholder="Search projects..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '16px' }}
          />
        </div>
        
        <button 
          className="btn-primary" 
          onClick={onCreateNew}
          disabled={limitReached}
          style={{ opacity: limitReached ? 0.6 : 1, cursor: limitReached ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          {limitReached ? (
            <>
              <Lock size={14} />
              Limit Reached
            </>
          ) : (
            <>
              <Plus size={16} />
              New Schema
            </>
          )}
        </button>
      </div>
    </div>
  );
};
