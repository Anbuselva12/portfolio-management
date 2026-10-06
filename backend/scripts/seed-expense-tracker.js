const fs = require('fs');
const path = require('path');
const { PrismaClient, Prisma } = require('@prisma/client');

const prisma = new PrismaClient();

// Helper to parse SQL INSERT statement values
function parseSqlInserts(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const insertRegex = /INSERT INTO `?[A-Za-z0-9_]+`?\s*\([^)]+\)\s*VALUES\s*([\s\S]+?);/i;
  const match = content.match(insertRegex);
  if (!match) return [];

  const rawValues = match[1].trim();
  // Split individual tuples by regex matching `\((?:[^)(]+|\((?:[^)(]+)\))*\)`
  const tuples = [];
  let inTuple = false;
  let inQuotes = false;
  let current = '';

  for (let i = 0; i < rawValues.length; i++) {
    const char = rawValues[i];
    if (char === "'" && rawValues[i - 1] !== '\\') {
      inQuotes = !inQuotes;
    }
    if (!inQuotes) {
      if (char === '(') {
        inTuple = true;
        current = '';
        continue;
      } else if (char === ')') {
        inTuple = false;
        tuples.push(current.trim());
        current = '';
        continue;
      }
    }
    if (inTuple) {
      current += char;
    }
  }

  // Parse each tuple into an array of values
  return tuples.map((tupleStr) => {
    const fields = [];
    let field = '';
    let inFieldQuotes = false;
    for (let j = 0; j < tupleStr.length; j++) {
      const c = tupleStr[j];
      if (c === "'" && tupleStr[j - 1] !== '\\') {
        inFieldQuotes = !inFieldQuotes;
      } else if (c === ',' && !inFieldQuotes) {
        fields.push(parseFieldValue(field.trim()));
        field = '';
      } else {
        field += c;
      }
    }
    fields.push(parseFieldValue(field.trim()));
    return fields;
  });
}

function parseFieldValue(val) {
  if (val === 'NULL' || val === 'null' || val === '') return null;
  if (val.startsWith("b'") || val.startsWith("B'")) {
    return val.includes('1');
  }
  if (val.startsWith("'") && val.endsWith("'")) {
    return val.slice(1, -1).replace(/\\'/g, "'");
  }
  if (!isNaN(val)) {
    return Number(val);
  }
  return val;
}

async function seed() {
  console.log('[Seed] Starting Expense Tracker seeding from SQL files...');

  // 1. Locate current family & member
  let targetFamily = await prisma.family.findFirst({
    where: {
      OR: [
        { id: '101b1ffa-9d7c-44f2-a161-dbfe87a2f230' },
        { name: 'Anbu Gayu' },
        { name: 'Anbu Family' },
      ],
    },
  });

  if (!targetFamily) {
    targetFamily = await prisma.family.findFirst();
  }

  if (!targetFamily) {
    console.log('[Seed] Creating default family...');
    targetFamily = await prisma.family.create({
      data: {
        id: '101b1ffa-9d7c-44f2-a161-dbfe87a2f230',
        name: 'Anbu Family',
        base_currency: 'INR',
      },
    });
  }

  let targetMember = await prisma.member.findFirst({
    where: {
      OR: [
        { id: '0ca74094-1719-4b82-91ec-8108878fb177' },
        { username: 'anbuselvam' },
      ],
    },
  });

  if (!targetMember) {
    console.log('[Seed] Creating default member...');
    targetMember = await prisma.member.create({
      data: {
        id: '0ca74094-1719-4b82-91ec-8108878fb177',
        family_id: targetFamily.id,
        username: 'anbuselvam',
        display_name: 'Anbuselvam Sankar',
        password_hash: '$2b$12$sUjGDanCA8pguqfyOAN9D.Owi56HS/KxWluPPgdG.3tS7SKzmGT2W',
        role: 'member',
        status: 'active',
        preferred_app: 'expense_tracker',
      },
    });
  }

  console.log(`[Seed] Target Family: ${targetFamily.name} (${targetFamily.id}), Member: ${targetMember.display_name} (${targetMember.id})`);

  // 2. Find or Create Project "SK Complex"
  let project = await prisma.trackerProject.findFirst({
    where: {
      family_id: targetFamily.id,
      name: 'SK Complex',
    },
  });

  if (!project) {
    project = await prisma.trackerProject.create({
      data: {
        family_id: targetFamily.id,
        created_by_id: targetMember.id,
        name: 'SK Complex',
        code: 'construction',
        description: 'Commercial construction project tracking (3,058 sq ft)',
        total_area_sqft: new Prisma.Decimal(3058),
        currency: 'INR',
        is_active: true,
      },
    });
    console.log(`[Seed] Created TrackerProject "SK Complex" (${project.id})`);
  } else {
    console.log(`[Seed] Found existing TrackerProject "SK Complex" (${project.id})`);
  }

  const sqlDir = path.join(__dirname, '..', '..', 'Expense App SQL Files');

  // 3. Seed Phases
  const phaseMap = new Map(); // oldId -> newId
  const phaseRows = parseSqlInserts(path.join(sqlDir, 'ASG_PROJECT_PHASE.sql'));
  for (const row of phaseRows) {
    const [oldId, name, isActive, sortOrder] = row;
    let phase = await prisma.trackerPhase.findFirst({
      where: { project_id: project.id, name },
    });
    if (!phase) {
      phase = await prisma.trackerPhase.create({
        data: {
          project_id: project.id,
          name,
          sort_order: sortOrder || 0,
          is_active: Boolean(isActive),
        },
      });
    }
    phaseMap.set(oldId, phase.id);
  }
  console.log(`[Seed] Seeded ${phaseMap.size} project phases`);

  // 4. Seed Units
  const unitMap = new Map(); // oldId -> newId
  const unitRows = parseSqlInserts(path.join(sqlDir, 'ASG_PRICE_QTY_REFERENCE.sql'));
  for (const row of unitRows) {
    const [oldId, name, isActive, sortOrder] = row;
    let unit = await prisma.trackerUnit.findFirst({
      where: { name },
    });
    if (!unit) {
      unit = await prisma.trackerUnit.create({
        data: {
          name,
          sort_order: sortOrder || 0,
          is_active: Boolean(isActive),
        },
      });
    }
    unitMap.set(oldId, unit.id);
  }
  console.log(`[Seed] Seeded ${unitMap.size} units of measure`);

  // 5. Seed Expense Types
  const typeMap = new Map(); // oldId -> newId
  const typeRows = parseSqlInserts(path.join(sqlDir, 'ASG_EXPENSE_TYPE.sql'));
  for (const row of typeRows) {
    const [oldId, name, isActive, sortOrder] = row;
    let type = await prisma.trackerExpenseType.findFirst({
      where: { project_id: project.id, name },
    });
    if (!type) {
      type = await prisma.trackerExpenseType.create({
        data: {
          project_id: project.id,
          name,
          sort_order: sortOrder || 0,
          is_active: Boolean(isActive),
        },
      });
    }
    typeMap.set(oldId, type.id);
  }
  console.log(`[Seed] Seeded ${typeMap.size} expense types`);

  // 6. Seed Tag Items
  const tagMap = new Map(); // oldId -> newId
  const tagRows = parseSqlInserts(path.join(sqlDir, 'ASG_TAG_ITEMS.sql'));
  for (const row of tagRows) {
    const [oldId, name, isActive, sortOrder, hexColor] = row;
    let tag = await prisma.trackerTagItem.findFirst({
      where: { project_id: project.id, name },
    });
    if (!tag) {
      tag = await prisma.trackerTagItem.create({
        data: {
          project_id: project.id,
          name,
          hex_color: hexColor,
          sort_order: sortOrder || 0,
          is_active: Boolean(isActive),
        },
      });
    }
    tagMap.set(oldId, tag.id);
  }
  console.log(`[Seed] Seeded ${tagMap.size} tag items`);

  // 7. Seed Expenses
  const expenseRows = parseSqlInserts(path.join(sqlDir, 'ASG_EXPENSE.sql'));
  console.log(`[Seed] Found ${expenseRows.length} expense rows in SQL file`);

  // Check how many already exist for this project
  const existingCount = await prisma.trackerExpense.count({
    where: { project_id: project.id },
  });

  if (existingCount >= expenseRows.length) {
    console.log(`[Seed] Project already has ${existingCount} expenses. Skipping expense insertion.`);
  } else {
    // Delete existing to cleanly reseed
    await prisma.trackerExpense.deleteMany({
      where: { project_id: project.id },
    });

    let inserted = 0;
    for (const row of expenseRows) {
      // (ID, EXPENSE_TYPE_ID, PRODUCT_NAME, BRAND, DESCRIPTION, QUANTITY, PRICE_PER_QTY, QTY_TYPE_ID, EXCEPTION, TOTAL, CREATED_BY, CREATED_ON, MODIFIED_BY, MODIFIED_ON, IS_ACTIVE, PROJECT_PHASE_ID, PURCHASE_DATE, TAG_ITEMS_ID)
      const [
        oldId,
        oldTypeId,
        productName,
        brand,
        description,
        quantity,
        pricePerQty,
        oldQtyTypeId,
        isException,
        total,
        createdBy,
        createdOn,
        modifiedBy,
        modifiedOn,
        isActive,
        oldPhaseId,
        purchaseDate,
        oldTagId,
      ] = row;

      const q = quantity != null ? new Prisma.Decimal(quantity) : new Prisma.Decimal(1);
      const rate = pricePerQty != null ? new Prisma.Decimal(pricePerQty) : new Prisma.Decimal(total || 0);
      const tot = total != null ? new Prisma.Decimal(total) : q.times(rate);

      await prisma.trackerExpense.create({
        data: {
          project_id: project.id,
          expense_type_id: typeMap.get(oldTypeId) || null,
          product_name: productName || null,
          brand: brand || null,
          description: description || null,
          quantity: q,
          price_per_qty: rate,
          unit_id: unitMap.get(oldQtyTypeId) || null,
          is_exception: Boolean(isException),
          total_cost: tot,
          project_phase_id: phaseMap.get(oldPhaseId) || null,
          tag_item_id: tagMap.get(oldTagId) || null,
          purchase_date: purchaseDate ? new Date(purchaseDate) : (createdOn ? new Date(createdOn) : new Date()),
          created_by_id: targetMember.id,
          is_active: isActive !== false,
          created_at: createdOn ? new Date(createdOn) : new Date(),
        },
      });
      inserted++;
    }
    console.log(`[Seed] Successfully seeded ${inserted} TrackerExpenses!`);
  }

  // Also check if family 101b1ffa-9d7c-44f2-a161-dbfe87a2f230 exists or ensure "SK Complex" is linked to the primary family
  const totalCostAgg = await prisma.trackerExpense.aggregate({
    where: { project_id: project.id },
    _sum: { total_cost: true },
    _count: true,
  });

  console.log(`[Seed] SK Complex Total Spend: ₹${totalCostAgg._sum.total_cost}, Items Count: ${totalCostAgg._count}`);
  console.log('[Seed] Seeding completed successfully!');
}

seed()
  .catch((e) => {
    console.error('[Seed] Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
