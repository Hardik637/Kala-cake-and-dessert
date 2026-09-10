import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { api } from '../api/api';
import ProductCard from '../components/ProductCard';
import ProductModal from '../components/ProductModal';

export default function MenuPage() {
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load 4 Canonical Categories on mount
  useEffect(() => {
    api.getCategories()
      .then((res) => {
        const raw = res.categories && res.categories.length > 0 ? res.categories : [
          { id: 1, name: 'Cakes', slug: 'cakes' },
          { id: 2, name: 'Dessert Tub', slug: 'dessert-tub' },
          { id: 3, name: 'Brownies', slug: 'brownies' },
          { id: 4, name: 'Cookies', slug: 'cookies' },
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
          { id: 1, name: 'Cakes', slug: 'cakes' },
          { id: 2, name: 'Dessert Tub', slug: 'dessert-tub' },
          { id: 3, name: 'Brownies', slug: 'brownies' },
          { id: 4, name: 'Cookies', slug: 'cookies' },
        ]);
      });
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
            Order your favorite cakes, dessert tubs, brownies, and cookies online.
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
              placeholder="Search cakes, dessert tubs, brownies, cookies..."
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
                onClick={() => setActiveCategory('all')}
                className={`category-pill ${activeCategory === 'all' ? 'active' : ''}`}
              >
                All
              </button>

              {categories.map((cat) => {
                const isActive = activeCategory === cat.slug;
                return (
                  <button
                    key={cat.id || cat.slug}
                    onClick={() => setActiveCategory(cat.slug)}
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
              onClick={() => { setActiveCategory('all'); setSearchQuery(''); }}
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
