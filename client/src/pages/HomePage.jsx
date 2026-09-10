import React, { useEffect, useState } from 'react';
import { ArrowRight, Sparkles, Award, Heart, Cake, Gift, Clock, ShieldCheck } from 'lucide-react';
import { BRAND_CONFIG } from '../config/brand';
import ProductCard from '../components/ProductCard';
import ProductModal from '../components/ProductModal';
import MilestoneTracker from '../components/MilestoneTracker';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import customCakeImg from '../assets/custom_cake.jpg';

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

  const brandName = settings?.brand_name || BRAND_CONFIG.name || 'Kalã';
  const brandTagline = settings?.brand_tagline || BRAND_CONFIG.tagline || 'Cakes and Desserts';

  const heroSubtitle = settings?.hero_subtitle || 'Order your favorite cakes, dessert tubs, brownies, and cookies online, or talk to us for custom celebration cakes.';
  const heroImage = settings?.hero_image_url || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80';

  // Dynamic Scroll Reveal on Homepage
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
    );

    const elements = document.querySelectorAll('.reveal-on-scroll');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [featuredProducts]);

  return (
    <div style={{ width: '100%', overflowX: 'hidden' }}>
      {/* 1. HERO SECTION */}
      <section
        className="hero-section"
        style={{
          position: 'relative',
          backgroundColor: 'var(--color-bg)',
          
          
          padding: 'clamp(44px, 8vw, 84px) 0',
          width: '100%',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        {/* Dynamic Glow Orbs */}
        
        

        <div className="container" style={{ padding: '0 16px', boxSizing: 'border-box', position: 'relative', zIndex: 1 }}>
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
                  padding: '7px 16px',
                  background: 'var(--color-pink-subtle)',
                  borderRadius: 'var(--radius-full)',
                  marginBottom: '18px',
                  border: '1px solid var(--color-pink-border)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <Sparkles size={14} color="var(--color-primary)" />
                <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700, color: 'var(--color-primary)' }}>
                  {brandName} • <span className="font-script" style={{ textTransform: 'none', fontSize: '1.25em', letterSpacing: 0, color: 'var(--color-primary)' }}>Made with love</span>
                </span>
              </div>

              {/* Editorial Main Heading */}
              <h1
                style={{
                  marginBottom: '18px',
                  lineHeight: 1.15,
                  fontSize: 'clamp(2.3rem, 6.2vw, 3.8rem)',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                }}
              >
                Life is <span className="script-accent" style={{ fontSize: '1.28em', padding: '0 4px' }}>better</span> with cake.
              </h1>

              <p
                style={{
                  fontSize: 'clamp(1rem, 2.5vw, 1.15rem)',
                  color: 'var(--color-text-muted)',
                  marginBottom: '32px',
                  lineHeight: 1.65,
                  maxWidth: '520px',
                }}
              >
                {heroSubtitle}
              </p>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => { setActivePage('menu'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="btn btn-primary btn-lg"
                  style={{ minHeight: '48px', minWidth: '150px', justifyContent: 'center', gap: '8px' }}
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
                className="interactive-card"
                style={{
                  borderRadius: 'var(--radius-lg, 18px)',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-lg)',
                  aspectRatio: '4/3',
                  maxHeight: '460px',
                  width: '100%',
                }}
              >
                <img
                  src={heroImage}
                  alt="Fresh artisan chocolate cake"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. POPULAR DESSERTS SECTION */}
      <section className="section-spacing" style={{ width: '100%', boxSizing: 'border-box' }}>
        <div className="container" style={{ padding: '0 16px', boxSizing: 'border-box' }}>
          <div className="section-header">
            <span className="section-eyebrow">Our Favorites</span>
            <h2 className="section-title">
              Popular <span className="script-accent">Desserts</span>
            </h2>
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
              <p>No featured products available at the moment.</p>
            </div>
          ) : (
            <div className="product-grid">
              {featuredProducts.map((p) => (
                <div key={p.id} className="interactive-card" style={{ display: 'flex' }}>
                  <ProductCard
                    product={p}
                    onSelectProduct={(prod) => setSelectedProduct(prod)}
                  />
                </div>
              ))}
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: '36px' }}>
            <button
              onClick={() => { setActivePage('menu'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="btn btn-secondary btn-lg"
              style={{ minHeight: '46px', gap: '8px' }}
            >
              <span>Explore All Desserts</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>
{/* 4. CUSTOM CAKES HIGHLIGHT */}
      <section className="section-spacing" style={{ width: '100%', boxSizing: 'border-box', position: 'relative' }}>
        <div className="container" style={{ padding: '0 16px', boxSizing: 'border-box' }}>
          <div
            className="interactive-card"
            style={{
              background: '#FFFFFF',
              border: '1px solid var(--color-border)',
              borderRadius: '24px',
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
                Bespoke Celebrations
              </span>
              <h2 style={{ fontSize: 'clamp(1.9rem, 5vw, 2.7rem)', marginBottom: '14px', lineHeight: 1.2, fontWeight: 600 }}>
                More Than Cake, It's <span className="script-accent">Connection</span>.
              </h2>
              <p style={{ fontSize: '1.05rem', color: 'var(--color-text-muted)', lineHeight: 1.65, marginBottom: '28px' }}>
                Have a cake idea in mind? Tell us what you need and we'll get back to you with the details. From milestone celebrations to intimate gatherings, every custom cake is handcrafted fresh for your special moments.
              </p>
              <button
                onClick={() => { setActivePage('custom'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="btn btn-primary btn-lg"
                style={{ minHeight: '48px', gap: '10px' }}
              >
                <span>Order a Custom Cake</span>
                <ArrowRight size={18} />
              </button>
            </div>

            <div
              style={{
                position: 'relative',
                borderRadius: '20px',
                overflow: 'hidden',
                aspectRatio: '4/3',
                maxHeight: '380px',
                width: '100%',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <img
                src={customCakeImg}
                alt="Custom celebration cake"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.5s ease' }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '16px',
                  left: '16px',
                  background: 'rgba(255, 255, 255, 0.94)',
                  backdropFilter: 'blur(8px)',
                  padding: '7px 16px',
                  borderRadius: '999px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <Sparkles size={14} color="var(--color-accent)" />
                <span>Handcrafted with <span className="font-script" style={{ fontSize: '1.25em', color: 'var(--color-primary)' }}>Love</span></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. KALA REWARDS */}
      <section
        style={{
          background: 'var(--color-surface-warm)',
          padding: 'clamp(44px, 7vw, 76px) 0',
          borderTop: '1px solid var(--color-border)',
          borderBottom: '1px solid var(--color-border)',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div className="container" style={{ maxWidth: '860px', padding: '0 16px', boxSizing: 'border-box' }}>
          <div className="section-header" style={{ marginBottom: '32px' }}>
            <span className="section-eyebrow">Customer Loyalty</span>
            <h2 className="section-title">
              Kalã <span className="script-accent">Rewards</span>
            </h2>
            <p className="section-subtitle">
              Every delivered order counts toward complimentary treats.
            </p>
          </div>

          {isCustomerAuthenticated ? (
            <MilestoneTracker milestone={customerMilestone} />
          ) : (
            <div
              className="interactive-card"
              style={{
                background: '#FFFFFF',
                borderRadius: '20px',
                padding: '38px 26px',
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
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                }}
              >
                <Gift size={28} />
              </div>
              <h3 style={{ fontSize: '1.45rem', marginBottom: '8px', fontWeight: 600 }}>Join Kalã Rewards</h3>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px', maxWidth: '480px', margin: '0 auto 24px auto', fontSize: '0.95rem', lineHeight: 1.6 }}>
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
            About <span className="script-accent">Kalã</span>
          </h2>
          <p
            style={{
              fontSize: '1.08rem',
              lineHeight: 1.8,
              color: 'var(--color-text-muted)',
              marginBottom: '28px',
            }}
          >
            {settings?.about_story || 'Kalã is a cake and dessert brand focused on making fresh, delicious desserts for everyday celebrations and special occasions. We believe in simple, wholesome ingredients, warm hospitality, and desserts that bring people together.'}
          </p>
          <button
            onClick={() => { setActivePage('about'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="btn btn-secondary"
            style={{ minHeight: '44px', padding: '10px 24px', gap: '8px' }}
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
