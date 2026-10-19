-- Solo workspaces and family notifications (additive, idempotent). Run once on the production database.
ALTER TABLE "Family" ADD COLUMN IF NOT EXISTS "is_personal" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Family" ADD COLUMN IF NOT EXISTS "owner_member_id" TEXT;

CREATE TABLE IF NOT EXISTS "FamilyNotification" (
  "id" TEXT NOT NULL,
  "family_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dismissed_at" TIMESTAMP(3),
  "dismissed_by_id" TEXT,
  CONSTRAINT "FamilyNotification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FamilyNotification_family_id_dismissed_at_idx"
  ON "FamilyNotification"("family_id", "dismissed_at");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FamilyNotification_family_id_fkey') THEN
    ALTER TABLE "FamilyNotification"
      ADD CONSTRAINT "FamilyNotification_family_id_fkey"
      FOREIGN KEY ("family_id") REFERENCES "Family"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
