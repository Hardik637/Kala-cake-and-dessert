import React from 'react';
import { BRAND_CONFIG } from '../config/brand';
import { Mail, Phone, MapPin, Clock, Shield } from 'lucide-react';
import { useStoreSettings } from '../context/StoreSettingsContext';

export default function Footer({ setActivePage, onOpenAdmin }) {
  const { settings } = useStoreSettings();

  const brandName = settings?.brand_name || BRAND_CONFIG.name || 'Kalã';
  const tagline = settings?.brand_tagline || BRAND_CONFIG.tagline || 'Cakes and Desserts';
  const address = settings?.boutique_address || BRAND_CONFIG.boutiqueAddress || '';
  const hours = settings?.business_hours || BRAND_CONFIG.hours || '';
  const phone = settings?.contact_phone || BRAND_CONFIG.phone || '';
  const email = settings?.contact_email || BRAND_CONFIG.email || '';
  const instagramUrl = BRAND_CONFIG.instagramUrl || 'https://www.instagram.com/kala_cakesanddesserts/';
  const instagramDisplay = '@kala_cakesanddesserts';

  return (
    <footer
      style={{
        background: '#18221A',
        color: '#E2E8E4',
        padding: '50px 0 28px 0',
        marginTop: 'auto',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div className="container" style={{ padding: '0 16px', boxSizing: 'border-box' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '32px',
            marginBottom: '40px',
          }}
        >
          {/* Brand Column */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <img
                src="/logo.png"
                alt="Kalã Logo"
                style={{
                  height: '32px',
                  width: 'auto',
                  objectFit: 'contain',
                  display: 'block',
                }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.65rem',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  display: 'block',
                }}
              >
                {brandName.toUpperCase()}
              </span>
            </div>

            <span
              style={{
                fontSize: '0.75rem',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--color-pink)',
                display: 'block',
                marginBottom: '14px',
                fontWeight: 600,
              }}
            >
              {tagline}
            </span>
            <p style={{ color: '#A0ACA3', fontSize: '0.9rem', marginBottom: '18px', lineHeight: 1.6 }}>
              Fresh baked cheesecakes, brownies, cookies, teacakes, and desserts handcrafted with love in Mumbai.
            </p>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'var(--color-pink)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.88rem',
                  textDecoration: 'none',
                  padding: '6px 0',
                  minHeight: '44px',
                  transition: 'opacity var(--transition-fast)',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                </svg>
                <span>{instagramDisplay}</span>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 style={{ color: '#FFFFFF', fontSize: '1.05rem', marginBottom: '16px', fontFamily: 'var(--font-serif)' }}>
              Navigation
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', padding: 0 }}>
              <li>
                <button
                  onClick={() => { setActivePage('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  style={{ background: 'none', border: 'none', color: '#B3C2B7', cursor: 'pointer', fontSize: '0.9rem', textAlign: 'left', padding: '6px 0', minHeight: '36px' }}
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  onClick={() => { setActivePage('menu'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  style={{ background: 'none', border: 'none', color: '#B3C2B7', cursor: 'pointer', fontSize: '0.9rem', textAlign: 'left', padding: '6px 0', minHeight: '36px' }}
                >
                  Our Menu
                </button>
              </li>
              <li>
                <button
                  onClick={() => { setActivePage('custom'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  style={{ background: 'none', border: 'none', color: '#B3C2B7', cursor: 'pointer', fontSize: '0.9rem', textAlign: 'left', padding: '6px 0', minHeight: '36px' }}
                >
                  Custom Cakes
                </button>
              </li>
              <li>
                <button
                  onClick={() => { setActivePage('rewards'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  style={{ background: 'none', border: 'none', color: '#B3C2B7', cursor: 'pointer', fontSize: '0.9rem', textAlign: 'left', padding: '6px 0', minHeight: '36px' }}
                >
                  Kalã Rewards
                </button>
              </li>
              <li>
                <button
                  onClick={() => { setActivePage('about'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  style={{ background: 'none', border: 'none', color: '#B3C2B7', cursor: 'pointer', fontSize: '0.9rem', textAlign: 'left', padding: '6px 0', minHeight: '36px' }}
                >
                  Our Story
                </button>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h4 style={{ color: '#FFFFFF', fontSize: '1.05rem', marginBottom: '16px', fontFamily: 'var(--font-serif)' }}>
              Contact
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem', color: '#B3C2B7', padding: 0 }}>
              {address && (
                <li style={{ display: 'flex', gap: '10px' }}>
                  <MapPin size={18} color="var(--color-pink)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{address}</span>
                </li>
              )}
              {hours && (
                <li style={{ display: 'flex', gap: '10px' }}>
                  <Clock size={18} color="var(--color-pink)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{hours}</span>
                </li>
              )}
              {phone && (
                <li style={{ display: 'flex', gap: '10px' }}>
                  <Phone size={18} color="var(--color-pink)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{phone}</span>
                </li>
              )}
              {email && (
                <li style={{ display: 'flex', gap: '10px' }}>
                  <Mail size={18} color="var(--color-pink)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{email}</span>
                </li>
              )}
              {!address && !phone && !email && (
                <li style={{ color: '#88988C' }}>
                  Order online for doorstep delivery or pickup.
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '0.8rem',
            color: '#88988C',
          }}
        >
          <div>
            © {new Date().getFullYear()} {brandName} — {tagline}. All rights reserved.
          </div>

          <div>
            <button
              onClick={() => onOpenAdmin && onOpenAdmin()}
              style={{
                background: 'none',
                border: 'none',
                color: '#6F7E73',
                cursor: 'pointer',
                fontSize: '0.78rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px',
                minHeight: '44px',
              }}
            >
              <Shield size={13} />
              <span>Owner Portal</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
