import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import './styles/global.css';
import './styles/night.css';

// Apply initial theme before React mounts (prevents flash)
const savedTheme = localStorage.getItem('sf-theme') ?? 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
