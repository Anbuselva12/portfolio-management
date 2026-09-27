const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const backupFile = path.join(__dirname, 'backup.json');

async function exportData() {
  console.log('🔄 Exporting data from current database...');
  const backup = {
    family: await prisma.family.findMany(),
    member: await prisma.member.findMany(),
    asset: await prisma.asset.findMany(),
    incomeEntry: await prisma.incomeEntry.findMany(),
    expenseCategory: await prisma.expenseCategory.findMany(),
    expenseEntry: await prisma.expenseEntry.findMany(),
    insurancePolicy: await prisma.insurancePolicy.findMany(),
    loan: await prisma.loan.findMany(),
    repaymentInstallment: await prisma.repaymentInstallment.findMany(),
    prepaymentRecord: await prisma.prepaymentRecord.findMany(),
    rateRevisionRecord: await prisma.rateRevisionRecord.findMany(),
    auditLogEntry: await prisma.auditLogEntry.findMany(),
    refreshToken: await prisma.refreshToken.findMany(),
    currencyRate: await prisma.currencyRate.findMany(),
    suggestionSnapshot: await prisma.suggestionSnapshot.findMany(),
    monthlyIncomeReceipt: await prisma.monthlyIncomeReceipt.findMany(),
  };

  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2), 'utf-8');
  console.log('✅ Export complete! Saved to prisma/backup.json:');
  console.table(
    Object.entries(backup).map(([table, rows]) => ({
      Table: table,
      'Rows Exported': rows.length,
    }))
  );
}

exportData()
  .catch((err) => {
    console.error('❌ Export failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
