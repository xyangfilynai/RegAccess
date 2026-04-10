import { FastifyInstance } from 'fastify';
import { CreateCaseSchema, UpdateCaseSchema } from '@changepath/shared';
import * as caseService from '../services/case-service.js';
import * as auditService from '../services/audit-service.js';

export async function caseRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { status?: string; productId?: string } }>(
    '/api/cases',
    async (request) => {
      return caseService.listCases(request.organization.id, {
        status: request.query.status,
        productId: request.query.productId,
      });
    },
  );

  app.get<{ Params: { id: string } }>('/api/cases/:id', async (request, reply) => {
    const changeCase = await caseService.getCase(
      request.params.id,
      request.organization.id,
    );
    if (!changeCase) {
      reply.code(404).send({ error: 'Case not found' });
      return;
    }
    return changeCase;
  });

  app.post('/api/cases', async (request, reply) => {
    const parsed = CreateCaseSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    try {
      const changeCase = await caseService.createCase(
        parsed.data,
        request.organization.id,
        request.currentUser.id,
      );
      reply.code(201).send(changeCase);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      reply.code(400).send({ error: message });
    }
  });

  app.patch<{ Params: { id: string } }>('/api/cases/:id', async (request, reply) => {
    const parsed = UpdateCaseSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }
    const changeCase = await caseService.updateCase(
      request.params.id,
      parsed.data,
      request.organization.id,
      request.currentUser.id,
    );
    if (!changeCase) {
      reply.code(404).send({ error: 'Case not found' });
      return;
    }
    return changeCase;
  });

  /** GET /api/cases/:id/history — audit events for this case */
  app.get<{ Params: { id: string } }>('/api/cases/:id/history', async (request, reply) => {
    // Verify case belongs to org
    const changeCase = await caseService.getCase(
      request.params.id,
      request.organization.id,
    );
    if (!changeCase) {
      reply.code(404).send({ error: 'Case not found' });
      return;
    }

    return auditService.getAuditEventsForCase(
      request.params.id,
      request.organization.id,
    );
  });
}
