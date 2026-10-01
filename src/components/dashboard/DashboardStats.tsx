import { useState } from 'react';
import type { Project } from '../../lib/projectStore';

export function DashboardStats({ projects }: { projects: Project[] }) {
  // Captured once per mount: calling Date.now() during render is impure.
  const [now] = useState(() => Date.now());
  const totalTables = projects.reduce((acc, p) => acc + (p.canvas_state?.tables?.length ?? 0), 0);
  const lastActive = projects.length > 0 ? Math.max(...projects.map((p) => new Date(p.updated_at).getTime())) : null;
  const hours = lastActive === null ? null : Math.floor((now - lastActive) / 3_600_000);
  const lastActivity = hours === null ? 'Never' : hours < 1 ? 'Just now' : hours < 48 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;

  return (
    <div className="n-stats">
      <div className="n-stat"><span className="n-small">Schemas</span><b>{projects.length}</b></div>
      <div className="n-stat"><span className="n-small">Total tables</span><b>{totalTables}</b></div>
      <div className="n-stat"><span className="n-small">Last activity</span><b>{lastActivity}</b></div>
    </div>
  );
}
