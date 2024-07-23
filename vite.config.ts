import react from '@vitejs/plugin-react';
import path from 'node:path';
import tailwindcss from "tailwindcss";
import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron/simple';

export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        entry: "electron/main.ts",
      },
      preload: {
        input: path.join(__dirname, 'electron/preload.ts'),
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              output: {
                format: 'es',
                entryFileNames: '[name].mjs',
              }
            }
          }
        }
      },
      renderer: {},
    }),
  ],
  css: {
    postcss: {
      plugins: [tailwindcss()],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  base: process.env.ELECTRON_NODE_INTEGRATION === 'true' ? './' : '',
});