import React, { useState, useEffect } from 'react';
import { ShoppingBag, User, Menu, X, Shield } from 'lucide-react';
import { BRAND_CONFIG } from '../config/brand';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useStoreSettings } from '../context/StoreSettingsContext';

export default function Navbar({ onOpenAuth, onOpenAdmin, activePage, setActivePage }) {
  const { customerUser, isCustomerAuthenticated, customerMilestone } = useAuth();
  const { itemCount, openCart } = useCart();
  const { settings } = useStoreSettings();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const navLinks = [
    { id: 'home', label: 'Home' },
    { id: 'menu', label: 'Menu' },
    { id: 'custom', label: 'Custom Cakes' },
    { id: 'rewards', label: 'Rewards' },
    { id: 'about', label: 'Our Story' },
  ];

  const brandName = settings?.brand_name || BRAND_CONFIG.name || 'Kalã';
  const brandTagline = settings?.brand_tagline || BRAND_CONFIG.tagline || 'Cakes and Desserts';

  const handleNav = (id) => {
    setActivePage(id);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <header
        className={`main-navbar ${isScrolled ? 'scrolled' : ''}`}
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: isScrolled ? 'rgba(250, 248, 245, 0.98)' : 'var(--color-bg)',
          backdropFilter: 'blur(10px)',
          borderBottom: isScrolled ? '1px solid var(--color-border)' : '1px solid transparent',
          transition: 'all var(--transition-fast)',
          height: 'var(--nav-height, 68px)',
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div
          className="container"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '0 16px',
            boxSizing: 'border-box',
          }}
        >
          {/* Brand Logo & Tagline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '28px', minWidth: 0 }}>
            <button
              onClick={() => handleNav('home')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                padding: '4px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                minWidth: 0,
              }}
              aria-label="Kalã Cakes and Desserts Homepage"
            >
              {/* Bakery Logo (Slot targeting client/public/logo.png) */}
              <img
                src="/logo.png"
                alt="Kalã Logo"
                className="nav-bakery-logo"
                style={{
                  height: 'clamp(32px, 4.5vw, 42px)',
                  width: 'auto',
                  maxHeight: '42px',
                  objectFit: 'contain',
                  display: 'block',
                  flexShrink: 0,
                }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 'clamp(1.2rem, 3.6vw, 1.48rem)',
                    fontWeight: 700,
                    color: 'var(--color-text-main)',
                    letterSpacing: '0.04em',
                    display: 'block',
                    lineHeight: 1.1,
                    textTransform: 'uppercase',
                  }}
                >
                  {brandName}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'clamp(0.58rem, 1.8vw, 0.68rem)',
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'var(--color-primary)',
                    display: 'block',
                    marginTop: '2px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {brandTagline}
                </span>
              </div>
            </button>

            {/* Desktop Navigation Links */}
            <nav className="nav-desktop" style={{ display: 'flex', gap: '22px', alignItems: 'center' }}>
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => handleNav(link.id)}
                  className={`nav-link-btn ${activePage === link.id ? 'active' : ''}`}
                >
                  {link.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Right Controls (Account, Cart, Hamburger) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            {/* Account Trigger */}
            {isCustomerAuthenticated ? (
              <button
                onClick={() => handleNav('profile')}
                className="btn btn-secondary nav-account-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.85rem',
                  minHeight: '44px',
                }}
                title="Your Profile"
              >
                <User size={16} color="var(--color-primary)" />
                <span className="desktop-only" style={{ maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {customerUser?.name?.split(' ')[0] || 'Account'}
                </span>
                {customerMilestone && customerMilestone.completed_orders > 0 && (
                  <span
                    style={{
                      background: 'var(--color-accent)',
                      color: '#FFFFFF',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: '10px',
                    }}
                  >
                    {customerMilestone.completed_orders}
                  </span>
                )}
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                className="btn btn-secondary nav-account-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  minHeight: '44px',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                <User size={16} />
                <span className="desktop-only">Log In</span>
              </button>
            )}

            {/* Cart Trigger */}
            <button
              onClick={openCart}
              className="btn btn-primary"
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                fontSize: '0.85rem',
                minHeight: '44px',
                minWidth: '44px',
                borderRadius: 'var(--radius-full)',
              }}
              title="View Cart"
            >
              <ShoppingBag size={17} />
              <span className="desktop-only">Cart</span>
              {itemCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    background: 'var(--color-primary)',
                    color: '#FFFFFF',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #FFFFFF',
                  }}
                >
                  {itemCount}
                </span>
              )}
            </button>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="mobile-hamburger-btn"
              style={{
                background: 'none',
                border: 'none',
                padding: '10px',
                cursor: 'pointer',
                color: 'var(--color-primary)',
                display: 'none',
                minWidth: '44px',
                minHeight: '44px',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Toggle Navigation Menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div
          className="mobile-menu-drawer"
          style={{
            position: 'fixed',
            inset: 'var(--nav-height, 68px) 0 0 0',
            background: 'var(--color-bg)',
            zIndex: 99,
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            overflowY: 'auto',
          }}
        >
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => handleNav(link.id)}
              style={{
                background: 'none',
                border: 'none',
                fontFamily: 'var(--font-serif)',
                fontSize: '1.4rem',
                textAlign: 'left',
                color: activePage === link.id ? 'var(--color-primary)' : 'var(--color-text-main)',
                padding: '12px 0',
                borderBottom: '1px solid var(--color-border)',
                cursor: 'pointer',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {link.label}
            </button>
          ))}

          <div style={{ marginTop: 'auto', paddingTop: '24px' }}>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenAdmin();
              }}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '0.88rem',
                color: 'var(--color-text-light)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                padding: '10px 0',
                minHeight: '44px',
              }}
            >
              <Shield size={16} />
              <span>Owner Portal</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
