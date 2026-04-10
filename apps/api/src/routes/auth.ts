import { FastifyInstance } from 'fastify';

export async function authRoutes(app: FastifyInstance) {
  /** GET /api/me — returns current user and organization context */
  app.get('/api/me', async (request) => {
    return {
      user: request.currentUser,
      organization: request.organization,
    };
  });
}
