import { Prisma, PrismaClient } from '@prisma/client';
import { Answer, AuthPathway, SAMPLE_CASES } from '@changepath/engine';
import { executeEngine } from '../src/services/engine-executor.js';

const prisma = new PrismaClient();

const DEMO_ORG_ID = '00000000-0000-4000-a000-000000000001';
const ADMIN_USER_ID = '00000000-0000-4000-a000-000000000010';
const MEMBER_USER_ID = '00000000-0000-4000-a000-000000000011';
const ENGINE_VERSION = '1.0.0';

interface DemoProductBlueprint {
  id: string;
  productName: string;
  deviceFamily: string;
  deviceClass: string;
  softwareLevelOfConcern: string;
}

interface DemoCaseBlueprint {
  id: string;
  assessmentId: string;
  caseAuditId: string;
  assessmentAuditId: string;
  productId: string;
  caseNumber: string;
  ownerUserId: string;
  createdByUserId: string;
  status: string;
  priority: string;
  dueDate: string | null;
}

const DEMO_PRODUCT_BLUEPRINTS: DemoProductBlueprint[] = [
  {
    id: '00000000-0000-4000-a000-000000000020',
    productName: 'PulmoSight CT',
    deviceFamily: 'Thoracic Imaging',
    deviceClass: 'II',
    softwareLevelOfConcern: 'moderate',
  },
  {
    id: '00000000-0000-4000-a000-000000000021',
    productName: 'RetinaGuard DR',
    deviceFamily: 'Ophthalmic Screening',
    deviceClass: 'II',
    softwareLevelOfConcern: 'moderate',
  },
  {
    id: '00000000-0000-4000-a000-000000000022',
    productName: 'SepsisSignal Monitor',
    deviceFamily: 'Inpatient Monitoring',
    deviceClass: 'II',
    softwareLevelOfConcern: 'moderate',
  },
  {
    id: '00000000-0000-4000-a000-000000000023',
    productName: 'FollowUp Copilot',
    deviceFamily: 'Radiology Follow-Up',
    deviceClass: 'III',
    softwareLevelOfConcern: 'major',
  },
  {
    id: '00000000-0000-4000-a000-000000000024',
    productName: 'RhythmEdge Monitor',
    deviceFamily: 'Cardiac Monitoring',
    deviceClass: 'III',
    softwareLevelOfConcern: 'moderate',
  },
  {
    id: '00000000-0000-4000-a000-000000000025',
    productName: 'EchoVector LV',
    deviceFamily: 'Echocardiography',
    deviceClass: 'III',
    softwareLevelOfConcern: 'major',
  },
  {
    id: '00000000-0000-4000-a000-000000000026',
    productName: 'OncoAssist Drafts',
    deviceFamily: 'Oncology Documentation',
    deviceClass: 'II',
    softwareLevelOfConcern: 'major',
  },
  {
    id: '00000000-0000-4000-a000-000000000027',
    productName: 'NodeTriage DN',
    deviceFamily: 'Digital Pathology',
    deviceClass: 'II',
    softwareLevelOfConcern: 'major',
  },
  {
    id: '00000000-0000-4000-a000-000000000028',
    productName: 'MedSummary Assist',
    deviceFamily: 'Medication Reconciliation',
    deviceClass: 'II',
    softwareLevelOfConcern: 'major',
  },
];

const DEMO_CASE_BLUEPRINTS: DemoCaseBlueprint[] = [
  {
    id: '00000000-0000-4000-a000-000000000030',
    assessmentId: '00000000-0000-4000-a000-000000000040',
    caseAuditId: '00000000-0000-4000-a000-000000000060',
    assessmentAuditId: '00000000-0000-4000-a000-000000000080',
    productId: '00000000-0000-4000-a000-000000000020',
    caseNumber: 'DEMO-001',
    ownerUserId: ADMIN_USER_ID,
    createdByUserId: ADMIN_USER_ID,
    status: 'draft',
    priority: 'medium',
    dueDate: '2026-04-18T00:00:00.000Z',
  },
  {
    id: '00000000-0000-4000-a000-000000000031',
    assessmentId: '00000000-0000-4000-a000-000000000041',
    caseAuditId: '00000000-0000-4000-a000-000000000061',
    assessmentAuditId: '00000000-0000-4000-a000-000000000081',
    productId: '00000000-0000-4000-a000-000000000021',
    caseNumber: 'DEMO-002',
    ownerUserId: MEMBER_USER_ID,
    createdByUserId: MEMBER_USER_ID,
    status: 'in_authoring',
    priority: 'medium',
    dueDate: '2026-04-22T00:00:00.000Z',
  },
  {
    id: '00000000-0000-4000-a000-000000000032',
    assessmentId: '00000000-0000-4000-a000-000000000042',
    caseAuditId: '00000000-0000-4000-a000-000000000062',
    assessmentAuditId: '00000000-0000-4000-a000-000000000082',
    productId: '00000000-0000-4000-a000-000000000022',
    caseNumber: 'DEMO-003',
    ownerUserId: ADMIN_USER_ID,
    createdByUserId: ADMIN_USER_ID,
    status: 'in_cross_functional_review',
    priority: 'high',
    dueDate: '2026-04-15T00:00:00.000Z',
  },
  {
    id: '00000000-0000-4000-a000-000000000033',
    assessmentId: '00000000-0000-4000-a000-000000000043',
    caseAuditId: '00000000-0000-4000-a000-000000000063',
    assessmentAuditId: '00000000-0000-4000-a000-000000000083',
    productId: '00000000-0000-4000-a000-000000000023',
    caseNumber: 'DEMO-004',
    ownerUserId: MEMBER_USER_ID,
    createdByUserId: MEMBER_USER_ID,
    status: 'approval_pending',
    priority: 'critical',
    dueDate: '2026-04-14T00:00:00.000Z',
  },
  {
    id: '00000000-0000-4000-a000-000000000034',
    assessmentId: '00000000-0000-4000-a000-000000000044',
    caseAuditId: '00000000-0000-4000-a000-000000000064',
    assessmentAuditId: '00000000-0000-4000-a000-000000000084',
    productId: '00000000-0000-4000-a000-000000000024',
    caseNumber: 'DEMO-005',
    ownerUserId: ADMIN_USER_ID,
    createdByUserId: ADMIN_USER_ID,
    status: 'approved',
    priority: 'medium',
    dueDate: null,
  },
  {
    id: '00000000-0000-4000-a000-000000000035',
    assessmentId: '00000000-0000-4000-a000-000000000045',
    caseAuditId: '00000000-0000-4000-a000-000000000065',
    assessmentAuditId: '00000000-0000-4000-a000-000000000085',
    productId: '00000000-0000-4000-a000-000000000025',
    caseNumber: 'DEMO-006',
    ownerUserId: MEMBER_USER_ID,
    createdByUserId: MEMBER_USER_ID,
    status: 'changes_requested',
    priority: 'high',
    dueDate: '2026-04-20T00:00:00.000Z',
  },
  {
    id: '00000000-0000-4000-a000-000000000036',
    assessmentId: '00000000-0000-4000-a000-000000000046',
    caseAuditId: '00000000-0000-4000-a000-000000000066',
    assessmentAuditId: '00000000-0000-4000-a000-000000000086',
    productId: '00000000-0000-4000-a000-000000000026',
    caseNumber: 'DEMO-007',
    ownerUserId: ADMIN_USER_ID,
    createdByUserId: ADMIN_USER_ID,
    status: 'reopened',
    priority: 'high',
    dueDate: '2026-04-17T00:00:00.000Z',
  },
  {
    id: '00000000-0000-4000-a000-000000000037',
    assessmentId: '00000000-0000-4000-a000-000000000047',
    caseAuditId: '00000000-0000-4000-a000-000000000067',
    assessmentAuditId: '00000000-0000-4000-a000-000000000087',
    productId: '00000000-0000-4000-a000-000000000027',
    caseNumber: 'DEMO-008',
    ownerUserId: MEMBER_USER_ID,
    createdByUserId: MEMBER_USER_ID,
    status: 'draft',
    priority: 'medium',
    dueDate: '2026-04-29T00:00:00.000Z',
  },
  {
    id: '00000000-0000-4000-a000-000000000038',
    assessmentId: '00000000-0000-4000-a000-000000000048',
    caseAuditId: '00000000-0000-4000-a000-000000000068',
    assessmentAuditId: '00000000-0000-4000-a000-000000000088',
    productId: '00000000-0000-4000-a000-000000000028',
    caseNumber: 'DEMO-009',
    ownerUserId: ADMIN_USER_ID,
    createdByUserId: ADMIN_USER_ID,
    status: 'in_authoring',
    priority: 'medium',
    dueDate: '2026-04-16T00:00:00.000Z',
  },
];

const toJsonValue = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

function mapAuthPathwayToBaseline(authPathway: string): string {
  switch (authPathway) {
    case AuthPathway.FiveOneZeroK:
      return '510k';
    case AuthPathway.DeNovo:
      return 'de_novo';
    case AuthPathway.PMA:
      return 'pma';
    default:
      return '510k';
  }
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

async function main() {
  console.log('Seeding database...');

  if (SAMPLE_CASES.length !== DEMO_PRODUCT_BLUEPRINTS.length || SAMPLE_CASES.length !== DEMO_CASE_BLUEPRINTS.length) {
    throw new Error('Demo seed blueprint counts do not match SAMPLE_CASES');
  }

  const org = await prisma.organization.upsert({
    where: { id: DEMO_ORG_ID },
    update: {
      name: 'Acme MedTech',
      planTier: 'enterprise',
    },
    create: {
      id: DEMO_ORG_ID,
      name: 'Acme MedTech',
      planTier: 'enterprise',
    },
  });
  console.log(`  Organization: ${org.name} (${org.id})`);

  const admin = await prisma.user.upsert({
    where: { id: ADMIN_USER_ID },
    update: {
      organizationId: DEMO_ORG_ID,
      name: 'Alice Admin',
      email: 'alice@acmemedtech.com',
      title: 'VP Regulatory Affairs',
      department: 'Regulatory',
      roleType: 'org_admin',
      status: 'active',
    },
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
    update: {
      organizationId: DEMO_ORG_ID,
      name: 'Bob Builder',
      email: 'bob@acmemedtech.com',
      title: 'Senior Software Engineer',
      department: 'Engineering',
      roleType: 'member',
      status: 'active',
    },
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

  const engineVersion = await prisma.engineVersionRegistry.upsert({
    where: { engineVersion: ENGINE_VERSION },
    update: {
      schemaVersion: ENGINE_VERSION,
      changelog: 'Enterprise demo fixtures aligned to the current nine-case evaluation set.',
      isCurrent: true,
    },
    create: {
      engineVersion: ENGINE_VERSION,
      schemaVersion: ENGINE_VERSION,
      changelog: 'Enterprise demo fixtures aligned to the current nine-case evaluation set.',
      isCurrent: true,
    },
  });
  console.log(`  Engine version: ${engineVersion.engineVersion} (current: ${engineVersion.isCurrent})`);

  for (let index = 0; index < SAMPLE_CASES.length; index += 1) {
    const sampleCase = SAMPLE_CASES[index];
    const productBlueprint = DEMO_PRODUCT_BLUEPRINTS[index];
    const caseBlueprint = DEMO_CASE_BLUEPRINTS[index];
    const dueDate = caseBlueprint.dueDate ? new Date(caseBlueprint.dueDate) : null;
    const predicateDevice = asNullableString(sampleCase.answers.A1b);
    const product = await prisma.product.upsert({
      where: { id: productBlueprint.id },
      update: {
        organizationId: DEMO_ORG_ID,
        productName: productBlueprint.productName,
        deviceFamily: productBlueprint.deviceFamily,
        deviceClass: productBlueprint.deviceClass,
        regulatoryPathwayBaseline: mapAuthPathwayToBaseline(sampleCase.authPathway),
        predicateDevice,
        pccpStatus: sampleCase.answers.A2 === Answer.Yes ? 'authorized' : 'none',
        softwareLevelOfConcern: productBlueprint.softwareLevelOfConcern,
      },
      create: {
        id: productBlueprint.id,
        organizationId: DEMO_ORG_ID,
        productName: productBlueprint.productName,
        deviceFamily: productBlueprint.deviceFamily,
        deviceClass: productBlueprint.deviceClass,
        regulatoryPathwayBaseline: mapAuthPathwayToBaseline(sampleCase.authPathway),
        predicateDevice,
        pccpStatus: sampleCase.answers.A2 === Answer.Yes ? 'authorized' : 'none',
        softwareLevelOfConcern: productBlueprint.softwareLevelOfConcern,
      },
    });

    const { derivedState, determination, completenessStatus } = executeEngine(sampleCase.answers);
    const changeType = asNullableString(sampleCase.answers.B2) ?? sampleCase.tags.join(', ');

    const changeCase = await prisma.changeCase.upsert({
      where: { id: caseBlueprint.id },
      update: {
        organizationId: DEMO_ORG_ID,
        productId: product.id,
        caseNumber: caseBlueprint.caseNumber,
        title: sampleCase.title,
        changeSummary: sampleCase.shortScenario,
        changeType,
        status: caseBlueprint.status,
        priority: caseBlueprint.priority,
        createdByUserId: caseBlueprint.createdByUserId,
        caseOwnerUserId: caseBlueprint.ownerUserId,
        dueDate,
        currentDecision: determination.pathway,
        engineVersion: ENGINE_VERSION,
      },
      create: {
        id: caseBlueprint.id,
        organizationId: DEMO_ORG_ID,
        productId: product.id,
        caseNumber: caseBlueprint.caseNumber,
        title: sampleCase.title,
        changeSummary: sampleCase.shortScenario,
        changeType,
        status: caseBlueprint.status,
        priority: caseBlueprint.priority,
        createdByUserId: caseBlueprint.createdByUserId,
        caseOwnerUserId: caseBlueprint.ownerUserId,
        dueDate,
        currentDecision: determination.pathway,
        engineVersion: ENGINE_VERSION,
      },
    });

    await prisma.assessmentResponseSet.upsert({
      where: { id: caseBlueprint.assessmentId },
      update: {
        caseId: changeCase.id,
        schemaVersion: ENGINE_VERSION,
        answersJson: toJsonValue(sampleCase.answers),
        derivedStateJson: toJsonValue(derivedState),
        engineOutputJson: toJsonValue(determination),
        completenessStatusJson: toJsonValue(completenessStatus),
        updatedByUserId: caseBlueprint.ownerUserId,
      },
      create: {
        id: caseBlueprint.assessmentId,
        caseId: changeCase.id,
        schemaVersion: ENGINE_VERSION,
        answersJson: toJsonValue(sampleCase.answers),
        derivedStateJson: toJsonValue(derivedState),
        engineOutputJson: toJsonValue(determination),
        completenessStatusJson: toJsonValue(completenessStatus),
        updatedByUserId: caseBlueprint.ownerUserId,
      },
    });

    await prisma.auditEvent.upsert({
      where: { id: caseBlueprint.caseAuditId },
      update: {
        organizationId: DEMO_ORG_ID,
        caseId: changeCase.id,
        entityType: 'change_case',
        entityId: changeCase.id,
        action: 'create',
        afterJson: {
          caseNumber: caseBlueprint.caseNumber,
          title: sampleCase.title,
          status: caseBlueprint.status,
          priority: caseBlueprint.priority,
          currentDecision: determination.pathway,
          ownerUserId: caseBlueprint.ownerUserId,
          dueDate: dueDate?.toISOString() ?? null,
        } as Prisma.InputJsonValue,
        performedByUserId: caseBlueprint.createdByUserId,
      },
      create: {
        id: caseBlueprint.caseAuditId,
        organizationId: DEMO_ORG_ID,
        caseId: changeCase.id,
        entityType: 'change_case',
        entityId: changeCase.id,
        action: 'create',
        afterJson: {
          caseNumber: caseBlueprint.caseNumber,
          title: sampleCase.title,
          status: caseBlueprint.status,
          priority: caseBlueprint.priority,
          currentDecision: determination.pathway,
          ownerUserId: caseBlueprint.ownerUserId,
          dueDate: dueDate?.toISOString() ?? null,
        } as Prisma.InputJsonValue,
        performedByUserId: caseBlueprint.createdByUserId,
      },
    });

    await prisma.auditEvent.upsert({
      where: { id: caseBlueprint.assessmentAuditId },
      update: {
        organizationId: DEMO_ORG_ID,
        caseId: changeCase.id,
        entityType: 'assessment_response_set',
        entityId: caseBlueprint.assessmentId,
        action: 'create',
        afterJson: {
          pathway: determination.pathway,
          answersJson: sampleCase.answers,
        } as Prisma.InputJsonValue,
        performedByUserId: caseBlueprint.ownerUserId,
      },
      create: {
        id: caseBlueprint.assessmentAuditId,
        organizationId: DEMO_ORG_ID,
        caseId: changeCase.id,
        entityType: 'assessment_response_set',
        entityId: caseBlueprint.assessmentId,
        action: 'create',
        afterJson: {
          pathway: determination.pathway,
          answersJson: sampleCase.answers,
        } as Prisma.InputJsonValue,
        performedByUserId: caseBlueprint.ownerUserId,
      },
    });

    console.log(
      `  Case: ${caseBlueprint.caseNumber} ${sampleCase.title} -> ${caseBlueprint.ownerUserId === ADMIN_USER_ID ? admin.name : member.name}`,
    );
  }

  console.log(`Seed complete. Created ${SAMPLE_CASES.length} enterprise demo cases.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
