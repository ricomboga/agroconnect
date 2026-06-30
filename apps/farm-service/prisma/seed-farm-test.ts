/**
 * Farm-service test data seed.
 * Creates Jane Wanjiru's Nakuru Farm with Maize + Cabbage AI schedules,
 * adds John Waweru as field_worker, and assigns him the first 10 activities.
 *
 * Run from apps/farm-service/:
 *   npx tsx --env-file=.env prisma/seed-farm-test.ts
 *
 * Requires DATABASE_URL (from .env) and JWT_PRIVATE_KEY (read from
 * apps/auth-service/.env automatically, or set as an env var).
 */
import { prisma } from '@agroconnect/db/farm';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { generateCropSchedule } from '../src/services/scheduleService.js';

// ─── JWT helper ──────────────────────────────────────────────────────────────

function loadDevPrivateKey(): string {
  if (process.env['JWT_PRIVATE_KEY']) {
    return process.env['JWT_PRIVATE_KEY'].replace(/\\n/g, '\n');
  }
  // Fall back to auth-service .env (assumes run from apps/farm-service/)
  const authEnvPath = path.join(process.cwd(), '../auth-service/.env');
  if (fs.existsSync(authEnvPath)) {
    const raw = fs.readFileSync(authEnvPath, 'utf-8');
    // The key spans multiple lines between double-quotes
    const match = raw.match(/JWT_PRIVATE_KEY="([\s\S]*?)"\n/);
    if (match?.[1]) return match[1];
  }
  throw new Error(
    'JWT_PRIVATE_KEY not found. Set it as env var or ensure apps/auth-service/.env exists.',
  );
}

function signJwt(payload: Record<string, unknown>, privateKeyPem: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${header}.${body}`);
  return `${header}.${body}.${signer.sign(privateKeyPem, 'base64url')}`;
}

// ─── Fixed UUIDs — deterministic so the seed is re-runnable (delete first) ──

const JANE_ID = 'a1b2c3d4-0001-0001-0001-000000000001';
const JOHN_ID = 'a1b2c3d4-0002-0002-0002-000000000002';

// ─── Seed ────────────────────────────────────────────────────────────────────

async function seed(): Promise<void> {
  console.log('▶  Seeding farm-service test data…\n');

  // ── 1. Nakuru Farm ────────────────────────────────────────────────────────
  const farm = await prisma.farm.create({
    data: {
      ownerId: JANE_ID,
      name: 'Nakuru Farm',
      locationLat: -0.3031,
      locationLng: 36.08,
      county: 'Nakuru',
      areaAcres: 2.5,
      farmType: 'both',
    },
  });
  console.log(`✓  Farm created          id=${farm.id}`);

  // ── 2. Plots ──────────────────────────────────────────────────────────────
  const plotA = await prisma.farmPlot.create({
    data: { farmId: farm.id, name: 'Plot A', areaAcres: 1.5 },
  });
  const plotB = await prisma.farmPlot.create({
    data: { farmId: farm.id, name: 'Plot B', areaAcres: 0.5 },
  });
  console.log(`✓  Plot A (Maize 1.5ac)  id=${plotA.id}`);
  console.log(`✓  Plot B (Cabbage 0.5ac) id=${plotB.id}`);

  // ── 3. Crop schedules via generateCropSchedule() ──────────────────────────
  //    Maize: planted April 1 2025, variety H614D
  const maizePlanting = new Date('2025-04-01');
  const maizeCount = await generateCropSchedule(
    farm.id, plotA.id, 'Plot A', 'Maize', 'H614D', maizePlanting,
  );
  await prisma.farmPlot.update({
    where: { id: plotA.id },
    data: {
      currentCrop: 'Maize',
      cropVariety: 'H614D',
      plantingDate: maizePlanting,
      currentCropPlantedAt: maizePlanting,
    },
  });
  console.log(`✓  Maize schedule        ${maizeCount} activities generated`);

  //    Cabbage: planted May 1 2025, no variety
  const cabbagePlanting = new Date('2025-05-01');
  const cabbageCount = await generateCropSchedule(
    farm.id, plotB.id, 'Plot B', 'Cabbage', undefined, cabbagePlanting,
  );
  await prisma.farmPlot.update({
    where: { id: plotB.id },
    data: {
      currentCrop: 'Cabbage',
      plantingDate: cabbagePlanting,
      currentCropPlantedAt: cabbagePlanting,
    },
  });
  console.log(`✓  Cabbage schedule      ${cabbageCount} activities generated`);

  // ── 4. Newcastle vaccine (livestock — outside crop schedule) ─────────────
  await prisma.activity.create({
    data: {
      farmId: farm.id,
      type: 'other',
      title: 'Newcastle vaccine — 50 Layers',
      description: 'KARI Improved layers — 3-month cycle from Jan 15 2025. Due Apr 15.',
      scheduledDate: new Date('2025-04-15'),
      status: 'pending',
      labourCostKes: 0,
    },
  });
  console.log('✓  Newcastle vaccine     activity added (manual)');

  // ── 5. Simulate "as of June 6 2025" state ─────────────────────────────────
  //    Mark everything before June 5 as completed (work was done)
  const june5 = new Date('2025-06-05');
  const bulk = await prisma.activity.updateMany({
    where: { farmId: farm.id, scheduledDate: { lt: june5 }, status: 'pending' },
    data: { status: 'completed', completedDate: june5 },
  });
  console.log(`✓  Marked ${bulk.count} activities completed (pre-Jun-5)`);

  //    Restore Newcastle vaccine → pending overdue (Apr 15, 7 weeks late)
  await prisma.activity.updateMany({
    where: { farmId: farm.id, title: 'Newcastle vaccine — 50 Layers' },
    data: { status: 'pending', completedDate: null },
  });

  //    Restore last cabbage irrigation before Jun 6 → pending overdue
  //    (Cabbage watered every 2 days from May 1; offset day 34 = Jun 4)
  const lastCabbageIrrigation = await prisma.activity.findFirst({
    where: {
      farmId: farm.id,
      plotId: plotB.id,
      type: 'irrigation',
      scheduledDate: { lt: new Date('2025-06-06') },
      status: 'completed',
    },
    orderBy: { scheduledDate: 'desc' },
  });
  if (lastCabbageIrrigation) {
    await prisma.activity.update({
      where: { id: lastCabbageIrrigation.id },
      data: { status: 'pending', completedDate: null },
    });
    const dateStr = lastCabbageIrrigation.scheduledDate.toISOString().split('T')[0];
    console.log(`✓  Restored overdue      Water Cabbage — ${dateStr} → pending`);
  }

  // ── 6. Farm worker: John Waweru ───────────────────────────────────────────
  await prisma.farmWorker.create({
    data: { farmId: farm.id, userId: JOHN_ID, role: 'field_worker' },
  });
  console.log(`✓  Worker added          John Waweru userId=${JOHN_ID}`);

  // ── 7. Assign first 10 pending activities to John Waweru ─────────────────
  const first10 = await prisma.activity.findMany({
    where: { farmId: farm.id, status: 'pending' },
    orderBy: { scheduledDate: 'asc' },
    take: 10,
    select: { id: true },
  });
  await prisma.activity.updateMany({
    where: { id: { in: first10.map((a) => a.id) } },
    data: { assignedToWorkerId: JOHN_ID },
  });
  console.log(`✓  Assigned ${first10.length} activities to John Waweru`);

  // ── STEP 2: Count verification ────────────────────────────────────────────
  const totalCount = await prisma.activity.count({ where: { farmId: farm.id } });

  // Simulated overdue as of Jun 6 2025: pending activities with date < Jun 6
  const overdueSimCount = await prisma.activity.count({
    where: {
      farmId: farm.id,
      status: 'pending',
      scheduledDate: { lt: new Date('2025-06-06') },
    },
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 2 — Activity count');
  console.log(`  Equivalent SQL:`);
  console.log(`    SELECT COUNT(*) FROM activities WHERE farm_id = '${farm.id}';`);
  console.log(`  Result: ${totalCount}  (expected ≥ 50)  ${totalCount >= 50 ? '✓ PASS' : '✗ FAIL'}`);
  console.log('');
  console.log('STEP 2 — Overdue simulation (pending activities with date < 2025-06-06):');
  console.log(`  Result: ${overdueSimCount}  (expected 2)  ${overdueSimCount === 2 ? '✓ PASS' : '✗ FAIL'}`);
  if (overdueSimCount === 2) {
    console.log('  → Newcastle vaccine (Apr 15) + Water Cabbage (Jun 4)  ✓');
  }

  // ── JWTs ──────────────────────────────────────────────────────────────────
  const privateKey = loadDevPrivateKey();
  const now = Math.floor(Date.now() / 1000);
  const farmerJWT = signJwt(
    { sub: JANE_ID, role: 'farmer', phone: '+254712345678', iat: now, exp: now + 86400 },
    privateKey,
  );
  const workerJWT = signJwt(
    { sub: JOHN_ID, role: 'field_worker', phone: '+254799000001', iat: now, exp: now + 86400 },
    privateKey,
  );

  // ── STEP 3: Schedule endpoint (farmer) ────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`FARM ID: ${farm.id}`);
  console.log('');
  console.log('STEP 3 — Schedule endpoint (farmer JWT):');
  console.log('');
  console.log('Full schedule — overdue count (server uses real clock, not Jun 6 2025):');
  console.log(`  curl -s -H "Authorization: Bearer ${farmerJWT}" \\`);
  console.log(`    http://localhost:3001/api/v1/farms/${farm.id}/schedule | jq '.grouped.overdue | length'`);
  console.log('');
  console.log('⚠  Server uses new Date() at query time. Since today ≫ Jun 2025, ALL');
  console.log('   2025 pending activities are overdue. To reproduce the Jun 6 window:');
  console.log('');
  console.log('Exact Jun 6 2025 overdue count (expected: 2):');
  console.log(`  curl -s -H "Authorization: Bearer ${farmerJWT}" \\`);
  console.log(`    "http://localhost:3001/api/v1/farms/${farm.id}/schedule?status=pending&to_date=2025-06-05" \\`);
  console.log(`    | jq '.data | length'`);

  // ── STEP 4: Worker schedule ───────────────────────────────────────────────
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STEP 4 — Worker schedule (worker JWT):');
  console.log('');
  console.log(`  curl -s -H "Authorization: Bearer ${workerJWT}" \\`);
  console.log(`    http://localhost:3001/api/v1/farms/${farm.id}/schedule | jq '.grouped.today'`);
  console.log('');
  console.log('⚠  Two gaps found in current implementation:');
  console.log('');
  console.log('   GAP 1 — Worker access: The schedule endpoint calls assertFarmAccess()');
  console.log('   which does: WHERE id = :farmId AND ownerId = :requesterId');
  console.log('   A field_worker JWT (sub=JOHN_ID) gets 404 because JOHN is not the owner.');
  console.log('   Fix: extend assertFarmAccess() to also allow active FarmWorkers.');
  console.log('');
  console.log('   GAP 2 — Worker filter: The schedule endpoint has no assignedToWorkerId');
  console.log('   filter — it returns all farm activities. Add ?assigned_to=<userId>');
  console.log('   to scheduleQuerySchema + getFarmSchedule() where clause.');
  console.log('');
  console.log('   Workaround — use farmer JWT + client-side filter:');
  console.log(`  curl -s -H "Authorization: Bearer ${farmerJWT}" \\`);
  console.log(`    "http://localhost:3001/api/v1/farms/${farm.id}/schedule" \\`);
  console.log(`    | jq '[.data[] | select(.assignedToWorkerId == "${JOHN_ID}")] | length'`);
  console.log(`  → Expected: 10  (John's assigned activities)`);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

seed()
  .catch((err: unknown) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
