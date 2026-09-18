import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { api } from '../api/api';
import ProductCard from '../components/ProductCard';
import ProductModal from '../components/ProductModal';

export default function MenuPage() {
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(() => {
    if (typeof window === 'undefined') return 'all';
    const params = new URLSearchParams(window.location.search);
    return params.get('category') || 'all';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load 4 Canonical Categories on mount
  useEffect(() => {
    api.getCategories()
      .then((res) => {
        const raw = res.categories && res.categories.length > 0 ? res.categories : [
          { id: 1, name: 'Baked Cheesecakes', slug: 'baked-cheesecakes' },
          { id: 2, name: 'Brownies', slug: 'brownies' },
          { id: 3, name: 'Cookies', slug: 'cookies' },
          { id: 4, name: 'Desserts', slug: 'desserts' },
          { id: 5, name: 'Gifting', slug: 'gifting' },
          { id: 6, name: 'Healthy Bakes', slug: 'healthy-bakes' },
          { id: 7, name: 'Teacakes', slug: 'teacakes' },
          { id: 8, name: 'Dessert Tubs', slug: 'dessert-tubs' },
          { id: 9, name: 'Cookie Tin', slug: 'cookie-tin' },
        ];
        const unique = [];
        const seen = new Set();
        for (const c of raw) {
          if (!seen.has(c.slug)) {
            seen.add(c.slug);
            unique.push(c);
          }
        }
        setCategories(unique);
      })
      .catch((err) => {
        console.error('Failed to load categories:', err);
        setCategories([
          { id: 1, name: 'Baked Cheesecakes', slug: 'baked-cheesecakes' },
          { id: 2, name: 'Brownies', slug: 'brownies' },
          { id: 3, name: 'Cookies', slug: 'cookies' },
          { id: 4, name: 'Desserts', slug: 'desserts' },
          { id: 5, name: 'Gifting', slug: 'gifting' },
          { id: 6, name: 'Healthy Bakes', slug: 'healthy-bakes' },
          { id: 7, name: 'Teacakes', slug: 'teacakes' },
          { id: 8, name: 'Dessert Tubs', slug: 'dessert-tubs' },
          { id: 9, name: 'Cookie Tin', slug: 'cookie-tin' },
        ]);
      });
  }, []);

  // Sync activeCategory with URL query params without creating extra history entries
  const handleCategoryChange = (slug) => {
    setActiveCategory(slug);
    try {
      const url = new URL(window.location.href);
      if (slug === 'all') {
        url.searchParams.delete('category');
      } else {
        url.searchParams.set('category', slug);
      }
      window.history.replaceState({ ...window.history.state, category: slug }, '', url.pathname + url.search);
    } catch (err) {}
  };

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setActiveCategory(params.get('category') || 'all');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Fetch products whenever category or search changes
  useEffect(() => {
    setLoading(true);
    api.getProducts({ category: activeCategory, search: searchQuery })
      .then((res) => {
        setProducts(res.products || []);
      })
      .catch((err) => console.error('Failed to load products:', err))
      .finally(() => setLoading(false));
  }, [activeCategory, searchQuery]);

  return (
    <div className="section-spacing" style={{ paddingTop: 'clamp(24px, 5vw, 40px)', width: '100%', boxSizing: 'border-box' }}>
      <div className="container" style={{ padding: '0 16px', boxSizing: 'border-box' }}>
        {/* Page Header */}
        <div className="section-header" style={{ marginBottom: '28px' }}>
          <span className="section-eyebrow">Our Menu</span>
          <h1 className="section-title">Fresh Cakes & Desserts</h1>
          <p className="section-subtitle">
            Order your favorite baked cheesecakes, brownies, cookies, teacakes, and desserts online.
          </p>
        </div>

        {/* Filter and Search Bar */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            marginBottom: '32px',
            width: '100%',
          }}
        >
          {/* Search Input */}
          <div style={{ maxWidth: '480px', margin: '0 auto', width: '100%', position: 'relative' }}>
            <input
              type="text"
              placeholder="Search baked cheesecakes, brownies, cookies, desserts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{
                width: '100%',
                paddingLeft: '40px',
                paddingRight: '16px',
                borderRadius: 'var(--radius-full)',
                boxShadow: 'var(--shadow-sm)',
                minHeight: '44px',
                fontSize: '16px', // Prevents iOS auto-zoom
                boxSizing: 'border-box',
              }}
            />
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '13px', color: 'var(--color-text-light)' }} />
          </div>

          {/* Horizontally Scrollable Category Pills (No wrapping) */}
          <div className="category-scroll-container">
            <div className="category-tabs-scroll">
              <button
                onClick={() => handleCategoryChange('all')}
                className={`category-pill ${activeCategory === 'all' ? 'active' : ''}`}
              >
                All
              </button>

              {categories.map((cat) => {
                const isActive = activeCategory === cat.slug;
                return (
                  <button
                    key={cat.id || cat.slug}
                    onClick={() => handleCategoryChange(cat.slug)}
                    className={`category-pill ${isActive ? 'active' : ''}`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-muted)' }}>
            <div className="spinner" style={{ margin: '0 auto 12px auto' }} />
            <p>Loading fresh treats...</p>
          </div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-muted)' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>No desserts found</h3>
            <p style={{ fontSize: '0.92rem' }}>Try choosing another category or clearing your search.</p>
            <button
              onClick={() => { handleCategoryChange('all'); setSearchQuery(''); }}
              className="btn btn-secondary"
              style={{ marginTop: '16px', minHeight: '40px' }}
            >
              Show All Desserts
            </button>
          </div>
        ) : (
          <div className="product-grid">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onSelectProduct={(prod) => setSelectedProduct(prod)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Product Details Modal */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
