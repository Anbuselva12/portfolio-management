# FinFamily — Family Wealth & Portfolio Management Platform

A privacy-first, multi-member family balance sheet, debt payoff engine, and wealth management platform built with NestJS, React, TypeScript, and Google Gemini AI.

---

## 🌟 Key Features

- **Multi-Member Balance Sheet**:
  - Track real-time consolidated net worth, assets, liabilities, and liquid emergency reserves across household members or filtered by individual member.
  - Interactive trailing 12-month net worth trajectory and asset allocation donuts.

- **Comprehensive Loan & Repayment Engine**:
  - Full amortization schedule generator with monthly principal vs interest splits.
  - Implied interest rate calibration via Newton-Raphson solver for reconciliation against bank statements.
  - Prepayment simulator (Reduce Tenure vs Reduce EMI) with broken interest calculation.
  - Multi-tier rate revision tracker.

- **Debt Strategy & What-If Comparison**:
  - Side-by-side strategy simulator: **Minimum Payments**, **Debt Avalanche** (highest interest first), **Debt Snowball** (smallest balance first), and **Custom-Weighted Allocation**.
  - **One-Off Lump Sum vs Recurring Mode**: Simulate applying one-time windfalls (bonus, tax refund, matured deposit) in Month 1 vs ongoing monthly surplus.
  - **Gemini AI Strategy Advisor**: Personalized debt payoff guidance analyzing tenure vs interest savings.

- **Monthly Action Queue & Dashboard Reminders**:
  - Track scheduled recurring income arrivals (e.g. rental income from multiple properties, variable salaries) directly on the dashboard.
  - Confirm receipts with 1-click arrival and inline monthly amount adjustments without altering underlying contracts.
  - 1-click "Mark EMI Paid" bi-directionally linked to loan amortization schedules.

- **Expenses, Incomes & Insurance**:
  - Granular expense categorization, recurring bill tracking, and policy renewal alerts.

- **Full Audit Trail**:
  - Immutable audit logging for all balance sheet adjustments with before/after diffs and 1-click restore.

---

## 🛠️ Tech Stack

- **Backend**: Node.js, NestJS, TypeScript, Prisma ORM (SQLite / PostgreSQL), JWT, bcrypt, Google Gemini AI SDK.
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Zustand, Recharts, Lucide Icons.
- **Testing**: Vitest, full test suite for financial amortization and strategy calculations.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or later recommended)
- npm or yarn

### 1. Clone & Configure Environment

```bash
# Clone the repository
git clone https://github.com/Anbuselva12/portfolio-management.git
cd portfolio-management

# Configure backend environment
cp backend/.env.example backend/.env
```

Edit `backend/.env` to configure:
- `JWT_ACCESS_SECRET` & `JWT_REFRESH_SECRET`
- `GEMINI_API_KEY` (optional, from [Google AI Studio](https://aistudio.google.com/app/apikey))

### 2. Backend Setup

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run start:dev
```

The backend API will start on `http://localhost:3000`.

### 3. Frontend Setup

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend will start on `http://localhost:5173`.

### 4. Running Tests

```bash
cd backend
npm test
```

---

## 🔒 Security & Privacy

- All credentials, JWT secrets, and AI keys are strictly managed via environment variables and never committed to version control.
- Passwords hashed using bcrypt (cost factor ≥ 12).
- Zero floating-point math for financial figures (fixed-point Decimal precision).

