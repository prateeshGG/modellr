export const DOCS_NAV = [
  {
    title: 'Guides',
    items: [
      { id: 'getting-started', label: 'Getting started' },
      { id: 'import', label: 'Importing' },
      { id: 'export', label: 'Exporting' },
      { id: 'snapshots-diff', label: 'Snapshots and diff' },
      { id: 'sharing', label: 'Sharing and embeds' },
      { id: 'ai-setup', label: 'AI (your own key)' },
      { id: 'backup', label: 'Backup and restore' },
    ],
  },
  {
    title: 'Reference',
    items: [
      { id: 'shortcuts', label: 'Keyboard shortcuts' },
      { id: 'examples', label: 'Templates' },
      { id: 'self-hosting', label: 'Self-hosting' },
      { id: 'notes', label: 'What Modellr does not do' },
    ],
  },
] as const;

export const docsPath = (id: string) => (id === 'getting-started' ? '/docs' : `/docs/${id}`);

