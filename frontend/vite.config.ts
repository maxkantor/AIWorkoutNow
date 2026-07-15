import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const gscToken = (env.VITE_GSC_TOKEN || '').trim();

  return {
    plugins: [
      react(),
      {
        name: 'inject-gsc-verification',
        transformIndexHtml(html) {
          if (!gscToken) return html;
          const meta = `<meta name="google-site-verification" content="${gscToken.replace(/"/g, '')}" />`;
          return html.replace('</head>', `    ${meta}\n  </head>`);
        },
      },
    ],
    build: {
      outDir: 'dist',
    },
    server: {
      port: 3000,
    },
  };
});
