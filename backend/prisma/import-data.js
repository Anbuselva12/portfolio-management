const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const backupFile = path.join(__dirname, 'backup.json');

async function importData() {
  if (!fs.existsSync(backupFile)) {
    console.error(`❌ File not found: ${backupFile}. Run "npm run db:export" first.`);
    process.exit(1);
  }

  const raw = fs.readFileSync(backupFile, 'utf-8');
  const data = JSON.parse(raw);

  console.log('🔄 Starting data import to target database...');

  const dateKeys = [
    'created_at',
    'updated_at',
    'deleted_at',
    'maturity_date',
    'start_date',
    'end_date',
    'due_date',
    'paid_date',
    'effective_date',
    'renewal_date',
    'prepayment_date',
    'generated_at',
    'received_date',
    'expires_at',
  ];

  function sanitizeRow(row) {
    const clean = { ...row };
    for (const key of Object.keys(clean)) {
      if (dateKeys.includes(key) && clean[key]) {
        clean[key] = new Date(clean[key]);
      }
    }
    return clean;
  }

  // 1. Family
  if (data.family?.length) {
    for (const row of data.family) {
      await prisma.family.upsert({
        where: { id: row.id },
        update: sanitizeRow(row),
        create: sanitizeRow(row),
      });
    }
    console.log(`✓ Imported ${data.family.length} families`);
  }

  // 2. Member
  if (data.member?.length) {
    for (const row of data.member) {
      await prisma.member.upsert({
        where: { id: row.id },
        update: sanitizeRow(row),
        create: sanitizeRow(row),
      });
    }
    console.log(`✓ Imported ${data.member.length} members`);
  }

  // 3. Asset
  if (data.asset?.length) {
    for (const row of data.asset) {
      await prisma.asset.upsert({
        where: { id: row.id },
        update: sanitizeRow(row),
        create: sanitizeRow(row),
      });
    }
    console.log(`✓ Imported ${data.asset.length} assets`);
  }

  // 4. IncomeEntry
  if (data.incomeEntry?.length) {
    for (const row of data.incomeEntry) {
      await prisma.incomeEntry.upsert({
        where: { id: row.id },
        update: sanitizeRow(row),
        create: sanitizeRow(row),
      });
    }
    console.log(`✓ Imported ${data.incomeEntry.length} income entries`);
  }

  // 5. ExpenseCategory
  if (data.expenseCategory?.length) {
    for (const row of data.expenseCategory) {
      await prisma.expenseCategory.upsert({
        where: { id: row.id },
        update: sanitizeRow(row),
        create: sanitizeRow(row),
      });
    }
    console.log(`✓ Imported ${data.expenseCategory.length} expense categories`);
  }

  // 6. ExpenseEntry
  if (data.expenseEntry?.length) {
    for (const row of data.expenseEntry) {
      await prisma.expenseEntry.upsert({
        where: { id: row.id },
        update: sanitizeRow(row),
        create: sanitizeRow(row),
      });
    }
    console.log(`✓ Imported ${data.expenseEntry.length} expense entries`);
  }

  // 7. InsurancePolicy
  if (data.insurancePolicy?.length) {
    for (const row of data.insurancePolicy) {
      await prisma.insurancePolicy.upsert({
        where: { id: row.id },
        update: sanitizeRow(row),
        create: sanitizeRow(row),
      });
    }
    console.log(`✓ Imported ${data.insurancePolicy.length} insurance policies`);
  }

  // 8. Loan
  if (data.loan?.length) {
    for (const row of data.loan) {
      await prisma.loan.upsert({
        where: { id: row.id },
        update: sanitizeRow(row),
        create: sanitizeRow(row),
      });
    }
    console.log(`✓ Imported ${data.loan.length} loans`);
  }

  // 9. RepaymentInstallment
  if (data.repaymentInstallment?.length) {
    for (const row of data.repaymentInstallment) {
      await prisma.repaymentInstallment.upsert({
        where: { id: row.id },
        update: sanitizeRow(row),
        create: sanitizeRow(row),
      });
    }
    console.log(`✓ Imported ${data.repaymentInstallment.length} repayment installments`);
  }

  // 10. PrepaymentRecord
  if (data.prepaymentRecord?.length) {
    for (const row of data.prepaymentRecord) {
      await prisma.prepaymentRecord.upsert({
        where: { id: row.id },
        update: sanitizeRow(row),
        create: sanitizeRow(row),
      });
    }
    console.log(`✓ Imported ${data.prepaymentRecord.length} prepayment records`);
  }

  // 11. RateRevisionRecord
  if (data.rateRevisionRecord?.length) {
    for (const row of data.rateRevisionRecord) {
      await prisma.rateRevisionRecord.upsert({
        where: { id: row.id },
        update: sanitizeRow(row),
        create: sanitizeRow(row),
      });
    }
    console.log(`✓ Imported ${data.rateRevisionRecord.length} rate revisions`);
  }

  // 12. SuggestionSnapshot
  if (data.suggestionSnapshot?.length) {
    for (const row of data.suggestionSnapshot) {
      await prisma.suggestionSnapshot.upsert({
        where: { id: row.id },
        update: sanitizeRow(row),
        create: sanitizeRow(row),
      });
    }
    console.log(`✓ Imported ${data.suggestionSnapshot.length} suggestion snapshots`);
  }

  // 13. MonthlyIncomeReceipt
  if (data.monthlyIncomeReceipt?.length) {
    for (const row of data.monthlyIncomeReceipt) {
      await prisma.monthlyIncomeReceipt.upsert({
        where: { id: row.id },
        update: sanitizeRow(row),
        create: sanitizeRow(row),
      });
    }
    console.log(`✓ Imported ${data.monthlyIncomeReceipt.length} income receipts`);
  }

  // 14. AuditLogEntry
  if (data.auditLogEntry?.length) {
    for (const row of data.auditLogEntry) {
      await prisma.auditLogEntry.upsert({
        where: { id: row.id },
        update: sanitizeRow(row),
        create: sanitizeRow(row),
      });
    }
    console.log(`✓ Imported ${data.auditLogEntry.length} audit log entries`);
  }

  console.log('🎉 Data migration completed successfully!');
}

importData()
  .catch((err) => {
    console.error('❌ Import failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

