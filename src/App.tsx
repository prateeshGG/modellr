import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Editor from './pages/Editor';
import Home from './pages/Home';
import EmbedViewer from './pages/EmbedViewer';

import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Pricing } from './pages/Pricing';
import { Settings } from './pages/Settings';
import { Docs } from './pages/Docs';
import { TemplatesPage } from './pages/TemplatesPage';
import { Privacy } from './pages/Privacy';
import { Terms } from './pages/Terms';
import { Features } from './pages/Features';
import { PublicTemplates } from './pages/PublicTemplates';
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
      <Routes>
        {/* Marketing Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/features" element={<Features />} />
        <Route path="/templates" element={<PublicTemplates />} />
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
    </BrowserRouter>
  );
}
