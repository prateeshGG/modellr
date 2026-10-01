# Stage 2 — Information architecture and screen inventory

Smallest coherent structure that supports the requirements. No page exists "to look bigger".

## Navigation
- **Primary (public):** Features · Templates · Docs · Blog | GitHub (live star count) | **Open editor** (primary CTA).
- **Footer:** Product (Features, Templates, Docs, Open editor) · Examples (3 use cases) · Project (About, Blog, Contact) · Legal (Privacy, Terms) · Support link (when configured).
- **Mobile:** hamburger → full-screen sheet with large serif links, GitHub and CTA pinned at the bottom.
- **App shell (`/app/*`):** left rail on desktop (Projects, Templates, Settings, Docs), bottom tab bar on mobile.

## Screen inventory
| # | Route | Purpose | Primary user | Primary CTA | Required states |
|---|---|---|---|---|---|
| 1 | `/` Home | Explain + prove: live editor in the hero | everyone | Open the editor | default, video loaded/unloaded, FAQ open, star count unavailable |
| 2 | `/features` | Detail of each capability | evaluators | Open the editor | default |
| 3 | `/templates` | Starting points (4 templates) with category filter + preview | indie/student | Use template → creates project | filtered, empty filter, preview modal |
| 4 | `/docs` (+ `?a=slug`) | How-to articles (11), sidebar nav | users, contributors | — | article, mobile TOC drawer, not-found slug |
| 5 | `/blog`, `/blog/:id` | Educational posts | search visitors | Open the editor | index, post, unknown id → 404 |
| 6 | `/use-cases/*` (3) | SEO landing: schema examples with real tables | search visitors | Use this template | default |
| 7 | `/about` | Why it exists, open source | evaluators | View on GitHub | default |
| 8 | `/contact` | Report bugs / ideas (GitHub issues) | users | Open an issue | default |
| 9 | `/privacy`, `/terms` | Plain-language legal | everyone | — | default |
| 10 | **404** (new — today unknown routes render nothing) | Recovery | anyone | Go home / Open editor | default |
| 11 | `/app` Dashboard | Projects: create, search, import, backup, templates | returning user | New schema | empty, loading, many projects, storage-blocked warning, delete confirm |
| 12 | `/app/templates` | In-app template gallery | returning user | Use template | default, preview modal |
| 13 | `/app/settings` | AI key, backup/restore, delete all | returning user | Set up AI | AI configured/unconfigured, destructive confirm |
| 14 | `/app/:id` Editor | Core product | all | — | loading, missing project, read-only, shared-view banner |
| 15 | `/app/shared`, `/embed` | Read-only views from URL | recipients | Save a copy / Made with Modellr | damaged link |

## Core entities
Project, Table, Field, Relationship, Note, Group, Snapshot, Template, AI config.

## Editor chrome fixes (found by looking at real screenshots; to fix in implementation)
1. Top bar at ≤1200px: project name collapses to a clipped "U"; the search pill label wraps to two lines.
2. Minimap overlaps the lower-right table; bottom toolbar and zoom controls compete for the same strip.
3. Top-bar actions (Import, Diff, Share, Export) have no overflow strategy below ~1100px.
4. Mobile: the editor is unusable below ~760px; needs an honest "open on a larger screen" state with read-only viewing.
