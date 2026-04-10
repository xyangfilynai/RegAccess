import { FastifyInstance } from 'fastify';
import { listFeatureFlags } from '../services/feature-flag-service.js';

export async function featureFlagRoutes(app: FastifyInstance) {
  /** GET /api/feature-flags — list flags for the current org */
  app.get('/api/feature-flags', async (request) => {
    const flags = await listFeatureFlags(request.organization.id);
    return { flags };
  });
}
