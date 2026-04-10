import Fastify from 'fastify';
import cors from '@fastify/cors';
import { authPlugin } from './plugins/auth.js';
import { authRoutes } from './routes/auth.js';
import { productRoutes } from './routes/products.js';
import { caseRoutes } from './routes/cases.js';
import { assessmentRoutes } from './routes/assessments.js';
import { featureFlagRoutes } from './routes/feature-flags.js';

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const HOST = process.env.HOST ?? '0.0.0.0';

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  });

  // Health check (no auth required)
  app.get('/api/health', async () => ({ status: 'ok' }));

  // Register auth plugin for all API routes below
  await app.register(authPlugin);

  // Register routes
  await app.register(authRoutes);
  await app.register(productRoutes);
  await app.register(caseRoutes);
  await app.register(assessmentRoutes);
  await app.register(featureFlagRoutes);

  return app;
}

async function main() {
  const app = await buildApp();

  try {
    await app.listen({ port: PORT, host: HOST });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
