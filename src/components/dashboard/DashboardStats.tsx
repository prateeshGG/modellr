import React from 'react';

interface DashboardStatsProps {
  schemas: any[];
  limit: number;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ schemas, limit }) => {
  const totalTables = schemas.reduce((acc, schema) => {
    try {
      const cs = typeof schema.canvas_state === 'string' ? JSON.parse(schema.canvas_state) : schema.canvas_state;
      return acc + ((cs?.tables?.length) || 0);
    } catch { return acc; }
  }, 0);

  const lastActiveDate = schemas.length > 0 ? new Date(Math.max(...schemas.map(s => new Date(s.updated_at).getTime()))) : null;
  const timeAgoHours = lastActiveDate ? Math.floor((Date.now() - lastActiveDate.getTime()) / (1000 * 60 * 60)) : null;
  const timeAgoStr = timeAgoHours === null ? 'Never' : (timeAgoHours < 1 ? 'Just now' : `${timeAgoHours}h ago`);

  return (
    <div className="dashboard-stats-grid">
      <div className="stat-card">
        <div className="stat-label">Schemas Used</div>
        <div className="stat-value">{schemas.length} <span className="stat-sub">/ {limit}</span></div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Total Tables</div>
        <div className="stat-value" style={{ color: 'rgb(162, 107, 252)' }}>{totalTables}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Collaborators</div>
        <div className="stat-value">1</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Last Activity</div>
        <div className="stat-value">{timeAgoStr}</div>
      </div>
    </div>
  );
};
