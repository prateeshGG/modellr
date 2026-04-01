// Layout wrapper for documentation 

interface DocsLayoutProps {
  currentArticle: string;
  onSelect: (id: string) => void;
  children: React.ReactNode;
}

export const DocsLayout: React.FC<DocsLayoutProps> = ({ currentArticle, onSelect, children }) => {

  const navGroups = [
    {
      title: 'Introduction',
      items: [
        { id: 'intro', label: 'Welcome to SchemaForge' },
        { id: 'normalization', label: 'Normalization 101' },
        { id: 'canvas', label: 'The Visual Editor' },
        { id: 'relationships', label: 'Understanding Relationships' },
      ],
    },
    {
      title: 'Professional Sync',
      items: [
        { id: 'mcp', label: 'MCP & IDE Connection' },
      ],
    },
    {
      title: 'Collaboration & Porting',
      items: [
        { id: 'export', label: 'SQL & Prisma Exports' },
      ],
    },
  ];

  return (
    <div className="docs-container">
      <aside className="docs-sidebar">
        <div className="docs-logo" style={{ fontSize: '18px', color: 'var(--text-primary)' }}>
          Documentation
        </div>

        <nav>
          {navGroups.map((group) => (
            <div key={group.title} style={{ marginBottom: '32px' }}>
              <div className="docs-nav-section">{group.title}</div>
              {group.items.map((item) => (
                <div
                  key={item.id}
                  className={`docs-nav-item ${currentArticle === item.id ? 'docs-nav-item--active' : ''}`}
                  onClick={() => onSelect(item.id)}
                >
                  {item.label}
                </div>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <main className="docs-article-wrapper">
        <div className="docs-content">
          {children}
        </div>
      </main>
    </div>
  );
};
