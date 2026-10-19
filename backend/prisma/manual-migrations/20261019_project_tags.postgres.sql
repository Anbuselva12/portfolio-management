-- Project tags, loan→project allocations and project current value.
-- ADDITIVE ONLY: no table/column is renamed, dropped or rewritten; existing rows are untouched.
-- Idempotent: safe to run more than once. To be executed by the owner in the Neon console (AGENTS.md §6).

ALTER TABLE "TrackerProject" ADD COLUMN IF NOT EXISTS "current_value" DECIMAL(65,30);

ALTER TABLE "IncomeEntry" ADD COLUMN IF NOT EXISTS "project_id" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'IncomeEntry_project_id_fkey') THEN
    ALTER TABLE "IncomeEntry"
      ADD CONSTRAINT "IncomeEntry_project_id_fkey"
      FOREIGN KEY ("project_id") REFERENCES "TrackerProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ProjectLoanAllocation" (
  "id"         TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "loan_id"    TEXT NOT NULL,
  "amount"     DECIMAL(65,30) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectLoanAllocation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectLoanAllocation_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "TrackerProject"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProjectLoanAllocation_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "Loan"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProjectLoanAllocation_project_id_loan_id_key"
  ON "ProjectLoanAllocation"("project_id", "loan_id");
