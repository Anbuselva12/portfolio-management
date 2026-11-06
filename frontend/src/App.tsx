import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import { AppShell } from './components/layout/AppShell';

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

/** Landing route for a user's preferred application (`expense_tracker` now means Expenses → Projects). */
const landingRoute = (preferredApp?: string): string =>
  preferredApp === 'expense_tracker' ? '/expenses/projects' : '/dashboard';

/** Legacy `/tracker/projects/:id` links. */
const LegacyTrackerProjectRedirect: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/expenses/projects/${id}`} replace />;
};

/** Sends signed-out visitors to the public landing page, opening its sign-in or sign-up drawer. */
const ToLanding: React.FC<{ hash: '#signin' | '#signup' }> = ({ hash }) => {
  useEffect(() => {
    window.location.replace(`/${hash}`);
  }, [hash]);
  return null;
};

// Root redirect respecting preferred application
const RootRedirect: React.FC = () => {
  const { user } = useAuthStore();
  return <Navigate to={landingRoute(user?.preferredApp)} replace />;
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
  if (!user) return <ToLanding hash="#signin" />;
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
  if (!user) return <ToLanding hash="#signin" />;
  if (user.status === 'active') {
    return <Navigate to={landingRoute(user.preferredApp)} replace />;
  }
  return <>{children}</>;
};

/** Old /login and /register URLs: signed-in users go to the app, everyone else to the landing page. */
const LegacyAuthRoute: React.FC<{ hash: '#signin' | '#signup' }> = ({ hash }) => {
  const { user, isLoading } = useAuthStore();
  if (isLoading) return null;
  if (user) {
    if (user.status === 'unaffiliated') return <Navigate to="/onboarding/family-selection" replace />;
    if (user.status === 'pending_approval') return <Navigate to="/onboarding/pending" replace />;
    return <Navigate to={landingRoute(user.preferredApp)} replace />;
  }
  return <ToLanding hash={hash} />;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LegacyAuthRoute hash="#signin" />} />
        <Route path="/register" element={<LegacyAuthRoute hash="#signup" />} />

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
          <Route path="expenses/projects" element={<TrackerHubPage />} />
          <Route path="expenses/projects/:id" element={<TrackerProjectDetailPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="insurance" element={<InsurancePage />} />
          <Route path="loans" element={<LoansPage />} />
          <Route path="loans/:id" element={<LoanDetailPage />} />
          <Route path="strategies" element={<StrategyComparisonPage />} />
          {/* Expense Tracker merged into Expenses → Projects (legacy URLs redirect) */}
          <Route path="tracker" element={<Navigate to="/expenses/projects" replace />} />
          <Route path="tracker/projects/:id" element={<LegacyTrackerProjectRedirect />} />
          <Route path="tracker/settings" element={<Navigate to="/settings/profile" replace />} />
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
