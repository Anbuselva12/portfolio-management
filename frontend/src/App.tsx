import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import { AppShell } from './components/layout/AppShell';

import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { FamilySelectionPage } from './pages/onboarding/FamilySelectionPage';
import { PendingApprovalPage } from './pages/onboarding/PendingApprovalPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { AssetsPage } from './pages/assets/AssetsPage';
import { IncomePage } from './pages/income/IncomePage';
import { ExpensesPage } from './pages/expenses/ExpensesPage';
import { InsurancePage } from './pages/insurance/InsurancePage';
import { LoansPage } from './pages/loans/LoansPage';
import { LoanDetailPage } from './pages/loans/LoanDetailPage';
import { StrategyComparisonPage } from './pages/strategies/StrategyComparisonPage';
import { TransactionsPage } from './pages/transactions/TransactionsPage';
import { AuditTrailPage } from './pages/settings/AuditTrailPage';
import { MyProfilePage } from './pages/settings/MyProfilePage';
import { FamilySettingsPage } from './pages/settings/FamilySettingsPage';
import { MembersAccessPage } from './pages/settings/MembersAccessPage';
import { TrackerHubPage } from './pages/tracker/TrackerHubPage';
import { TrackerProjectDetailPage } from './pages/tracker/TrackerProjectDetailPage';

// Root redirect respecting preferred application
const RootRedirect: React.FC = () => {
  const { user } = useAuthStore();
  const target = user?.preferredApp === 'expense_tracker' ? '/tracker' : '/dashboard';
  return <Navigate to={target} replace />;
};

// For routes requiring an active member account
const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuthStore();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-400 text-sm">
        Loading workspace...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.status === 'unaffiliated') return <Navigate to="/onboarding/family-selection" replace />;
  if (user.status === 'pending_approval') return <Navigate to="/onboarding/pending" replace />;
  return <>{children}</>;
};

// For onboarding screens
const RequireOnboarding: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuthStore();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-400 text-sm">
        Loading...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.status === 'active') {
    return <Navigate to={user.preferredApp === 'expense_tracker' ? '/tracker' : '/dashboard'} replace />;
  }
  return <>{children}</>;
};

// Redirect away from login/register if already logged in
const RedirectIfAuthenticated: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuthStore();
  if (isLoading) return null;
  if (user) {
    if (user.status === 'unaffiliated') return <Navigate to="/onboarding/family-selection" replace />;
    if (user.status === 'pending_approval') return <Navigate to="/onboarding/pending" replace />;
    return <Navigate to={user.preferredApp === 'expense_tracker' ? '/tracker' : '/dashboard'} replace />;
  }
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <RedirectIfAuthenticated>
              <LoginPage />
            </RedirectIfAuthenticated>
          }
        />
        <Route
          path="/register"
          element={
            <RedirectIfAuthenticated>
              <RegisterPage />
            </RedirectIfAuthenticated>
          }
        />

        <Route
          path="/onboarding/family-selection"
          element={
            <RequireOnboarding>
              <FamilySelectionPage />
            </RequireOnboarding>
          }
        />
        <Route
          path="/onboarding/pending"
          element={
            <RequireOnboarding>
              <PendingApprovalPage />
            </RequireOnboarding>
          }
        />

        <Route
          path="/"
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<RootRedirect />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="assets" element={<AssetsPage />} />
          <Route path="income" element={<IncomePage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="insurance" element={<InsurancePage />} />
          <Route path="loans" element={<LoansPage />} />
          <Route path="loans/:id" element={<LoanDetailPage />} />
          <Route path="strategies" element={<StrategyComparisonPage />} />
          <Route path="tracker" element={<TrackerHubPage />} />
          <Route path="tracker/projects/:id" element={<TrackerProjectDetailPage />} />
          <Route path="tracker/settings" element={<MyProfilePage />} />
          <Route path="settings">
            <Route index element={<Navigate to="/settings/profile" replace />} />
            <Route path="profile" element={<MyProfilePage />} />
            <Route path="family" element={<FamilySettingsPage />} />
            <Route path="members" element={<MembersAccessPage />} />
            <Route path="audit" element={<AuditTrailPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
