-- Removes the retired FairShare app (trip expense splitter).
-- DESTRUCTIVE: drops the FairShare* tables and every row in them. Nothing else is touched.
-- Idempotent: safe to run more than once. To be executed by the owner in the Neon console (AGENTS.md §6).
-- Back up first if any trip data must be kept.

DROP TABLE IF EXISTS "FairShareSettlement" CASCADE;
DROP TABLE IF EXISTS "FairShareExpenseSplit" CASCADE;
DROP TABLE IF EXISTS "FairShareExpense" CASCADE;
DROP TABLE IF EXISTS "FairShareParticipant" CASCADE;
DROP TABLE IF EXISTS "FairShareHousehold" CASCADE;
DROP TABLE IF EXISTS "FairShareTrip" CASCADE;

-- Members whose default landing app was FairShare fall back to FinFamily.
UPDATE "Member" SET "preferred_app" = 'finfamily' WHERE "preferred_app" = 'fairshare';
