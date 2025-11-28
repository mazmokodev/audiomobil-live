import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
  // Removed empty process.env definition to avoid potential conflicts
  // We rely on import.meta.env or standard environment variable injection
});