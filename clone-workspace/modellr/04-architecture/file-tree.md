# File tree (implementation)

```
src/styles/night.css            design system (tokens + all n-* components), imported once in main.tsx
src/styles/tokens.css           editor tokens (re-themed: neutral near-black, orange brand)
src/lib/routeMeta.ts            titles + descriptions for every public route (shared with scripts/postbuild-seo.mjs)
src/lib/seo.ts                  useSeo(): title, description, canonical (VITE_SITE_URL), social tags, robots noindex
src/lib/highlight.tsx           tiny syntax colouring for marketing/docs code panels
src/components/site/            SiteShell, PageHead, SiteNav, SiteFooter, Logo, ThemeToggle, MiniSchema, Art, icons, navLinks
src/components/docs/            DocsLayout, docsNav, Articles (content)
src/components/layout/          AppLayout (rail, tab bar), GitHubMark
src/components/dashboard/       DashboardHeader, DashboardStats, ProjectCard, TemplatePreviewModal
src/components/shared/          DialogModal (+css), Toast (mounted once in App), SupportLink
src/pages/                      Home, Features, PublicTemplates, Docs, BlogIndex, BlogPost, About, Contact, Privacy, Terms, NotFound,
                                use-cases/*, Dashboard, TemplatesPage, Settings, Editor, EmbedViewer
scripts/postbuild-seo.mjs       per-route static HTML, robots.txt, sitemap.xml
clone-workspace/modellr/        research, IA, flows, DESIGN.md, assertions, mockups (v2) and verification scripts
```
