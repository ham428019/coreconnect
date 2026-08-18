import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useEffect } from 'react';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import AIWidget from './components/layout/AIWidget';
import DashboardLayout from './components/layout/DashboardLayout';
import { useAuthStore, useUIStore } from './stores';
import { api } from './lib/api';

import Home from './pages/Home';
import CategoryPage from './pages/CategoryPage';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderSuccess from './pages/OrderSuccess';
import OrderHistory from './pages/OrderHistory';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Wishlist from './pages/Wishlist';
import SearchResults from './pages/SearchResults';

import AdminDashboard from './pages/admin/Dashboard';
import AdminProducts from './pages/admin/Products';
import AdminOrders from './pages/admin/Orders';
import AdminUsers from './pages/admin/Users';
import AdminCategories from './pages/admin/Categories';
import AdminAnalytics from './pages/admin/Analytics';

import ManagerDashboard from './pages/manager/Dashboard';
import ManagerInventory from './pages/manager/Inventory';
import ManagerCoupons from './pages/manager/Coupons';

import EmployeeDashboard from './pages/employee/Dashboard';
import EmployeeProducts from './pages/employee/Products';
import EmployeeInventory from './pages/employee/Inventory';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30000, retry: 1 } },
});

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute roles={['ADMIN']}>{children}</ProtectedRoute>;
}

function ManagerRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute roles={['MANAGER', 'ADMIN']}>{children}</ProtectedRoute>;
}

function EmployeeRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute roles={['EMPLOYEE', 'MANAGER', 'ADMIN']}>{children}</ProtectedRoute>;
}

export default function App() {
  const { setUser } = useAuthStore();
  const { theme } = useUIStore();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    api.get('/auth/me').then((res: any) => {
      if (res.success) setUser(res.data.user);
    }).catch(() => {
      setUser(null);
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <main className="flex-1">
                <Home />
              </main>
              <Footer />
              <AIWidget />
            </div>
          } />
          <Route path="/category/:slug" element={
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
                <CategoryPage />
              </main>
              <Footer />
              <AIWidget />
            </div>
          } />
          <Route path="/product/:slug" element={
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
                <ProductDetail />
              </main>
              <Footer />
              <AIWidget />
            </div>
          } />
          <Route path="/cart" element={
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
                <Cart />
              </main>
              <Footer />
              <AIWidget />
            </div>
          } />
          <Route path="/checkout" element={
            <ProtectedRoute>
              <div className="flex flex-col min-h-screen checkout-bg">
                <Navbar />
                <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full">
                  <Checkout />
                </main>
                <Footer />
                <AIWidget />
              </div>
            </ProtectedRoute>
          } />
          <Route path="/order-success/:id" element={
            <ProtectedRoute>
              <div className="flex flex-col min-h-screen">
                <Navbar />
                <main className="flex-1 max-w-2xl mx-auto px-4 py-8 w-full">
                  <OrderSuccess />
                </main>
                <Footer />
                <AIWidget />
              </div>
            </ProtectedRoute>
          } />
          <Route path="/orders" element={
            <ProtectedRoute>
              <div className="flex flex-col min-h-screen">
                <Navbar />
                <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full">
                  <OrderHistory />
                </main>
                <Footer />
                <AIWidget />
              </div>
            </ProtectedRoute>
          } />
          <Route path="/login" element={
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <main className="flex-1">
                <Login />
              </main>
              <Footer />
            </div>
          } />
          <Route path="/register" element={
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <main className="flex-1">
                <Register />
              </main>
              <Footer />
            </div>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <div className="flex flex-col min-h-screen">
                <Navbar />
                <main className="flex-1 max-w-2xl mx-auto px-4 py-8 w-full">
                  <Profile />
                </main>
                <Footer />
                <AIWidget />
              </div>
            </ProtectedRoute>
          } />
          <Route path="/wishlist" element={
            <ProtectedRoute>
              <div className="flex flex-col min-h-screen">
                <Navbar />
                <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
                  <Wishlist />
                </main>
                <Footer />
                <AIWidget />
              </div>
            </ProtectedRoute>
          } />
          <Route path="/search" element={
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
                <SearchResults />
              </main>
              <Footer />
              <AIWidget />
            </div>
          } />

          <Route path="/admin/*" element={<AdminRoute><DashboardLayout /></AdminRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="analytics" element={<AdminAnalytics />} />
          </Route>

          <Route path="/manager/*" element={<ManagerRoute><DashboardLayout /></ManagerRoute>}>
            <Route index element={<ManagerDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="inventory" element={<ManagerInventory />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="coupons" element={<ManagerCoupons />} />
            <Route path="analytics" element={<AdminAnalytics />} />
          </Route>

          <Route path="/employee/*" element={<EmployeeRoute><DashboardLayout /></EmployeeRoute>}>
            <Route index element={<EmployeeDashboard />} />
            <Route path="products" element={<EmployeeProducts />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="inventory" element={<EmployeeInventory />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}
