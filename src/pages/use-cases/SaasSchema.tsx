import { UseCasePage } from './UseCasePage';

export function SaasSchema() {
  return (
    <UseCasePage
      data={{
        path: '/use-cases/saas-database-schema',
        seoTitle: 'SaaS database schema example',
        description: 'A free multi-tenant SaaS database schema: organizations, users, members and subscriptions with foreign keys wired. Open it in the browser, change it, export SQL, Prisma or Drizzle.',
        eyebrow: 'Example · SaaS',
        h1: 'A multi-tenant SaaS database schema.',
        lead: 'The built-in Multi-tenant SaaS template has organizations, users, members and subscriptions. Add plans and usage tracking on the canvas.',
        templateId: 'saas',
        challengeTitle: 'Designing a SaaS database is harder than it looks.',
        challengeIntro: 'Most SaaS applications need the same core systems:',
        challenge: ['User authentication', 'Subscriptions and billing', 'Teams or organizations', 'Usage tracking'],
        tables: [
          { name: 'Users', desc: 'Stores authentication and profile data. Linked to organizations or workspaces.' },
          { name: 'Organizations / teams', desc: 'Enables multi-tenant architecture. Users can belong to multiple teams.' },
          { name: 'Subscriptions', desc: 'Tracks billing plans and status. Linked to Stripe or another payment provider.' },
          { name: 'Plans', desc: 'Defines pricing tiers.' },
          { name: 'Usage / events', desc: 'Tracks feature usage for metering.' },
        ],
        relationships: ['A user can belong to multiple organizations', 'An organization has one active subscription', 'Subscriptions map to plans', 'Usage is tracked per organization or user'],
        closingTitle: 'Get the structure right early',
        closingBody: 'Changing how tenants, memberships and subscriptions relate gets harder once there is data. Treat this as a starting point and adapt it to your own product.',
        ctaTitle: 'Start with this template and make it yours.',
      }}
    />
  );
}
