import { UseCasePage } from './UseCasePage';

export function AuthSchema() {
  return (
    <UseCasePage
      data={{
        path: '/use-cases/auth-schema',
        seoTitle: 'Authentication database schema example',
        description: 'A free authentication database schema: users, sessions and profiles with UUID keys. Open it in the browser, change it, export SQL, Prisma or Drizzle.',
        eyebrow: 'Example · Auth',
        h1: 'An authentication database schema.',
        lead: 'The built-in Auth & Users template has users, sessions and profiles. Add roles and permissions on the canvas.',
        templateId: 'auth',
        challengeTitle: "Auth is easy, until it isn't.",
        challengeIntro: 'Basic login is simple. But real-world systems need:',
        challenge: ['Sessions', 'Roles and permissions', 'OAuth support', 'Secure token handling'],
        tables: [
          { name: 'Users', desc: 'Account details.' },
          { name: 'Sessions', desc: 'Active logins.' },
          { name: 'Roles', desc: 'Access levels.' },
          { name: 'Permissions', desc: 'Fine-grained control.' },
        ],
        relationships: ['Users can have multiple roles (via a join table)', 'Roles map to permissions', 'Sessions belong to users'],
        closingTitle: 'Think through authentication early',
        closingBody: 'Retrofitting roles, sessions or token storage later is harder than planning them up front. Have your design reviewed against your own security requirements.',
        ctaTitle: 'Plan your auth tables before you build.',
      }}
    />
  );
}
