import React from 'react';
import { BRAND_CONFIG } from '../config/brand';
import { Cake, Heart, Sparkles, MapPin, Clock, Phone, Mail, ArrowRight } from 'lucide-react';
import { useStoreSettings } from '../context/StoreSettingsContext';

export default function AboutPage({ setActivePage }) {
  const { settings } = useStoreSettings();

  const brandName = settings?.brand_name || BRAND_CONFIG.name || 'Kalã';
  const brandTagline = settings?.brand_tagline || BRAND_CONFIG.tagline || 'Cakes and Desserts';
  const address = settings?.boutique_address || BRAND_CONFIG.boutiqueAddress || '';
  const hours = settings?.business_hours || BRAND_CONFIG.hours || '';
  const phone = settings?.contact_phone || BRAND_CONFIG.phone || '';
  const email = settings?.contact_email || BRAND_CONFIG.email || '';

  return (
    <div className="section-spacing" style={{ paddingTop: 'clamp(24px, 5vw, 40px)', width: '100%', boxSizing: 'border-box' }}>
      <div className="container" style={{ maxWidth: '820px', padding: '0 16px', boxSizing: 'border-box' }}>
        {/* Header */}
        <div className="section-header" style={{ marginBottom: '36px' }}>
          <span className="section-eyebrow">Our Story</span>
          <h1 className="section-title">About {brandName}</h1>
          <p className="section-subtitle">
            {brandTagline}
          </p>
        </div>

        {/* Featured Story Vignette */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid var(--color-border)',
            borderRadius: '20px',
            padding: 'clamp(28px, 6vw, 48px)',
            boxShadow: 'var(--shadow-sm)',
            marginBottom: '40px',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'var(--color-surface-warm)',
              color: 'var(--color-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
            }}
          >
            <Heart size={26} />
          </div>

          <h2 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 700, marginBottom: '16px', lineHeight: 1.3 }}>
            Fresh cakes and desserts made for every occasion.
          </h2>

          <div style={{ fontSize: '1.05rem', lineHeight: 1.8, color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p>
              {settings?.about_story || 'Kalã is a cake and dessert brand focused on making fresh, delicious desserts for everyday celebrations and special occasions.'}
            </p>
            <p>
              We believe great desserts come from simple, wholesome ingredients and thoughtful preparation. Whether it’s a birthday cake, a decadent brownie box, freshly baked cookies, or an indulgent dessert tub, our goal is to bring joy to your sweet moments.
            </p>
          </div>

          {/* Core Values */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
              gap: '20px',
              paddingTop: '28px',
              marginTop: '28px',
              borderTop: '1px solid var(--color-border)',
            }}
          >
            <div>
              <strong style={{ display: 'block', fontSize: '1.05rem', color: 'var(--color-text-main)', marginBottom: '4px' }}>
                Baked Fresh
              </strong>
              <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                Small batches made to order so every bite tastes as fresh as possible.
              </p>
            </div>

            <div>
              <strong style={{ display: 'block', fontSize: '1.05rem', color: 'var(--color-text-main)', marginBottom: '4px' }}>
                Simple Ingredients
              </strong>
              <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                Wholesome ingredients with balanced sweetness and natural flavors.
              </p>
            </div>

            <div>
              <strong style={{ display: 'block', fontSize: '1.05rem', color: 'var(--color-text-main)', marginBottom: '4px' }}>
                Custom Creations
              </strong>
              <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                Tailored cakes customized to your celebration themes and preferred flavours.
              </p>
            </div>
          </div>
        </div>

        {/* Contact & Hours Info (Only render if present) */}
        {(address || hours || phone || email) && (
          <div
            style={{
              background: 'var(--color-surface-warm)',
              border: '1px solid var(--color-border)',
              borderRadius: '16px',
              padding: 'clamp(20px, 5vw, 32px)',
              boxSizing: 'border-box',
            }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px' }}>Visit & Contact</h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
                gap: '16px',
                fontSize: '0.9rem',
                color: 'var(--color-text-muted)',
              }}
            >
              {address && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <MapPin size={18} color="var(--color-accent)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{address}</span>
                </div>
              )}
              {hours && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Clock size={18} color="var(--color-gold)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{hours}</span>
                </div>
              )}
              {phone && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Phone size={18} color="var(--color-accent)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{phone}</span>
                </div>
              )}
              {email && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Mail size={18} color="var(--color-accent)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{email}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div style={{ textAlign: 'center', marginTop: '36px' }}>
          <button
            onClick={() => { setActivePage('menu'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="btn btn-primary btn-lg"
            style={{ minHeight: '46px', padding: '12px 28px', borderRadius: 'var(--radius-full)' }}
          >
            <span>Explore Our Menu</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
