import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './routes/ProtectedRoute.js';

// Public Landing Page
import { LandingPage } from './pages/public/LandingPage.js';

// Parent Portal Views
import { ParentLogin } from './pages/parent/ParentLogin.js';
import { ParentDashboard } from './pages/parent/ParentDashboard.js';
import { ParentAcademic } from './pages/parent/ParentAcademic.js';

// Accounts Portal Views
import { AccountsLogin } from './pages/accounts/AccountsLogin.js';
import { AccountsDashboard } from './pages/accounts/AccountsDashboard.js';
import { StudentLedgerView } from './pages/accounts/StudentLedgerView.js';
import { AgeingReportView } from './pages/accounts/AgeingReportView.js';
import { UnmatchedQueueView } from './pages/accounts/UnmatchedQueueView.js';
import { TallyExportView } from './pages/accounts/TallyExportView.js';

export const App: React.FC = () => {
  return (
    <Routes>
      {/* Public Landing Page */}
      <Route path="/" element={<LandingPage />} />

      {/* Aliased Login Routes */}
      <Route path="/login" element={<ParentLogin />} />
      <Route path="/parent/login" element={<ParentLogin />} />
      <Route
        path="/parent"
        element={
          <ProtectedRoute requiredRole="parent">
            <ParentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/parent/academic"
        element={
          <ProtectedRoute requiredRole="parent">
            <ParentAcademic />
          </ProtectedRoute>
        }
      />

      {/* Accounts Portal Routes */}
      <Route path="/accounts/login" element={<AccountsLogin />} />
      <Route
        path="/accounts"
        element={
          <ProtectedRoute requiredRole="accounts_executive">
            <AccountsDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/accounts/ledger/:studentId"
        element={
          <ProtectedRoute requiredRole="accounts_executive">
            <StudentLedgerView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/accounts/ageing"
        element={
          <ProtectedRoute requiredRole="accounts_executive">
            <AgeingReportView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/accounts/unmatched"
        element={
          <ProtectedRoute requiredRole="accounts_executive">
            <UnmatchedQueueView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/accounts/tally"
        element={
          <ProtectedRoute requiredRole="accounts_executive">
            <TallyExportView />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;

