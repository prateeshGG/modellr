import React from 'react';

interface DashboardStatsProps {
  schemas: any[];
  limit: number;
  userTier: string;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ schemas, limit, userTier }) => {
  const totalTables = schemas.reduce((acc, schema) => {
    try {
      const cs = typeof schema.canvas_state === 'string' ? JSON.parse(schema.canvas_state) : schema.canvas_state;
      return acc + ((cs?.tables?.length) || 0);
    } catch { return acc; }
  }, 0);

  const lastActiveDate = schemas.length > 0 ? new Date(Math.max(...schemas.map(s => new Date(s.updated_at).getTime()))) : null;
  const timeAgoHours = lastActiveDate ? Math.floor((Date.now() - lastActiveDate.getTime()) / (1000 * 60 * 60)) : null;
  const timeAgoStr = timeAgoHours === null ? 'Never' : (timeAgoHours < 1 ? 'Just now' : `${timeAgoHours}h ago`);

  const isPro = userTier === 'pro';

  return (
    <div className="dashboard-stats-grid">
      <div className="stat-card">
        <div className="stat-label">Schemas Used</div>
        <div className="stat-value">{schemas.length} <span className="stat-sub">/ {limit === 999 ? '∞' : limit}</span></div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Total Tables</div>
        <div className="stat-value" style={{ color: '#ae7aff' }}>{totalTables}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Current Plan</div>
        <div className="stat-value" style={{ textTransform: 'capitalize', color: isPro ? '#f59e0b' : '#e8e8f0' }}>
          {userTier}
          {isPro && <span style={{ marginLeft: '8px', fontSize: '9px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '2px 6px', borderRadius: '3px', verticalAlign: 'middle', fontFamily: "'Geist Mono',monospace", letterSpacing: '0.06em' }}>PRO</span>}
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Last Activity</div>
        <div className="stat-value">{timeAgoStr}</div>
      </div>
    </div>
  );
};
