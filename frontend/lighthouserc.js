/** Lighthouse CI config. Run after build: npm run build && npx lhci autorun (or lhci collect then lhci assert). */
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npx vite preview --port=4173',
      url: [
        'http://localhost:4173/',
        'http://localhost:4173/about',
        'http://localhost:4173/faq',
        'http://localhost:4173/pricing',
      ],
      numberOfRuns: 1,
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.95 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
