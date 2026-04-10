import { FastifyInstance } from 'fastify';
import { SaveAssessmentSchema } from '@changepath/shared';
import * as assessmentService from '../services/assessment-service.js';
import { AssessmentConflictError } from '../services/assessment-service.js';
import * as caseService from '../services/case-service.js';
import type { AnswerValue } from '@changepath/engine';

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
   * PUT /api/cases/:id/assessment — save assessment (delta or full snapshot)
   * - Accepts either `delta` (incremental) or `answersJson` (full)
   * - Optimistic locking via `expectedUpdatedAt` — returns 409 on conflict
   * - Server defensively re-applies cascade clearing before engine execution
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
        {
          delta: parsed.data.delta as Record<string, AnswerValue> | undefined,
          answersJson: parsed.data.answersJson as
            | Record<string, AnswerValue>
            | undefined,
          expectedUpdatedAt: parsed.data.expectedUpdatedAt ?? null,
        },
        request.organization.id,
        request.currentUser.id,
      );
      return assessment;
    } catch (err) {
      if (err instanceof AssessmentConflictError) {
        reply.code(409).send({
          error: 'Assessment was modified by another save',
          code: 'ASSESSMENT_CONFLICT',
          serverUpdatedAt: err.serverUpdatedAt.toISOString(),
        });
        return;
      }
      const message = err instanceof Error ? err.message : 'Unknown error';
      reply.code(400).send({ error: message });
    }
  });
}
