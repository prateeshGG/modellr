import { useNavigate } from 'react-router-dom';
import { PublicNav } from '../components/layout/PublicNav';
import { Footer } from '../components/layout/Footer';
import { Bot, Users, ExternalLink, Database, Shield, History } from 'lucide-react';

export function Features() {
  const navigate = useNavigate();

  return (
    <div style={{ background: 'var(--canvas-bg)', minHeight: '100vh', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column' }}>
      
      <PublicNav />

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '64px 20px', flex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <h1 style={{ fontSize: '48px', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '16px' }}>Database Design, <span style={{ color: 'rgb(162, 107, 252)' }}>Redefined.</span></h1>
          <p style={{ fontSize: '20px', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
            Everything you need to architect, collaborate, and deploy robust database structures instantly.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '32px' }}>
          
          <div style={{ background: 'var(--surface-base)', padding: '40px', borderRadius: '24px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ marginBottom: '24px', color: 'rgb(162, 107, 252)' }}><Bot size={32} /></div>
            <h3 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px' }}>AI Schema Generation</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '16px' }}>
              Describe your application in plain natural language. Our specialized LLM pipeline instantly spins up the corresponding relational tables, assigns primary and foreign keys, and maps out one-to-many relationships logically and accurately. No more tedious manual scaffolding.
            </p>
          </div>

          <div style={{ background: 'var(--surface-base)', padding: '40px', borderRadius: '24px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ marginBottom: '24px', color: 'rgb(162, 107, 252)' }}><Users size={32} /></div>
            <h3 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px' }}>Real-time Collaboration</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '16px' }}>
              Powered by Yjs CRDTs, SchemaForge enables true multiplayer editing. Invite your backend team and watch their live cursors fly around the canvas. All edits, table creations, and line drawings synchronize natively in milliseconds with zero merge conflicts.
            </p>
          </div>

          <div style={{ background: 'var(--surface-base)', padding: '40px', borderRadius: '24px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ marginBottom: '24px', color: 'rgb(162, 107, 252)' }}><ExternalLink size={32} /></div>
            <h3 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px' }}>Intelligent Exporting</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '16px' }}>
              Your visual design isn't locked in. Export it globally as generic SQL DDL blocks, or specifically targeted `schema.prisma` files, TypeORM entity typescript blocks, and Drizzle ORM mappings. Generate `ALTER TABLE` diff migrations instantly.
            </p>
          </div>

          <div style={{ background: 'var(--surface-base)', padding: '40px', borderRadius: '24px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ marginBottom: '24px', color: 'rgb(162, 107, 252)' }}><Database size={32} /></div>
            <h3 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px' }}>Live DB Introspection</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '16px' }}>
              Already have a deployed Postgres database? Paste a secure read-only connection string into our Live Import tool, and watch SchemaForge automatically reverse-engineer your `information_schema` into a beautiful, fully laid-out visual canvas.
            </p>
          </div>

          <div style={{ background: 'var(--surface-base)', padding: '40px', borderRadius: '24px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ marginBottom: '24px', color: 'rgb(162, 107, 252)' }}><Shield size={32} /></div>
            <h3 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px' }}>Zero-Trust Auth & RBAC</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '16px' }}>
              Share schemas securely. Invite clients or stakeholders as 'Viewers' using simple magic links. Our robust zero-trust layer ensures that read-only guests can navigate the canvas but absolutely cannot mutate your critical production structures.
            </p>
          </div>

          <div style={{ background: 'var(--surface-base)', padding: '40px', borderRadius: '24px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ marginBottom: '24px', color: 'rgb(162, 107, 252)' }}><History size={32} /></div>
            <h3 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px' }}>Unlimited Snapshots</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '16px' }}>
              Experiment fearlessly. Our deep integration with Zundo ensures that every major architectural shift you make is securely tracked. Point-in-time time travel lets you instantly restore or abandon massive sweeping layout changes with one click.
            </p>
          </div>

        </div>

        <div style={{ textAlign: 'center', marginTop: '80px', padding: '64px', background: 'var(--surface-raised)', borderRadius: '24px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '24px' }}>Ready to optimize your workflow?</h2>
          <button onClick={() => navigate('/login')} style={{ background: 'rgb(162, 107, 252)', color: '#fff', padding: '16px 32px', borderRadius: '12px', fontSize: '1.2rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}>Start building free</button>
        </div>

      </div>
      <Footer />
    </div>
  );
}
