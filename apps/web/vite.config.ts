import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const manualChunkGroups: Array<{ name: string; patterns: string[] }> = [
  {
    name: 'handoff',
    patterns: [
      '/src/components/HandoffPage.tsx',
      '/src/components/HandoffSections.tsx',
      '/src/components/handoff/',
      '/src/lib/handoff-checklist.ts',
      '/src/hooks/useHandoffChecklist.ts',
    ],
  },
  {
    name: 'review',
    patterns: [
      '/src/components/ReviewPanel.tsx',
      '/src/components/review-panel/',
      '/src/hooks/useReviewPanelData.ts',
      '/src/hooks/useReportExport.ts',
      '/src/lib/case-specific-reasoning.ts',
      '/src/lib/evidence-gaps.ts',
      '/src/lib/pdf-report-model.ts',
      '/src/lib/report-basis.ts',
      '/src/lib/report-generator.ts',
      '/src/lib/review-insights.ts',
    ],
  },
];

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replaceAll('\\', '/');
          const matchingGroup = manualChunkGroups.find((group) =>
            group.patterns.some((pattern) => normalizedId.includes(pattern)),
          );
          return matchingGroup?.name;
        },
      },
    },
  },
  resolve: {
    alias: {
      '@engine': path.resolve(__dirname, '../../packages/engine/src'),
      '@content': path.resolve(__dirname, 'src/lib/content'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
