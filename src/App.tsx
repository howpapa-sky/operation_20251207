import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useStore } from './store/useStore';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import SamplingPage from './pages/SamplingPage';
import DetailPagePage from './pages/DetailPagePage';
import InfluencerPage from './pages/InfluencerPage';
import ProductOrderPage from './pages/ProductOrderPage';
import GroupPurchasePage from './pages/GroupPurchasePage';
import OtherPage from './pages/OtherPage';
import StatisticsPage from './pages/StatisticsPage';
import SettingsPage from './pages/SettingsPage';
import SalesPage from './pages/SalesPage';
import ProductMasterPage from './pages/ProductMasterPage';
import PromotionPage from './pages/PromotionPage';
import PersonalNotesPage from './pages/PersonalNotesPage';
import MyTasksPage from './pages/MyTasksPage';
import StatusUpdatesPage from './pages/StatusUpdatesPage';
import DevRequestPage from './pages/DevRequestPage';

// Seeding Pages
import SeedingProjectsPage from './pages/seeding/SeedingProjectsPage';
import SeedingListPage from './pages/seeding/SeedingListPage';
import OutreachPage from './pages/seeding/OutreachPage';
import ShippingPage from './pages/seeding/ShippingPage';
import ProductGuidesPage from './pages/seeding/ProductGuidesPage';
import ProductGuideEditPage from './pages/seeding/ProductGuideEditPage';
import ProductGuidePublicPage from './pages/seeding/ProductGuidePublicPage';
import SeedingReportsPage from './pages/seeding/SeedingReportsPage';

// Loading Screen
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-10 h-10 text-primary-600 animate-spin mx-auto" />
        <p className="mt-4 text-gray-500">로딩 중...</p>
      </div>
    </div>
  );
}

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useStore();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Public Route Component (redirect if already logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useStore();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { checkAuth } = useStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="sampling" element={<SamplingPage />} />
          <Route path="sampling/:id" element={<SamplingPage />} />
          <Route path="sampling/:id/edit" element={<SamplingPage />} />
          <Route path="detail-page" element={<DetailPagePage />} />
          <Route path="detail-page/:id" element={<DetailPagePage />} />
          <Route path="detail-page/:id/edit" element={<DetailPagePage />} />
          <Route path="influencer" element={<InfluencerPage />} />
          <Route path="influencer/:id" element={<InfluencerPage />} />
          <Route path="influencer/:id/edit" element={<InfluencerPage />} />
          <Route path="product-order" element={<ProductOrderPage />} />
          <Route path="product-order/:id" element={<ProductOrderPage />} />
          <Route path="product-order/:id/edit" element={<ProductOrderPage />} />
          <Route path="group-purchase" element={<GroupPurchasePage />} />
          <Route path="group-purchase/:id" element={<GroupPurchasePage />} />
          <Route path="group-purchase/:id/edit" element={<GroupPurchasePage />} />
          <Route path="other" element={<OtherPage />} />
          <Route path="other/:id" element={<OtherPage />} />
          <Route path="other/:id/edit" element={<OtherPage />} />
          <Route path="dev-requests" element={<DevRequestPage />} />
          <Route path="sales" element={<SalesPage />} />
          <Route path="product-master" element={<ProductMasterPage />} />
          <Route path="product-master/:id" element={<ProductMasterPage />} />
          <Route path="product-master/:id/edit" element={<ProductMasterPage />} />
          <Route path="promotion" element={<PromotionPage />} />
          <Route path="promotion/:id" element={<PromotionPage />} />
          <Route path="promotion/:id/edit" element={<PromotionPage />} />
          <Route path="statistics" element={<StatisticsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="personal/notes" element={<PersonalNotesPage />} />
          <Route path="personal/my-tasks" element={<MyTasksPage />} />
          <Route path="personal/status-updates" element={<StatusUpdatesPage />} />

          {/* Seeding Routes */}
          <Route path="seeding" element={<SeedingProjectsPage />} />
          <Route path="seeding/list" element={<SeedingListPage />} />
          <Route path="seeding/list/:projectId" element={<SeedingListPage />} />
          <Route path="seeding/outreach" element={<OutreachPage />} />
          <Route path="seeding/shipping" element={<ShippingPage />} />
          <Route path="seeding/guides" element={<ProductGuidesPage />} />
          <Route path="seeding/guides/new" element={<ProductGuideEditPage />} />
          <Route path="seeding/guides/:id/edit" element={<ProductGuideEditPage />} />
          <Route path="seeding/reports" element={<SeedingReportsPage />} />
        </Route>

        {/* Public Guide Page (no auth required) */}
        <Route path="/g/:slug" element={<ProductGuidePublicPage />} />

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
