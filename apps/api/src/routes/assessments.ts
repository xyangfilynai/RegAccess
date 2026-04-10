import { FastifyInstance } from 'fastify';
import { SaveAssessmentSchema } from '@changepath/shared';
import * as assessmentService from '../services/assessment-service.js';
import * as caseService from '../services/case-service.js';

export async function assessmentRoutes(app: FastifyInstance) {
  /** GET /api/cases/:id/assessment — get current assessment for a case */
  app.get<{ Params: { id: string } }>('/api/cases/:id/assessment', async (request, reply) => {
    const changeCase = await caseService.getCase(
      request.params.id,
      request.organization.id,
    );
    if (!changeCase) {
      reply.code(404).send({ error: 'Case not found' });
      return;
    }

    const assessment = await assessmentService.getAssessment(
      request.params.id,
      request.organization.id,
    );

    if (!assessment) {
      // No assessment yet — return empty scaffold
      return {
        caseId: request.params.id,
        answersJson: {},
        derivedStateJson: null,
        engineOutputJson: null,
        completenessStatusJson: null,
      };
    }

    return assessment;
  });

  /**
   * PUT /api/cases/:id/assessment — save full assessment
   * - Saves answersJson
   * - Runs authoritative server-side engine execution
   * - Persists AssessmentResponseSet
   * - Writes audit event
   * - Returns updated assessment with derivedState and engineOutput
   */
  app.put<{ Params: { id: string } }>('/api/cases/:id/assessment', async (request, reply) => {
    const parsed = SaveAssessmentSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    try {
      const assessment = await assessmentService.saveAssessment(
        request.params.id,
        parsed.data.answersJson,
        request.organization.id,
        request.currentUser.id,
      );
      return assessment;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      reply.code(400).send({ error: message });
    }
  });
}
