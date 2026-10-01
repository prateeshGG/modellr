import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('xyflow')) return 'vendor-flow'; // @xyflow/react
            if (id.includes('codemirror') || id.includes('@uiw') || id.includes('@lezer')) return 'vendor-cm';
            if (id.includes('elkjs')) return 'vendor-elk';
            if (id.includes('framer-motion') || id.includes('lucide-react')) return 'vendor-ui';
            if (id.includes('react') || id.includes('zustand') || id.includes('react-dom') || id.includes('react-router')) return 'vendor-react';
            return 'vendor-core';
          }
        }
      }
    }
  }
})
