import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const api = {
  '/api/client': { target: 'http://127.0.0.1:5000', changeOrigin: true },
};

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    proxy: api,
  },
  preview: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    proxy: api,
  },
});
