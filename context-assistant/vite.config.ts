import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync, existsSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import type { Plugin } from 'vite';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Plugin to handle three.js build files and src files for module resolution
function handleThreeJsModules(): Plugin {
  return {
    name: 'handle-threejs-modules',
    configureServer(server) {
      // Handle /build/*.js and /src/*.js requests
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';
        
        // Handle /build/*.js files - these are dev build stubs that need module resolution
        if (url.startsWith('/build/') && url.endsWith('.js')) {
          const cleanUrl = url.split('?')[0].replace(/^\//, '');
          const filePath = resolve(__dirname, '..', cleanUrl);
          
          if (existsSync(filePath)) {
            try {
              let content = readFileSync(filePath, 'utf-8');
              
              // Transform relative imports from ../src/ to absolute /src/ paths
              // This allows the browser to resolve them correctly
              content = content.replace(
                /export \* from ['"]\.\.\/src\/([^'"]+)['"];?/g,
                (match, srcPath) => {
                  return `export * from '/src/${srcPath}';`;
                }
              );
              
              res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
              res.end(content);
              return;
            } catch (err) {
              console.error('Error processing build file:', filePath, err);
              // Fall through to next
            }
          }
        }
        
        // Handle /src/*.js and /src/*.ts requests - serve from parent directory
        if (url.startsWith('/src/') && (url.endsWith('.js') || url.endsWith('.ts'))) {
          const cleanUrl = url.split('?')[0].replace(/^\//, '');
          const filePath = resolve(__dirname, '..', cleanUrl);
          
          if (existsSync(filePath)) {
            try {
              const content = readFileSync(filePath, 'utf-8');
              res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
              res.end(content);
              return;
            } catch (err) {
              console.error('Error serving src file:', filePath, err);
              // Fall through to next
            }
          }
        }
        
        next();
      });
    },
  };
}

// Plugin to serve three.js static files from parent directory
function serveThreeJsStatic(): Plugin {
  return {
    name: 'serve-threejs-static',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Serve files from parent directory for editor, playground, manual, docs, files, examples
        // Note: /build/*.js and /src/*.js are handled by handleThreeJsModules plugin
        const staticPaths = ['/editor', '/playground', '/manual', '/docs', '/files', '/examples'];
        const url = req.url || '';
        const isStaticPath = staticPaths.some(path => url.startsWith(path));
        
        // Also serve non-JS files from /build (like .min.js, .cjs, etc.)
        const isBuildNonJs = url.startsWith('/build/') && !url.endsWith('.js');
        
        if (isStaticPath || isBuildNonJs) {
          // Remove query string and leading slash for path resolution
          const cleanUrl = url.split('?')[0].replace(/^\//, '');
          let filePath = resolve(__dirname, '..', cleanUrl);
          
          // Handle directory requests - serve index.html
          if (cleanUrl.endsWith('/') || (!cleanUrl.includes('.') && !cleanUrl.endsWith('/index.html'))) {
            const dirPath = resolve(__dirname, '..', cleanUrl.replace(/\/$/, ''), 'index.html');
            if (existsSync(dirPath)) {
              filePath = dirPath;
            } else if (existsSync(filePath)) {
              try {
                if (statSync(filePath).isDirectory()) {
                  filePath = resolve(filePath, 'index.html');
                }
              } catch (e) {
                // Ignore stat errors
              }
            }
          }
          
          // Try to serve the file
          if (existsSync(filePath)) {
            try {
              const content = readFileSync(filePath);
              // Set appropriate content type
              if (filePath.endsWith('.html')) {
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
              } else if (filePath.endsWith('.js')) {
                res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
              } else if (filePath.endsWith('.css')) {
                res.setHeader('Content-Type', 'text/css; charset=utf-8');
              } else if (filePath.endsWith('.json')) {
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
              } else if (filePath.endsWith('.png')) {
                res.setHeader('Content-Type', 'image/png');
              } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
                res.setHeader('Content-Type', 'image/jpeg');
              } else if (filePath.endsWith('.svg')) {
                res.setHeader('Content-Type', 'image/svg+xml');
              } else if (filePath.endsWith('.woff') || filePath.endsWith('.woff2')) {
                res.setHeader('Content-Type', 'font/woff2');
              }
              res.end(content);
              return;
            } catch (err) {
              console.error('Error serving file:', filePath, err);
              // Fall through to next middleware
            }
          } else {
            console.warn('File not found:', filePath, 'for URL:', url);
          }
        }
        next();
      });
    },
  };
}

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/three.js/' : '/',
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    fs: {
      allow: ['..'],
    },
  },
  plugins: [handleThreeJsModules(), serveThreeJsStatic()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
  publicDir: 'public',
});

