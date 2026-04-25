import { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
const Editor = lazy(() => import('./pages/Editor'));
const Home = lazy(() => import('./pages/Home'));
const EmbedViewer = lazy(() => import('./pages/EmbedViewer'));

const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Pricing = lazy(() => import('./pages/Pricing').then(m => ({ default: m.Pricing })));
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
const DbdiagramCompare = lazy(() => import('./pages/compare/DbdiagramCompare').then(m => ({ default: m.DbdiagramCompare })));
const DrawsqlCompare = lazy(() => import('./pages/compare/DrawsqlCompare').then(m => ({ default: m.DrawsqlCompare })));
const CompareIndex = lazy(() => import('./pages/compare/CompareIndex').then(m => ({ default: m.CompareIndex })));
const About = lazy(() => import('./pages/About').then(m => ({ default: m.About })));
const Contact = lazy(() => import('./pages/Contact').then(m => ({ default: m.Contact })));
const BlogIndex = lazy(() => import('./pages/BlogIndex').then(m => ({ default: m.BlogIndex })));
const BlogPost = lazy(() => import('./pages/BlogPost').then(m => ({ default: m.BlogPost })));
import { AppLayout } from './components/layout/AppLayout';
import { DialogModal } from './components/shared/DialogModal';

export default function App() {
  const { initialize, isLoading, session } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading) {
    return <div style={{ color: '#fff', padding: '50px' }}>Loading session...</div>;
  }

  return (
    <BrowserRouter>
      <DialogModal />
      <Suspense fallback={<div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Loading...</div>}>
        <Routes>
        {/* Marketing Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/features" element={<Features />} />
        <Route path="/templates" element={<PublicTemplates />} />
        <Route path="/use-cases/saas-database-schema" element={<SaasSchema />} />
        <Route path="/use-cases/ecommerce-schema" element={<EcommerceSchema />} />
        <Route path="/use-cases/auth-schema" element={<AuthSchema />} />
        <Route path="/compare" element={<CompareIndex />} />
        <Route path="/compare/dbdiagram" element={<DbdiagramCompare />} />
        <Route path="/compare/drawsql" element={<DrawsqlCompare />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/blog" element={<BlogIndex />} />
        <Route path="/blog/:id" element={<BlogPost />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="/embed/:id" element={<EmbedViewer />} />
        <Route path="/login" element={<Login />} />
        {/* Shell Wrapped App Routes */}
        <Route element={<AppLayout />}>
          <Route path="/app" element={session ? <Dashboard /> : <Navigate to="/login" replace />} />
          <Route path="/app/templates" element={session ? <TemplatesPage /> : <Navigate to="/login" replace />} />
          <Route path="/app/settings" element={session ? <Settings /> : <Navigate to="/login" replace />} />
        </Route>
        
        {/* The Core Editor Canvas (No Sidebar) */}
        <Route path="/app/:id" element={
          session ? (
            <div style={{ height: '100vh', width: '100vw', overflow: 'hidden' }}>
              <Editor />
            </div>
          ) : <Navigate to="/login" replace />
        } />
        
        {/* Stateless Shared Link Viewer */}
        <Route path="/app/shared" element={
          <div style={{ height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--canvas-bg)' }}>
            <Editor isSharedView={true} />
          </div>
        } />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
