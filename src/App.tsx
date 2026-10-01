import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
const Editor = lazy(() => import('./pages/Editor'));
const Home = lazy(() => import('./pages/Home'));
const EmbedViewer = lazy(() => import('./pages/EmbedViewer'));

const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Docs = lazy(() => import('./pages/Docs').then(m => ({ default: m.Docs })));
const TemplatesPage = lazy(() => import('./pages/TemplatesPage').then(m => ({ default: m.TemplatesPage })));
const Privacy = lazy(() => import('./pages/Privacy').then(m => ({ default: m.Privacy })));
const Terms = lazy(() => import('./pages/Terms').then(m => ({ default: m.Terms })));
const Features = lazy(() => import('./pages/Features').then(m => ({ default: m.Features })));
const PublicTemplates = lazy(() => import('./pages/PublicTemplates').then(m => ({ default: m.PublicTemplates })));
const SaasSchema = lazy(() => import('./pages/use-cases/SaasSchema').then(m => ({ default: m.SaasSchema })));
const EcommerceSchema = lazy(() => import('./pages/use-cases/EcommerceSchema').then(m => ({ default: m.EcommerceSchema })));
const AuthSchema = lazy(() => import('./pages/use-cases/AuthSchema').then(m => ({ default: m.AuthSchema })));
const About = lazy(() => import('./pages/About').then(m => ({ default: m.About })));
const Contact = lazy(() => import('./pages/Contact').then(m => ({ default: m.Contact })));
const BlogIndex = lazy(() => import('./pages/BlogIndex').then(m => ({ default: m.BlogIndex })));
const BlogPost = lazy(() => import('./pages/BlogPost').then(m => ({ default: m.BlogPost })));
const NotFound = lazy(() => import('./pages/NotFound'));
import { AppLayout } from './components/layout/AppLayout';
import { DialogModal } from './components/shared/DialogModal';
import { AISettingsHost } from './components/ai/AISettingsDialog';

export default function App() {
  return (
    <BrowserRouter>
      <DialogModal />
      <AISettingsHost />
      <Suspense fallback={<div role="status" aria-live="polite" style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontFamily: "'Geist Variable', system-ui, sans-serif", fontSize: 14 }}>Loading…</div>}>
        <Routes>
        {/* Marketing Routes */}
        <Route path="/" element={<Home />} />
        {/* Retired routes: the app has no accounts or plans any more. */}
        <Route path="/pricing" element={<Navigate to="/" replace />} />
        <Route path="/login" element={<Navigate to="/app" replace />} />
        <Route path="/compare/*" element={<Navigate to="/" replace />} />
        <Route path="/features" element={<Features />} />
        <Route path="/templates" element={<PublicTemplates />} />
        <Route path="/use-cases/saas-database-schema" element={<SaasSchema />} />
        <Route path="/use-cases/ecommerce-schema" element={<EcommerceSchema />} />
        <Route path="/use-cases/auth-schema" element={<AuthSchema />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/blog" element={<BlogIndex />} />
        <Route path="/blog/:id" element={<BlogPost />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="/docs/:slug" element={<Docs />} />
        <Route path="/embed" element={<EmbedViewer />} />
        {/* Shell Wrapped App Routes */}
        <Route element={<AppLayout />}>
          <Route path="/app" element={<Dashboard />} />
          <Route path="/app/templates" element={<TemplatesPage />} />
          <Route path="/app/settings" element={<Settings />} />
        </Route>
        
        {/* The Core Editor Canvas (No Sidebar) */}
        <Route path="/app/:id" element={
          <div style={{ height: '100vh', width: '100vw', overflow: 'hidden' }}>
            <Editor />
          </div>
        } />

        {/* Stateless shared link viewer (read-only, schema travels in the URL hash) */}
        <Route path="/app/shared" element={
          <div style={{ height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--canvas-bg)' }}>
            <Editor isSharedView={true} />
          </div>
        } />
        <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
