-- AlterTable
ALTER TABLE "Family" ADD COLUMN "strategy_weights" TEXT;

-- CreateTable
CREATE TABLE "CurrencyRate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "family_id" TEXT NOT NULL,
    "from_currency" TEXT NOT NULL,
    "to_currency" TEXT NOT NULL,
    "rate" DECIMAL NOT NULL,
    "updated_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CurrencyRate_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "Family" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SuggestionSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "family_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "strategy_name" TEXT NOT NULL,
    "surplus" DECIMAL NOT NULL,
    "allocations" TEXT NOT NULL,
    "metrics" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SuggestionSnapshot_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "Family" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SuggestionSnapshot_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CurrencyRate_family_id_from_currency_to_currency_key" ON "CurrencyRate"("family_id", "from_currency", "to_currency");
