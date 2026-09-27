-- CreateTable
CREATE TABLE "Loan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "member_id" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "lender" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "principal" DECIMAL NOT NULL,
    "interest_type" TEXT NOT NULL DEFAULT 'reducing_compound',
    "compounding_frequency" TEXT NOT NULL DEFAULT 'monthly',
    "interest_rate" DECIMAL NOT NULL,
    "tenure_months" INTEGER NOT NULL,
    "start_date" DATETIME NOT NULL,
    "emi_amount" DECIMAL NOT NULL,
    "user_emi_input" DECIMAL,
    "emi_type" TEXT NOT NULL DEFAULT 'fixed',
    "prepayment_penalty_type" TEXT NOT NULL DEFAULT 'none',
    "prepayment_penalty_value" DECIMAL,
    "country_rule_set" TEXT NOT NULL DEFAULT 'IN',
    "status" TEXT NOT NULL DEFAULT 'active',
    "discrepancy_flag" BOOLEAN NOT NULL DEFAULT false,
    "discrepancy_details" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME,
    CONSTRAINT "Loan_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "Family" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Loan_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RepaymentInstallment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loan_id" TEXT NOT NULL,
    "installment_number" INTEGER NOT NULL,
    "due_date" DATETIME NOT NULL,
    "opening_balance" DECIMAL NOT NULL,
    "emi_amount" DECIMAL NOT NULL,
    "principal_component" DECIMAL NOT NULL,
    "interest_component" DECIMAL NOT NULL,
    "closing_balance" DECIMAL NOT NULL,
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "paid_date" DATETIME,
    "is_manually_edited" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "RepaymentInstallment_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "Loan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PrepaymentRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loan_id" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "date" DATETIME NOT NULL,
    "mode" TEXT NOT NULL,
    "penalty_amount" DECIMAL NOT NULL DEFAULT 0,
    "interest_saved" DECIMAL NOT NULL DEFAULT 0,
    "previous_payoff_date" DATETIME,
    "new_payoff_date" DATETIME,
    "previous_emi" DECIMAL,
    "new_emi" DECIMAL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PrepaymentRecord_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "Loan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
