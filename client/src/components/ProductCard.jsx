import React from 'react';
import { Plus } from 'lucide-react';
import { BRAND_CONFIG } from '../config/brand';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';

export default function ProductCard({ product, onSelectProduct }) {
  const { addToCart } = useCart();
  const { addToast } = useToast();

  const handleQuickAdd = (e) => {
    e.stopPropagation();
    if (product.available === 0) return;
    addToCart(product, 1);
    addToast(`Added ${product.name} to your cart.`, 'success');
  };

  const isSoldOut = product.available === 0;

  return (
    <div
      className="product-card"
      onClick={() => onSelectProduct(product)}
      style={{ cursor: 'pointer', width: '100%', boxSizing: 'border-box' }}
    >
      <div className="product-image-wrap">
        <img
          src={product.image_url}
          alt={product.name}
          loading="lazy"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: isSoldOut ? 'grayscale(40%) opacity(0.85)' : 'none',
          }}
        />

        {/* Badges */}
        <div className="product-badge-stack">
          {isSoldOut ? (
            <span className="badge badge-soldout">Sold Out</span>
          ) : product.is_featured === 1 ? (
            <span className="badge badge-featured">Popular</span>
          ) : null}
        </div>
      </div>

      <div className="product-content">
        <span className="product-category-tag">
          {product.category_name || 'Dessert'}
        </span>

        <h3 className="product-title">{product.name}</h3>

        <p className="product-description">{product.description}</p>

        <div className="product-footer">
          <span className="product-price">
            {BRAND_CONFIG.currency}{Number(product.price).toFixed(0)}
          </span>

          <div style={{ display: 'flex', gap: '8px' }}>
            {isSoldOut ? (
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: 'var(--color-text-light)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  padding: '6px 0',
                }}
              >
                Sold Out
              </span>
            ) : (
              <button
                onClick={handleQuickAdd}
                className="btn btn-primary btn-sm"
                title="Add to Cart"
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-full)',
                  minHeight: '38px',
                  fontSize: '0.82rem',
                }}
              >
                <Plus size={15} />
                <span>Add</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
