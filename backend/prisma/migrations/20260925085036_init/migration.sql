-- CreateTable
CREATE TABLE "Family" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "base_currency" TEXT NOT NULL DEFAULT 'INR',
    "country" TEXT NOT NULL DEFAULT 'IN',
    "join_policy" TEXT NOT NULL DEFAULT 'approval_required',
    "is_discoverable" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "family_id" TEXT,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "status" TEXT NOT NULL DEFAULT 'unaffiliated',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "preferred_currency" TEXT NOT NULL DEFAULT 'INR',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" DATETIME,
    CONSTRAINT "Member_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "Family" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "member_id" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "current_value" DECIMAL NOT NULL,
    "principal_invested" DECIMAL,
    "maturity_date" DATETIME,
    "interest_rate" DECIMAL,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME,
    CONSTRAINT "Asset_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "Family" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Asset_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IncomeEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "member_id" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "recurrence" TEXT NOT NULL,
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'active',
    "superseded_by_id" TEXT,
    "last_amount_change_date" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME,
    CONSTRAINT "IncomeEntry_superseded_by_id_fkey" FOREIGN KEY ("superseded_by_id") REFERENCES "IncomeEntry" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "IncomeEntry_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "Family" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "IncomeEntry_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "family_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExpenseCategory_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "Family" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExpenseEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "member_id" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "date" DATETIME NOT NULL,
    "notes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME,
    CONSTRAINT "ExpenseEntry_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ExpenseEntry_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "Family" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ExpenseEntry_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "ExpenseCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InsurancePolicy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "member_id" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "policy_type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "policy_number" TEXT NOT NULL,
    "sum_assured" DECIMAL NOT NULL,
    "premium_amount" DECIMAL NOT NULL,
    "premium_frequency" TEXT NOT NULL,
    "next_due_date" DATETIME NOT NULL,
    "linked_category_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME,
    CONSTRAINT "InsurancePolicy_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InsurancePolicy_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "Family" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InsurancePolicy_linked_category_id_fkey" FOREIGN KEY ("linked_category_id") REFERENCES "ExpenseCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLogEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "family_id" TEXT,
    "member_id" TEXT,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "field_changes" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLogEntry_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "Family" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditLogEntry_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "member_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "RefreshToken_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Member_username_key" ON "Member"("username");
