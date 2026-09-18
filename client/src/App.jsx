import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
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

// Canonical Path and Page Configuration
export const PAGE_ROUTES = {
  home: {
    path: '/',
    aliases: ['/home'],
    title: 'Kalã — Cakes and Desserts | Artisanal Bakery Mumbai',
  },
  menu: {
    path: '/menu',
    aliases: [],
    title: 'Our Menu | Kalã — Cakes and Desserts',
  },
  custom: {
    path: '/custom-cakes',
    aliases: ['/custom', '/customcakes'],
    title: 'Custom Celebration Cakes | Kalã — Cakes and Desserts',
  },
  rewards: {
    path: '/rewards',
    aliases: [],
    title: 'Loyalty Rewards | Kalã — Cakes and Desserts',
  },
  about: {
    path: '/our-story',
    aliases: ['/about', '/story'],
    title: 'Our Story | Kalã — Cakes and Desserts',
  },
  checkout: {
    path: '/checkout',
    aliases: [],
    title: 'Checkout | Kalã — Cakes and Desserts',
  },
  'order-tracking': {
    path: '/order-tracking',
    aliases: ['/track', '/orders/track'],
    title: 'Track Your Order | Kalã — Cakes and Desserts',
  },
  profile: {
    path: '/profile',
    aliases: ['/account'],
    title: 'My Profile | Kalã — Cakes and Desserts',
  },
};

export function resolveRoute(pathname = '', hash = '') {
  const cleanPath = (pathname || '').toLowerCase().replace(/\/+$/, '') || '/';
  const cleanHash = (hash || '').replace('#', '').toLowerCase();

  // Admin route check
  if (cleanPath === '/admin' || cleanPath.startsWith('/admin') || cleanHash === 'admin') {
    return { isAdmin: true, page: 'home' };
  }

  // Check direct matches and aliases
  for (const [pageId, route] of Object.entries(PAGE_ROUTES)) {
    if (cleanPath === route.path) {
      return { isAdmin: false, page: pageId };
    }
    if (route.aliases && route.aliases.includes(cleanPath)) {
      return { isAdmin: false, page: pageId };
    }
    if (cleanHash === pageId || (route.aliases && route.aliases.some((a) => a.replace('/', '') === cleanHash))) {
      return { isAdmin: false, page: pageId };
    }
  }

  // Default to home
  return { isAdmin: false, page: 'home' };
}

function MainApp() {
  // Synchronously initialize state from current URL location
  const [activePage, setActivePageState] = useState(() => {
    if (typeof window === 'undefined') return 'home';
    const resolved = resolveRoute(window.location.pathname, window.location.hash);
    return resolved.page;
  });

  const [isAdminMode, setIsAdminMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    const resolved = resolveRoute(window.location.pathname, window.location.hash);
    return resolved.isAdmin;
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [trackOrderId, setTrackOrderId] = useState(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('token') || null;
  });

  const { isAdminAuthenticated } = useAuth();
  const { isCartOpen, closeCart } = useCart();

  // Listen to browser Back/Forward (popstate) events
  useEffect(() => {
    const handlePopState = () => {
      const resolved = resolveRoute(window.location.pathname, window.location.hash);

      setIsAdminMode(resolved.isAdmin);
      setActivePageState(resolved.page);

      // Extract tracking token from query params if popping to tracking page
      if (resolved.page === 'order-tracking') {
        const params = new URLSearchParams(window.location.search);
        const qToken = params.get('token');
        if (qToken) {
          setTrackOrderId(qToken);
        }
      }

      // Update document title
      if (resolved.isAdmin) {
        document.title = 'Owner Portal | Kalã — Cakes and Desserts';
      } else {
        const route = PAGE_ROUTES[resolved.page] || PAGE_ROUTES.home;
        document.title = route.title;
      }

      // Close open modals / drawer when navigating backwards/forwards
      setIsAuthModalOpen(false);
      if (closeCart) {
        closeCart(true);
      }

      window.scrollTo({ top: 0, behavior: 'instant' });
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [closeCart]);

  // Initial mount: ensure canonical URL is in history without creating extra entries
  useEffect(() => {
    const resolved = resolveRoute(window.location.pathname, window.location.hash);
    if (resolved.isAdmin) {
      if (window.location.pathname !== '/admin') {
        window.history.replaceState({ admin: true }, '', '/admin');
      }
      document.title = 'Owner Portal | Kalã — Cakes and Desserts';
    } else {
      const route = PAGE_ROUTES[resolved.page] || PAGE_ROUTES.home;
      let targetPath = route.path;
      if (window.location.search) {
        targetPath += window.location.search;
      }

      // If user landed on alias (like /custom) or hash (like #menu), replace with canonical path
      if (window.location.pathname !== route.path || window.location.hash) {
        window.history.replaceState({ page: resolved.page }, '', targetPath);
      } else if (!window.history.state) {
        window.history.replaceState({ page: resolved.page }, '', targetPath);
      }
      document.title = route.title;
    }
  }, []);

  // Primary Path Navigation Function (called by setActivePage)
  const navigate = useCallback((target, options = {}) => {
    let pageId = target;
    let opts = options;
    if (typeof target === 'object' && target !== null) {
      pageId = target.page;
      opts = target;
    }

    const { replace = false, token = null, preserveScroll = false } = opts || {};

    if (isAdminMode) {
      setIsAdminMode(false);
    }

    const route = PAGE_ROUTES[pageId] || PAGE_ROUTES.home;
    let targetPath = route.path;

    if (token) {
      setTrackOrderId(token);
      targetPath = `${targetPath}?token=${encodeURIComponent(token)}`;
    }

    const isSamePage = activePage === pageId && !isAdminMode;
    const isSamePath = window.location.pathname === route.path && (!token || window.location.search.includes(token));

    if (closeCart) {
      closeCart(true);
    }

    // If already on this exact page and URL, just scroll to top without adding redundant history
    if (isSamePage && isSamePath) {
      if (!preserveScroll) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    const hasCartState = typeof window !== 'undefined' && window.history.state && window.history.state.cartOpen;
    const shouldReplace = replace || Boolean(hasCartState);

    // Push new history entry (or replace)
    if (shouldReplace) {
      window.history.replaceState({ page: pageId }, '', targetPath);
    } else {
      window.history.pushState({ page: pageId }, '', targetPath);
    }

    setActivePageState(pageId);
    document.title = route.title;

    // Close any modal
    setIsAuthModalOpen(false);

    if (!preserveScroll) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [activePage, isAdminMode, closeCart]);

  const handleOpenAdmin = () => {
    setIsAdminMode(true);
    window.history.pushState({ admin: true }, '', '/admin');
    document.title = 'Owner Portal | Kalã — Cakes and Desserts';
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleBackToWebsite = () => {
    setIsAdminMode(false);
    navigate('home');
  };

  // If Admin Mode is active (/admin)
  if (isAdminMode) {
    if (!isAdminAuthenticated) {
      return (
        <AdminLoginPage
          onBackToWebsite={handleBackToWebsite}
          onLoginSuccess={() => {
            setIsAdminMode(true);
            window.history.pushState({ admin: true }, '', '/admin');
            document.title = 'Owner Portal | Kalã — Cakes and Desserts';
            window.scrollTo({ top: 0, behavior: 'instant' });
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
        setActivePage={navigate}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenAdmin={handleOpenAdmin}
      />

      {/* Main Content Area */}
      <main style={{ flexGrow: 1 }}>
        {activePage === 'home' && (
          <HomePage
            setActivePage={navigate}
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
            setActivePage={navigate}
            onOpenAuth={() => setIsAuthModalOpen(true)}
          />
        )}

        {activePage === 'checkout' && (
          <CheckoutPage
            setActivePage={navigate}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            setTrackOrderId={setTrackOrderId}
          />
        )}

        {activePage === 'order-tracking' && (
          <OrderTrackingPage
            trackOrderId={trackOrderId}
            setActivePage={navigate}
          />
        )}

        {activePage === 'profile' && (
          <ProfilePage
            setActivePage={navigate}
            setTrackOrderId={setTrackOrderId}
          />
        )}

        {activePage === 'about' && (
          <AboutPage
            setActivePage={navigate}
          />
        )}
      </main>

      {/* Slide-out Cart Drawer */}
      <CartDrawer
        onProceedCheckout={() => {
          if (closeCart) closeCart(true);
          const hasCartState = typeof window !== 'undefined' && window.history.state && window.history.state.cartOpen;
          navigate('checkout', { replace: Boolean(hasCartState) });
        }}
        onExploreMenu={() => {
          if (closeCart) closeCart(true);
          const hasCartState = typeof window !== 'undefined' && window.history.state && window.history.state.cartOpen;
          if (activePage === 'menu') {
            if (hasCartState && typeof window !== 'undefined') {
              window.history.back();
            }
          } else {
            navigate('menu', { replace: Boolean(hasCartState) });
          }
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
        setActivePage={navigate}
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
