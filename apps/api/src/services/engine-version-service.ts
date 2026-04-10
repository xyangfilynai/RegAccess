import { prisma } from '../lib/prisma.js';

export async function getCurrentEngineVersion() {
  const version = await prisma.engineVersionRegistry.findFirst({
    where: { isCurrent: true },
  });

  if (!version) {
    throw new Error('No current engine version registered. Run the seed script.');
  }

  return version;
}

export async function getEngineVersion(engineVersion: string) {
  return prisma.engineVersionRegistry.findUnique({
    where: { engineVersion },
  });
}
