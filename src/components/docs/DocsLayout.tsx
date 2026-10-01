// Layout wrapper for documentation 

interface DocsLayoutProps {
  currentArticle: string;
  onSelect: (id: string) => void;
  children: React.ReactNode;
}

export const DocsLayout: React.FC<DocsLayoutProps> = ({ currentArticle, onSelect, children }) => {

  const navGroups = [
    {
      title: 'Guides',
      items: [
        { id: 'getting-started', label: 'Getting Started' },
        { id: 'import', label: 'Importing' },
        { id: 'export', label: 'Exporting' },
        { id: 'snapshots-diff', label: 'Snapshots & Diff' },
        { id: 'sharing', label: 'Sharing & Embeds' },
        { id: 'ai-setup', label: 'AI (Your Own Key)' },
        { id: 'backup', label: 'Backup & Restore' },
      ],
    },
    {
      title: 'Reference',
      items: [
        { id: 'shortcuts', label: 'Keyboard Shortcuts' },
        { id: 'examples', label: 'Templates' },
        { id: 'self-hosting', label: 'Self-hosting' },
        { id: 'notes', label: 'What Modellr Does Not Do' },
      ],
    },
  ];

  return (
    <div className="docs-container">
      <aside className="docs-sidebar">
        <div className="docs-logo" style={{ fontSize: '17px', marginBottom: '6px' }}>
          Documentation
        </div>
        <div style={{ color: '#6b6b80', fontSize: '12px', marginBottom: '28px', lineHeight: 1.5, fontFamily: "'Instrument Sans','Geist',sans-serif" }}>
          Learn how to design, import, and export database schemas with Modellr.
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
