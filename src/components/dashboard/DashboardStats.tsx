import React, { useState } from 'react';
import type { Project } from '../../lib/projectStore';

interface DashboardStatsProps {
  projects: Project[];
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ projects }) => {
  // Captured once per mount: calling Date.now() during render is impure.
  const [now] = useState(() => Date.now());
  const totalTables = projects.reduce((acc, p) => acc + (p.canvas_state?.tables?.length ?? 0), 0);
  const lastActive = projects.length > 0 ? Math.max(...projects.map((p) => new Date(p.updated_at).getTime())) : null;
  const hours = lastActive === null ? null : Math.floor((now - lastActive) / 3_600_000);
  const lastActivity = hours === null ? 'Never' : hours < 1 ? 'Just now' : hours < 48 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;

  return (
    <div className="dashboard-stats-grid">
      <div className="stat-card">
        <div className="stat-label">Schemas</div>
        <div className="stat-value">{projects.length}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Total tables</div>
        <div className="stat-value" style={{ color: '#ae7aff' }}>{totalTables}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Last activity</div>
        <div className="stat-value">{lastActivity}</div>
      </div>
    </div>
  );
};
