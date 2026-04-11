// Layout wrapper for documentation 

interface DocsLayoutProps {
  currentArticle: string;
  onSelect: (id: string) => void;
  children: React.ReactNode;
}

export const DocsLayout: React.FC<DocsLayoutProps> = ({ currentArticle, onSelect, children }) => {

  const navGroups = [
    {
      title: 'Documentation',
      items: [
        { id: 'getting-started', label: 'Getting Started' },
        { id: 'ai-usage', label: 'AI Usage' },
      ],
    },
    {
      title: 'Exports',
      items: [
        { id: 'export-prisma', label: 'Prisma' },
        { id: 'export-drizzle', label: 'Drizzle' },
        { id: 'export-sql', label: 'SQL / DBML' },
      ],
    },
    {
      title: 'Resources',
      items: [
        { id: 'examples', label: 'Examples' },
        { id: 'notes', label: 'Notes & Limitations' },
      ],
    },
  ];

  return (
    <div className="docs-container">
      <aside className="docs-sidebar">
        <div className="docs-logo" style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '8px' }}>
          Documentation
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '32px', lineHeight: 1.4 }}>
          Learn how to design, generate, and export database schemas.
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
