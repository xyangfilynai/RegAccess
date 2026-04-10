import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';

/**
 * Development auth plugin.
 *
 * Resolves the current user from an `x-user-id` header (dev stub).
 * In production, this will be replaced with SAML/OIDC middleware
 * that validates a real session/token and injects the same shape.
 */

declare module 'fastify' {
  interface FastifyRequest {
    currentUser: {
      id: string;
      organizationId: string;
      name: string;
      email: string;
      title: string | null;
      department: string | null;
      roleType: string;
      status: string;
      lastLoginAt: Date | null;
      createdAt: Date;
    };
    organization: {
      id: string;
      name: string;
      planTier: string;
      ssoConfigJson: unknown;
      dataRetentionPolicyJson: unknown;
      createdAt: Date;
    };
  }
}

export async function authPlugin(app: FastifyInstance) {
  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.headers['x-user-id'] as string | undefined;

    if (!userId) {
      reply.code(401).send({ error: 'Missing x-user-id header' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });

    if (!user) {
      reply.code(401).send({ error: 'User not found' });
      return;
    }

    if (user.status !== 'active') {
      reply.code(403).send({ error: 'User account is deactivated' });
      return;
    }

    request.currentUser = user;
    request.organization = user.organization;
  });
}
