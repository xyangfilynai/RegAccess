import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_ORG_ID = '00000000-0000-4000-a000-000000000001';
const ADMIN_USER_ID = '00000000-0000-4000-a000-000000000010';
const MEMBER_USER_ID = '00000000-0000-4000-a000-000000000011';
const PRODUCT_1_ID = '00000000-0000-4000-a000-000000000020';
const PRODUCT_2_ID = '00000000-0000-4000-a000-000000000021';
const CASE_1_ID = '00000000-0000-4000-a000-000000000030';

async function main() {
  console.log('Seeding database...');

  // Organization
  const org = await prisma.organization.upsert({
    where: { id: DEMO_ORG_ID },
    update: {},
    create: {
      id: DEMO_ORG_ID,
      name: 'Acme MedTech',
      planTier: 'enterprise',
    },
  });
  console.log(`  Organization: ${org.name} (${org.id})`);

  // Users
  const admin = await prisma.user.upsert({
    where: { id: ADMIN_USER_ID },
    update: {},
    create: {
      id: ADMIN_USER_ID,
      organizationId: DEMO_ORG_ID,
      name: 'Alice Admin',
      email: 'alice@acmemedtech.com',
      title: 'VP Regulatory Affairs',
      department: 'Regulatory',
      roleType: 'org_admin',
      status: 'active',
    },
  });

  const member = await prisma.user.upsert({
    where: { id: MEMBER_USER_ID },
    update: {},
    create: {
      id: MEMBER_USER_ID,
      organizationId: DEMO_ORG_ID,
      name: 'Bob Builder',
      email: 'bob@acmemedtech.com',
      title: 'Senior Software Engineer',
      department: 'Engineering',
      roleType: 'member',
      status: 'active',
    },
  });
  console.log(`  Users: ${admin.name}, ${member.name}`);

  // Engine version
  const engineVersion = await prisma.engineVersionRegistry.upsert({
    where: { engineVersion: '1.0.0' },
    update: {},
    create: {
      engineVersion: '1.0.0',
      schemaVersion: '1.0.0',
      changelog: 'Initial engine version — FDA pathway determination logic extracted from ChangePath prototype.',
      isCurrent: true,
    },
  });
  console.log(`  Engine version: ${engineVersion.engineVersion} (current: ${engineVersion.isCurrent})`);

  // Products
  const product1 = await prisma.product.upsert({
    where: { id: PRODUCT_1_ID },
    update: {},
    create: {
      id: PRODUCT_1_ID,
      organizationId: DEMO_ORG_ID,
      productName: 'CardioAssist AI',
      deviceFamily: 'Cardiac Monitoring',
      deviceClass: 'II',
      regulatoryPathwayBaseline: '510k',
      predicateDevice: 'K210345',
      pccpStatus: 'none',
      softwareLevelOfConcern: 'moderate',
    },
  });

  const product2 = await prisma.product.upsert({
    where: { id: PRODUCT_2_ID },
    update: {},
    create: {
      id: PRODUCT_2_ID,
      organizationId: DEMO_ORG_ID,
      productName: 'PathScope ML',
      deviceFamily: 'Digital Pathology',
      deviceClass: 'II',
      regulatoryPathwayBaseline: 'de_novo',
      predicateDevice: null,
      pccpStatus: 'authorized',
      softwareLevelOfConcern: 'major',
    },
  });
  console.log(`  Products: ${product1.productName}, ${product2.productName}`);

  // Change case
  const changeCase = await prisma.changeCase.upsert({
    where: { id: CASE_1_ID },
    update: {},
    create: {
      id: CASE_1_ID,
      organizationId: DEMO_ORG_ID,
      productId: PRODUCT_1_ID,
      caseNumber: 'CC-0001',
      title: 'Retrain arrhythmia detection model with expanded dataset',
      changeSummary: 'Adding 50,000 new ECG records from diverse population to training data while maintaining same model architecture.',
      changeType: 'Additional data — same distribution',
      status: 'draft',
      priority: 'medium',
      createdByUserId: ADMIN_USER_ID,
      caseOwnerUserId: MEMBER_USER_ID,
      engineVersion: '1.0.0',
    },
  });
  console.log(`  Case: ${changeCase.title} (${changeCase.caseNumber})`);

  // Assessment response set
  const sampleAnswers = {
    A1: '510(k)',
    A1b: 'K210345',
    A1c: 'v2.1',
    A1d: 'Automated detection of cardiac arrhythmias from ECG signals.',
    A2: 'No',
    A6: ['Traditional ML (e.g., random forest, SVM)'],
    B1: 'Training Data',
    B2: 'Additional data — same distribution',
    B3: 'No',
  };

  await prisma.assessmentResponseSet.upsert({
    where: { id: '00000000-0000-4000-a000-000000000040' },
    update: {},
    create: {
      id: '00000000-0000-4000-a000-000000000040',
      caseId: CASE_1_ID,
      schemaVersion: '1.0.0',
      answersJson: sampleAnswers,
      derivedStateJson: {
        hasGenAI: false,
        isCatIntendedUse: false,
        hasPCCP: false,
        isPMA: false,
        isDeNovo: false,
      },
      engineOutputJson: null, // Will be computed on first save
      completenessStatusJson: null,
      updatedByUserId: MEMBER_USER_ID,
    },
  });

  // Audit event for case creation
  await prisma.auditEvent.create({
    data: {
      organizationId: DEMO_ORG_ID,
      caseId: CASE_1_ID,
      entityType: 'change_case',
      entityId: CASE_1_ID,
      action: 'create',
      afterJson: changeCase as unknown as Record<string, unknown>,
      performedByUserId: ADMIN_USER_ID,
    },
  });

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
