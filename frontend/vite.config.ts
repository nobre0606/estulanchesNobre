import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Em desenvolvimento, /api vai para a API local (em produção é o mesmo servidor)
    proxy: { '/api': 'http://localhost:3000' },
  },
});
