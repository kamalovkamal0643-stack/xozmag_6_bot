import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const api = {
  '/api': { target: 'http://127.0.0.1:5000', changeOrigin: true },
};

export default defineConfig({
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5174, strictPort: true, proxy: api },
  preview: { host: '127.0.0.1', port: 5174, strictPort: true, proxy: api },
});
