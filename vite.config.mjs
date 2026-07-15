import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';

export default defineConfig(({ mode }) => {
    const isDev = mode === 'development';
    
    return {
      server: {
        port: 5173,
        host: '127.0.0.1',
        strictPort: true,
      },
      plugins: [
        tailwindcss(),
        react(),
        electron([
          {
            entry: 'electron/main.ts',
            onstart(options) {
              if (isDev) {
                options.startup();
              }
            },
            vite: {
              build: {
                outDir: 'dist-electron',
                lib: {
                  entry: 'electron/main.ts',
                  formats: ['cjs'],
                  fileName: () => 'main.cjs'
                },
                rollupOptions: {
                  external: ['electron', 'electron-updater', 'path', 'fs/promises', 'url']
                }
              },
              define: {
                'process.env.NODE_ENV': JSON.stringify(mode)
              }
            }
          },
          {
            entry: 'electron/preload.ts',
            onstart(options) {
              options.reload();
            },
            vite: {
              build: {
                outDir: 'dist-electron',
                lib: {
                  entry: 'electron/preload.ts',
                  formats: ['cjs'],
                  fileName: () => 'preload.cjs'
                },
                rollupOptions: {
                  external: ['electron']
                }
              }
            }
          }
        ]),
        renderer()
      ],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      base: './',
      build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) return 'react-vendor';
              if (id.includes('node_modules/lunar-javascript')) return 'lunar-vendor';
              if (id.includes('node_modules/date-fns')) return 'date-vendor';
              return undefined;
            }
          }
        }
      }
    };
});
