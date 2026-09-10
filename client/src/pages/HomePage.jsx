import React, { useEffect, useState } from 'react';
import { ArrowRight, Sparkles, Award, Heart, Cake, Gift, Clock, ShieldCheck } from 'lucide-react';
import { BRAND_CONFIG } from '../config/brand';
import ProductCard from '../components/ProductCard';
import ProductModal from '../components/ProductModal';
import MilestoneTracker from '../components/MilestoneTracker';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useStoreSettings } from '../context/StoreSettingsContext';

export default function HomePage({ setActivePage, onOpenAuth }) {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isCustomerAuthenticated, customerMilestone } = useAuth();
  const { settings } = useStoreSettings();

  useEffect(() => {
    api.getProducts({ featuredOnly: true })
      .then((res) => {
        setFeaturedProducts(res.products.slice(0, 4));
      })
      .catch((err) => console.error('Failed to load featured products:', err))
      .finally(() => setLoading(false));
  }, []);

  const brandName = settings?.brand_name || BRAND_CONFIG.name || 'Kala';
  const brandTagline = settings?.brand_tagline || BRAND_CONFIG.tagline || 'Cakes and Desserts';

  const heroHeading = settings?.hero_heading || 'Fresh cakes and desserts made for every occasion.';
  const heroSubtitle = settings?.hero_subtitle || 'Order your favorite cakes, dessert tubs, brownies, and cookies online, or talk to us for custom celebration cakes.';
  const heroImage = settings?.hero_image_url || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80';

  const categories = [
    {
      id: 'cakes',
      title: 'Cakes',
      desc: 'Layered cakes for birthdays & celebrations',
      image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=500&q=80',
    },
    {
      id: 'dessert-tub',
      title: 'Dessert Tub',
      desc: 'Delicious layered tubs ready to spoon',
      image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=500&q=80',
    },
    {
      id: 'brownies',
      title: 'Brownies',
      desc: 'Fudgy, rich chocolate brownies',
      image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=500&q=80',
    },
    {
      id: 'cookies',
      title: 'Cookies',
      desc: 'Freshly baked chocolate chip & butter cookies',
      image: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=500&q=80',
    },
  ];

  return (
    <div style={{ width: '100%', overflowX: 'hidden' }}>
      {/* 1. HERO SECTION */}
      <section
        className="hero-section"
        style={{
          position: 'relative',
          backgroundColor: '#FAF7F2',
          backgroundImage: `radial-gradient(#E8DFD3 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
          padding: 'clamp(40px, 8vw, 80px) 0',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div className="container" style={{ padding: '0 16px', boxSizing: 'border-box' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
              gap: 'clamp(28px, 5vw, 50px)',
              alignItems: 'center',
            }}
          >
            {/* Copy Column */}
            <div style={{ maxWidth: '580px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 14px',
                  background: 'var(--color-surface-warm)',
                  borderRadius: 'var(--radius-full)',
                  marginBottom: '16px',
                  border: '1px solid var(--color-border)',
                }}
              >
                <Sparkles size={14} color="var(--color-accent)" />
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, color: 'var(--color-accent)' }}>
                  {brandName} • {brandTagline}
                </span>
              </div>

              <h1
                style={{
                  marginBottom: '16px',
                  lineHeight: 1.15,
                  fontSize: 'clamp(2rem, 6vw, 3.4rem)',
                  fontWeight: 700,
                }}
              >
                {heroHeading}
              </h1>

              <p
                style={{
                  fontSize: 'clamp(1rem, 2.5vw, 1.15rem)',
                  color: 'var(--color-text-muted)',
                  marginBottom: '28px',
                  lineHeight: 1.6,
                }}
              >
                {heroSubtitle}
              </p>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => { setActivePage('menu'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="btn btn-primary btn-lg"
                  style={{ minHeight: '48px', minWidth: '150px', justifyContent: 'center' }}
                >
                  <span>View Menu</span>
                  <ArrowRight size={18} />
                </button>

                <button
                  onClick={() => { setActivePage('custom'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="btn btn-secondary btn-lg"
                  style={{ minHeight: '48px', minWidth: '150px', justifyContent: 'center' }}
                >
                  <span>Custom Cakes</span>
                </button>
              </div>
            </div>

            {/* Hero Image Column */}
            <div style={{ position: 'relative', width: '100%' }}>
              <div
                style={{
                  borderRadius: 'var(--radius-lg, 16px)',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-lg)',
                  aspectRatio: '4/3',
                  maxHeight: '460px',
                  width: '100%',
                }}
              >
                <img
                  src={heroImage}
                  alt={`${brandName} Fresh Cakes and Desserts`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. POPULAR / FEATURED DESSERTS */}
      <section className="section-spacing" style={{ width: '100%', boxSizing: 'border-box' }}>
        <div className="container" style={{ padding: '0 16px', boxSizing: 'border-box' }}>
          <div className="section-header" style={{ marginBottom: '36px' }}>
            <span className="section-eyebrow">Our Favorites</span>
            <h2 className="section-title">Popular Desserts</h2>
            <p className="section-subtitle">
              Customer favorites baked fresh and ready to order.
            </p>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
              <div className="spinner" style={{ margin: '0 auto 12px auto' }} />
              <p>Loading favorites...</p>
            </div>
          ) : featuredProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
              <p>Check out our menu for fresh treats today.</p>
              <button
                onClick={() => { setActivePage('menu'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="btn btn-primary"
                style={{ marginTop: '16px' }}
              >
                View Menu
              </button>
            </div>
          ) : (
            <div className="product-grid">
              {featuredProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onSelectProduct={(prod) => setSelectedProduct(prod)}
                />
              ))}
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: '36px' }}>
            <button
              onClick={() => { setActivePage('menu'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="btn btn-secondary btn-lg"
              style={{ minHeight: '46px' }}
            >
              <span>Explore All Desserts</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* 3. SHOP BY CATEGORY (Exactly 4 Categories) */}
      <section
        style={{
          background: 'var(--color-surface-warm)',
          padding: 'clamp(40px, 7vw, 70px) 0',
          borderTop: '1px solid var(--color-border)',
          borderBottom: '1px solid var(--color-border)',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div className="container" style={{ padding: '0 16px', boxSizing: 'border-box' }}>
          <div className="section-header" style={{ marginBottom: '36px' }}>
            <span className="section-eyebrow">Browse Our Menu</span>
            <h2 className="section-title">Shop by Category</h2>
            <p className="section-subtitle">
              Choose your favorite fresh bake from our four simple categories.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
              gap: '20px',
            }}
          >
            {categories.map((cat) => (
              <div
                key={cat.id}
                onClick={() => {
                  setActivePage('menu');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  border: '1px solid var(--color-border)',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ height: '170px', width: '100%', overflow: 'hidden' }}>
                  <img
                    src={cat.image}
                    alt={cat.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div style={{ padding: '18px 16px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '6px' }}>{cat.title}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '14px', lineHeight: 1.4, flexGrow: 1 }}>
                    {cat.desc}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-accent)', fontSize: '0.88rem', fontWeight: 600 }}>
                    <span>Browse {cat.title}</span>
                    <ArrowRight size={15} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. CUSTOM CAKES HIGHLIGHT */}
      <section className="section-spacing" style={{ width: '100%', boxSizing: 'border-box' }}>
        <div className="container" style={{ padding: '0 16px', boxSizing: 'border-box' }}>
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid var(--color-border)',
              borderRadius: '20px',
              padding: 'clamp(28px, 6vw, 56px)',
              boxShadow: 'var(--shadow-md)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
              gap: '36px',
              alignItems: 'center',
            }}
          >
            <div>
              <span className="section-eyebrow" style={{ marginBottom: '8px' }}>
                Special Occasions
              </span>
              <h2 style={{ fontSize: 'clamp(1.75rem, 5vw, 2.4rem)', marginBottom: '14px', lineHeight: 1.2 }}>
                Custom Cakes
              </h2>
              <p style={{ fontSize: '1.05rem', color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: '24px' }}>
                Have a cake idea in mind? Tell us what you need and we'll get back to you with the details. We create custom cakes for birthdays, anniversaries, and all your celebrations.
              </p>
              <button
                onClick={() => { setActivePage('custom'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="btn btn-primary btn-lg"
                style={{ minHeight: '46px' }}
              >
                <span>Order a Custom Cake</span>
                <ArrowRight size={18} />
              </button>
            </div>

            <div
              style={{
                borderRadius: '16px',
                overflow: 'hidden',
                aspectRatio: '4/3',
                maxHeight: '360px',
                width: '100%',
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=700&q=80"
                alt="Custom celebration cake"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 5. KALA REWARDS */}
      <section
        style={{
          background: 'var(--color-surface-warm)',
          padding: 'clamp(40px, 7vw, 70px) 0',
          borderTop: '1px solid var(--color-border)',
          borderBottom: '1px solid var(--color-border)',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div className="container" style={{ maxWidth: '860px', padding: '0 16px', boxSizing: 'border-box' }}>
          <div className="section-header" style={{ marginBottom: '32px' }}>
            <span className="section-eyebrow">Kala Rewards</span>
            <h2 className="section-title">Complete Orders and Unlock Rewards</h2>
            <p className="section-subtitle">
              Every delivered order counts toward complimentary treats.
            </p>
          </div>

          {isCustomerAuthenticated ? (
            <MilestoneTracker milestone={customerMilestone} />
          ) : (
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                padding: '36px 24px',
                textAlign: 'center',
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-sm)',
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
                  margin: '0 auto 16px auto',
                }}
              >
                <Gift size={28} />
              </div>
              <h3 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Join Kala Rewards</h3>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px', maxWidth: '480px', margin: '0 auto 24px auto', fontSize: '0.95rem' }}>
                Sign in with your Google account to start earning rewards with every delivered order.
              </p>
              <button
                onClick={onOpenAuth}
                className="btn btn-primary"
                style={{ minHeight: '44px', padding: '10px 24px' }}
              >
                Sign In with Google to Start
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 6. ABOUT KALA */}
      <section className="section-spacing" style={{ width: '100%', boxSizing: 'border-box' }}>
        <div className="container" style={{ maxWidth: '820px', padding: '0 16px', boxSizing: 'border-box', textAlign: 'center' }}>
          <span className="section-eyebrow" style={{ marginBottom: '8px' }}>
            Our Story
          </span>
          <h2 className="section-title" style={{ marginBottom: '16px' }}>
            About Kala
          </h2>
          <p
            style={{
              fontSize: '1.08rem',
              lineHeight: 1.8,
              color: 'var(--color-text-muted)',
              marginBottom: '28px',
            }}
          >
            {settings?.about_story || 'Kala is a cake and dessert brand focused on making fresh, delicious desserts for everyday celebrations and special occasions. We believe in simple, wholesome ingredients, warm hospitality, and desserts that bring people together.'}
          </p>
          <button
            onClick={() => { setActivePage('about'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="btn btn-secondary"
            style={{ minHeight: '44px', padding: '10px 24px' }}
          >
            <span>Read Our Full Story</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* Product Quick-View Modal */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
