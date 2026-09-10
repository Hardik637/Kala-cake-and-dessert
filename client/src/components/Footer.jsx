import React from 'react';
import { BRAND_CONFIG } from '../config/brand';
import { Mail, Phone, MapPin, Clock, Shield } from 'lucide-react';
import { useStoreSettings } from '../context/StoreSettingsContext';

export default function Footer({ setActivePage, onOpenAdmin }) {
  const { settings } = useStoreSettings();

  const brandName = settings?.brand_name || BRAND_CONFIG.name || 'Kala';
  const tagline = settings?.brand_tagline || BRAND_CONFIG.tagline || 'Cakes and Desserts';
  const address = settings?.boutique_address || BRAND_CONFIG.boutiqueAddress || '';
  const hours = settings?.business_hours || BRAND_CONFIG.hours || '';
  const phone = settings?.contact_phone || BRAND_CONFIG.phone || '';
  const email = settings?.contact_email || BRAND_CONFIG.email || '';
  const instagram = settings?.instagram_handle || BRAND_CONFIG.instagram || '';

  return (
    <footer
      style={{
        background: '#1F1713',
        color: '#E5DCD3',
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
            <span
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.8rem',
                color: '#FFFFFF',
                display: 'block',
                marginBottom: '6px',
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}
            >
              {brandName.toUpperCase()}
            </span>
            <span
              style={{
                fontSize: '0.78rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--color-accent)',
                display: 'block',
                marginBottom: '14px',
                fontWeight: 600,
              }}
            >
              {tagline}
            </span>
            <p style={{ color: '#A89C91', fontSize: '0.9rem', marginBottom: '18px', lineHeight: 1.6 }}>
              Fresh cakes and desserts made for every occasion. Handcrafted fresh with simple ingredients and great taste.
            </p>

            {instagram && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <a
                  href={`https://instagram.com/${instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: 'var(--color-gold)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.85rem',
                    textDecoration: 'none',
                    padding: '6px 0',
                    minHeight: '44px',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                  </svg>
                  <span>{instagram}</span>
                </a>
              </div>
            )}
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
                  style={{ background: 'none', border: 'none', color: '#BDB3A7', cursor: 'pointer', fontSize: '0.9rem', textAlign: 'left', padding: '6px 0', minHeight: '36px' }}
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  onClick={() => { setActivePage('menu'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  style={{ background: 'none', border: 'none', color: '#BDB3A7', cursor: 'pointer', fontSize: '0.9rem', textAlign: 'left', padding: '6px 0', minHeight: '36px' }}
                >
                  Our Menu
                </button>
              </li>
              <li>
                <button
                  onClick={() => { setActivePage('custom'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  style={{ background: 'none', border: 'none', color: '#BDB3A7', cursor: 'pointer', fontSize: '0.9rem', textAlign: 'left', padding: '6px 0', minHeight: '36px' }}
                >
                  Custom Cakes
                </button>
              </li>
              <li>
                <button
                  onClick={() => { setActivePage('rewards'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  style={{ background: 'none', border: 'none', color: '#BDB3A7', cursor: 'pointer', fontSize: '0.9rem', textAlign: 'left', padding: '6px 0', minHeight: '36px' }}
                >
                  Kala Rewards
                </button>
              </li>
              <li>
                <button
                  onClick={() => { setActivePage('about'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  style={{ background: 'none', border: 'none', color: '#BDB3A7', cursor: 'pointer', fontSize: '0.9rem', textAlign: 'left', padding: '6px 0', minHeight: '36px' }}
                >
                  Our Story
                </button>
              </li>
            </ul>
          </div>

          {/* Contact Details (Only render when configured) */}
          <div>
            <h4 style={{ color: '#FFFFFF', fontSize: '1.05rem', marginBottom: '16px', fontFamily: 'var(--font-serif)' }}>
              Contact
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem', color: '#BDB3A7', padding: 0 }}>
              {address && (
                <li style={{ display: 'flex', gap: '10px' }}>
                  <MapPin size={18} color="var(--color-accent)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{address}</span>
                </li>
              )}
              {hours && (
                <li style={{ display: 'flex', gap: '10px' }}>
                  <Clock size={18} color="var(--color-gold)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{hours}</span>
                </li>
              )}
              {phone && (
                <li style={{ display: 'flex', gap: '10px' }}>
                  <Phone size={18} color="var(--color-accent)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{phone}</span>
                </li>
              )}
              {email && (
                <li style={{ display: 'flex', gap: '10px' }}>
                  <Mail size={18} color="var(--color-accent)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{email}</span>
                </li>
              )}
              {!address && !phone && !email && (
                <li style={{ color: '#8A7D71' }}>
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
            color: '#8A7D71',
          }}
        >
          <div>
            © {new Date().getFullYear()} {brandName}. All rights reserved.
          </div>

          <div>
            <button
              onClick={() => onOpenAdmin && onOpenAdmin()}
              style={{
                background: 'none',
                border: 'none',
                color: '#6E6258',
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
