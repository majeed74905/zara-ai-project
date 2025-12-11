
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    define: {
      // Prioritize VITE_GOOGLE_API_KEY as per user instruction, fallback to others
      'process.env.API_KEY': JSON.stringify(env.VITE_GOOGLE_API_KEY || env.GOOGLE_API_KEY || env.API_KEY),
      // Fallback for other process.env calls
      'process.env': {}
    },
    server: {
      port: 3000,
      open: true
    },
    build: {
      outDir: 'dist',
      sourcemap: false
    }
  };
});
