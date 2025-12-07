import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Public Route Component (redirect if already logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useStore();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
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
          <Route path="detail-page" element={<DetailPagePage />} />
          <Route path="detail-page/:id" element={<DetailPagePage />} />
          <Route path="influencer" element={<InfluencerPage />} />
          <Route path="influencer/:id" element={<InfluencerPage />} />
          <Route path="product-order" element={<ProductOrderPage />} />
          <Route path="product-order/:id" element={<ProductOrderPage />} />
          <Route path="group-purchase" element={<GroupPurchasePage />} />
          <Route path="group-purchase/:id" element={<GroupPurchasePage />} />
          <Route path="other" element={<OtherPage />} />
          <Route path="other/:id" element={<OtherPage />} />
          <Route path="statistics" element={<StatisticsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
