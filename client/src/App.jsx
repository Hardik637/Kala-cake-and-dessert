import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './context/ToastContext';
import { StoreSettingsProvider } from './context/StoreSettingsContext';

// Customer Components & Pages
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import AuthModal from './components/AuthModal';

import HomePage from './pages/HomePage';
import MenuPage from './pages/MenuPage';
import CustomOrdersPage from './pages/CustomOrdersPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderTrackingPage from './pages/OrderTrackingPage';
import RewardsPage from './pages/RewardsPage';
import ProfilePage from './pages/ProfilePage';
import AboutPage from './pages/AboutPage';

// Admin Components & Pages
import AdminPortal from './pages/admin/AdminPortal';
import AdminLoginPage from './pages/admin/AdminLoginPage';

function MainApp() {
  const [activePage, setActivePage] = useState('home'); // home, menu, custom, rewards, checkout, order-tracking, profile, about
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [trackOrderId, setTrackOrderId] = useState(null);

  const { isAdminAuthenticated } = useAuth();

  // Handle URL path and hash routing (/admin, #admin, #menu, etc.)
  useEffect(() => {
    const handleRoute = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.replace('#', '').toLowerCase();

      if (path === '/admin' || path.startsWith('/admin') || hash === 'admin') {
        setIsAdminMode(true);
      } else {
        setIsAdminMode(false);
        if (hash && ['menu', 'rewards', 'custom', 'checkout', 'profile', 'about'].includes(hash)) {
          setActivePage(hash);
        }
      }
    };

    handleRoute();
    window.addEventListener('popstate', handleRoute);
    window.addEventListener('hashchange', handleRoute);
    return () => {
      window.removeEventListener('popstate', handleRoute);
      window.removeEventListener('hashchange', handleRoute);
    };
  }, []);

  const handleOpenAdmin = () => {
    setIsAdminMode(true);
    window.history.pushState({}, '', '/admin');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToWebsite = () => {
    setIsAdminMode(false);
    window.history.pushState({}, '', '/');
    window.location.hash = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If Admin Mode is active (/admin or #admin)
  if (isAdminMode) {
    if (!isAdminAuthenticated) {
      return (
        <AdminLoginPage
          onBackToWebsite={handleBackToWebsite}
          onLoginSuccess={() => {
            setIsAdminMode(true);
            window.history.pushState({}, '', '/admin');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      );
    }
    return (
      <AdminPortal
        onReturnToStore={handleBackToWebsite}
      />
    );
  }

  // Customer Facing Experience
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Sticky Navigation */}
      <Navbar
        activePage={activePage}
        setActivePage={setActivePage}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenAdmin={handleOpenAdmin}
      />

      {/* Main Content Area */}
      <main style={{ flexGrow: 1 }}>
        {activePage === 'home' && (
          <HomePage
            setActivePage={setActivePage}
            onOpenAuth={() => setIsAuthModalOpen(true)}
          />
        )}

        {activePage === 'menu' && (
          <MenuPage />
        )}

        {activePage === 'custom' && (
          <CustomOrdersPage />
        )}

        {activePage === 'rewards' && (
          <RewardsPage
            setActivePage={setActivePage}
            onOpenAuth={() => setIsAuthModalOpen(true)}
          />
        )}

        {activePage === 'checkout' && (
          <CheckoutPage
            setActivePage={setActivePage}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            setTrackOrderId={setTrackOrderId}
          />
        )}

        {activePage === 'order-tracking' && (
          <OrderTrackingPage
            trackOrderId={trackOrderId}
            setActivePage={setActivePage}
          />
        )}

        {activePage === 'profile' && (
          <ProfilePage
            setActivePage={setActivePage}
            setTrackOrderId={setTrackOrderId}
          />
        )}

        {activePage === 'about' && (
          <AboutPage
            setActivePage={setActivePage}
          />
        )}
      </main>

      {/* Slide-out Cart Drawer */}
      <CartDrawer
        onProceedCheckout={() => {
          setActivePage('checkout');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onExploreMenu={() => {
          setActivePage('menu');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Customer Login / Register Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {}}
      />

      {/* Boutique Footer */}
      <Footer
        setActivePage={setActivePage}
        onOpenAdmin={handleOpenAdmin}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <StoreSettingsProvider>
        <AuthProvider>
          <CartProvider>
            <MainApp />
          </CartProvider>
        </AuthProvider>
      </StoreSettingsProvider>
    </ToastProvider>
  );
}
