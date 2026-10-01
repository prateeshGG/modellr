import { Link } from 'react-router-dom';
import { MiniSchema } from '../site/MiniSchema';
import type { Project } from '../../lib/projectStore';

interface ProjectCardProps {
  schema: Project;
  onDuplicate: (e: React.MouseEvent, schema: Project) => void;
  onExport: (e: React.MouseEvent, schema: Project) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
}

export function ProjectCard({ schema, onDuplicate, onExport, onDelete }: ProjectCardProps) {
  const tables = schema.canvas_state?.tables ?? [];
  const updated = new Date(schema.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const href = `/app/${schema.id}`;

  return (
    <article className="n-card n-project">
      <Link to={href} className="n-project__thumb" tabIndex={-1} aria-hidden="true">
        {tables.length > 0 ? <MiniSchema tables={tables} className="n-project__svg" /> : <span className="n-small">Empty canvas</span>}
      </Link>
      <div className="n-project__body">
        <h3 className="n-h4"><Link to={href} className="n-project__title">{schema.name}</Link></h3>
        <span className="n-card__meta">{tables.length} tables · updated {updated}</span>
        <div className="n-project__actions">
          <Link to={href} className="n-btn n-btn--sm">Open</Link>
          <button type="button" className="n-btn n-btn--secondary n-btn--sm" onClick={(e) => onDuplicate(e, schema)} aria-label={`Duplicate ${schema.name}`}>Copy</button>
          <button type="button" className="n-btn n-btn--secondary n-btn--sm" onClick={(e) => onExport(e, schema)} aria-label={`Export ${schema.name}`}>Export</button>
          <button type="button" className="n-btn n-btn--danger n-btn--sm" onClick={(e) => onDelete(e, schema.id)} aria-label={`Delete ${schema.name}`}>Delete</button>
        </div>
      </div>
    </article>
  );
}
