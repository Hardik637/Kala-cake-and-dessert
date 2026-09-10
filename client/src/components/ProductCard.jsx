import React from 'react';
import { Plus, SlidersHorizontal } from 'lucide-react';
import { BRAND_CONFIG } from '../config/brand';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';

export default function ProductCard({ product, onSelectProduct }) {
  const { addToCart } = useCart();
  const { addToast } = useToast();

  const isSoldOut = product.available === 0;
  const hasVariants = product.variants && Array.isArray(product.variants) && product.variants.length > 0;
  const hasToppings = product.toppings && Array.isArray(product.toppings) && product.toppings.length > 0;

  const minPrice = hasVariants 
    ? Math.min(...product.variants.map((v) => Number(v.price)))
    : Number(product.price);

  const handleAction = (e) => {
    e.stopPropagation();
    if (isSoldOut) return;

    if (hasVariants || hasToppings) {
      onSelectProduct(product);
    } else {
      addToCart(product, 1);
      addToast(`Added ${product.name} to your cart.`, 'success');
    }
  };

  return (
    <div
      className="product-card"
      onClick={() => onSelectProduct(product)}
      style={{ cursor: 'pointer', width: '100%', boxSizing: 'border-box' }}
    >
      <div className="product-image-wrap">
        <img
          src={product.image_url || '/placeholder.jpg'}
          onError={(e) => { e.currentTarget.src = '/placeholder.jpg'; }}
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
          ) : product.size ? (
            <span className="badge" style={{ background: '#FFFFFF', color: 'var(--color-text-main)', border: '1px solid var(--color-border)' }}>
              {product.size}
            </span>
          ) : product.is_featured === 1 ? (
            <span className="badge badge-featured">Popular</span>
          ) : null}

          {Boolean(product.is_eggless) && !isSoldOut && (
            <span className="badge" style={{ background: '#EAF3EC', color: '#2B5835', border: '1px solid #C8DEC9' }}>
              Eggless
            </span>
          )}
        </div>
      </div>

      <div className="product-content">
        <span className="product-category-tag">
          {product.category_name || product.category || 'Dessert'}
        </span>

        <h3 className="product-title">{product.name}</h3>

        {product.description && (
          <p className="product-description">{product.description}</p>
        )}

        <div className="product-footer" style={{ marginTop: 'auto', paddingTop: '12px' }}>
          <span className="product-price">
            {hasVariants ? `From ${BRAND_CONFIG.currency}${minPrice.toFixed(0)}` : `${BRAND_CONFIG.currency}${Number(product.price).toFixed(0)}`}
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
                onClick={handleAction}
                className="btn btn-primary btn-sm"
                title={hasVariants || hasToppings ? "View Options" : "Add to Cart"}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-full)',
                  minHeight: '38px',
                  fontSize: '0.82rem',
                }}
              >
                {hasVariants || hasToppings ? (
                  <>
                    <SlidersHorizontal size={14} />
                    <span>Options</span>
                  </>
                ) : (
                  <>
                    <Plus size={15} />
                    <span>Add</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
