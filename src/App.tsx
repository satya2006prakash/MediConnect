import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'

// Auth bootstrap
import { useAuthBootstrap } from '@/hooks/useAuthBootstrap'

// Layouts
import { PublicLayout } from '@/layouts/PublicLayout'
import { AppLayout } from '@/layouts/AppLayout'
import { PharmacyLayout } from '@/layouts/PharmacyLayout'
import { AdminLayout } from '@/layouts/AdminLayout'

// Guards
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

// Public pages
import { LandingPage } from '@/pages/public/LandingPage'
import { DesignSystemShowcasePage } from '@/pages/public/DesignSystemShowcasePage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { PatientRegisterPage } from '@/pages/auth/PatientRegisterPage'
import { PharmacyRegisterPage } from '@/pages/auth/PharmacyRegisterPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { TermsPage } from '@/pages/public/TermsPage'
import { PrivacyPolicyPage } from '@/pages/public/PrivacyPolicyPage'

// Patient pages
import { PatientDashboard } from '@/pages/app/PatientDashboard'
import { MedicinesPage } from '@/pages/app/MedicinesPage'
import { PharmaciesPage } from '@/pages/app/PharmaciesPage'
import { PharmacyDetailPage } from '@/pages/app/PharmacyDetailPage'
import { OrdersPage } from '@/pages/app/OrdersPage'

import { OrderDetailPage } from '@/pages/app/OrderDetailPage'
import { NotificationsPage } from '@/pages/app/NotificationsPage'
import { ProfilePage } from '@/pages/app/ProfilePage'

// Pharmacy pages
import { PharmacyDashboard } from '@/pages/pharmacy/PharmacyDashboard'
import { PharmacyInventoryPage } from '@/pages/pharmacy/PharmacyInventoryPage'
import { PharmacyRequestsPage } from '@/pages/pharmacy/PharmacyRequestsPage'
import { PharmacyRequestDetailPage } from '@/pages/pharmacy/PharmacyRequestDetailPage'
import { PharmacyPendingApprovalPage } from '@/pages/pharmacy/PharmacyPendingApprovalPage'

// Admin pages
import { AdminDashboard } from '@/pages/admin/AdminDashboard'
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage'
import { AdminPharmaciesPage } from '@/pages/admin/AdminPharmaciesPage'
import { AdminOrdersPage } from '@/pages/admin/AdminOrdersPage'
import { AdminComplaintsPage } from '@/pages/admin/AdminComplaintsPage'
import { AdminSettingsPage } from '@/pages/admin/AdminSettingsPage'


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
})

function AppRoutes() {
  useAuthBootstrap()

  return (
    <Routes>
      {/* ── Public ── */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/design-system" element={<DesignSystemShowcasePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register/patient" element={<PatientRegisterPage />} />
        <Route path="/register/pharmacy" element={<PharmacyRegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/register" element={<Navigate to="/register/patient" replace />} />
      </Route>

      {/* ── Patient ── */}
      <Route
        path="/app"
        element={
          <ProtectedRoute allowedRoles={['patient']}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard" element={<PatientDashboard />} />
        <Route path="medicines" element={<MedicinesPage />} />
        <Route path="pharmacies" element={<PharmaciesPage />} />
        <Route path="pharmacies/:id" element={<PharmacyDetailPage />} />
        <Route path="orders" element={<OrdersPage />} />

        <Route path="orders/:id" element={<OrderDetailPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<ProfilePage />} />
      </Route>

      {/* ── Pharmacy ── */}
      <Route
        path="/pharmacy"
        element={
          <ProtectedRoute allowedRoles={['pharmacy_admin']}>
            <PharmacyLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/pharmacy/dashboard" replace />} />
        <Route path="dashboard" element={<PharmacyDashboard />} />
        <Route path="inventory" element={<PharmacyInventoryPage />} />
        <Route path="requests" element={<PharmacyRequestsPage />} />
        <Route path="requests/:id" element={<PharmacyRequestDetailPage />} />
        <Route path="orders" element={<PharmacyRequestsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route
        path="/pharmacy/pending-approval"
        element={
          <ProtectedRoute allowedRoles={['pharmacy_admin']}>
            <PharmacyPendingApprovalPage />
          </ProtectedRoute>
        }
      />

      {/* ── Admin ── */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="pharmacies" element={<AdminPharmaciesPage />} />
        <Route path="orders" element={<AdminOrdersPage />} />
        <Route path="complaints" element={<AdminComplaintsPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* ── Catch-all ── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              fontSize: '13px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
