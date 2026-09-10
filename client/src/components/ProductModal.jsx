import React, { useState } from 'react';
import { X, Plus, Minus, ShoppingBag } from 'lucide-react';
import { BRAND_CONFIG } from '../config/brand';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';

export default function ProductModal({ product, onClose }) {
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();
  const { addToast } = useToast();

  if (!product) return null;

  const isSoldOut = product.available === 0;

  const handleAdd = () => {
    if (isSoldOut) return;
    addToCart(product, quantity);
    addToast(`Added ${quantity} × ${product.name} to your cart.`, 'success');
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(28, 21, 18, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box',
      }}
    >
      <div
        className="modal-card product-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: '#FFFFFF',
          borderRadius: 'var(--radius-lg, 16px)',
          position: 'relative',
          boxShadow: 'var(--shadow-lg)',
          boxSizing: 'border-box',
        }}
      >
        <button
          className="modal-close-btn"
          onClick={onClose}
          title="Close Modal"
          aria-label="Close"
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            zIndex: 10,
            background: 'rgba(255, 255, 255, 0.92)',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <X size={20} />
        </button>

        <div className="product-modal-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {/* Product Image Column */}
          <div style={{ position: 'relative', minHeight: '260px', maxHeight: '340px', background: 'var(--color-surface-warm)' }}>
            <img
              src={product.image_url}
              alt={product.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: isSoldOut ? 'grayscale(35%) opacity(0.9)' : 'none',
              }}
            />
            {isSoldOut && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(28, 21, 18, 0.45)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span className="badge badge-soldout" style={{ padding: '8px 18px', fontSize: '0.9rem' }}>
                  Sold Out for Today
                </span>
              </div>
            )}
          </div>

          {/* Product Details Column */}
          <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
            <span className="product-category-tag" style={{ marginBottom: '6px' }}>
              {product.category_name || 'Dessert'}
            </span>

            <h2 style={{ fontSize: '1.65rem', marginBottom: '8px', lineHeight: 1.25 }}>{product.name}</h2>

            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-text-main)', marginBottom: '14px' }}>
              {BRAND_CONFIG.currency}{Number(product.price).toFixed(0)}
            </div>

            <p style={{ fontSize: '0.92rem', color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: '20px' }}>
              {product.description}
            </p>

            {/* Specifications */}
            {(product.serving_size || product.ingredients || product.allergens) && (
              <div
                style={{
                  background: 'var(--color-surface-warm)',
                  borderRadius: '8px',
                  padding: '14px',
                  marginBottom: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '0.84rem',
                }}
              >
                {product.serving_size && (
                  <div>
                    <strong style={{ color: 'var(--color-text-main)' }}>Serving: </strong>
                    <span style={{ color: 'var(--color-text-muted)' }}>{product.serving_size}</span>
                  </div>
                )}
                {product.ingredients && (
                  <div>
                    <strong style={{ color: 'var(--color-text-main)' }}>Ingredients: </strong>
                    <span style={{ color: 'var(--color-text-muted)' }}>{product.ingredients}</span>
                  </div>
                )}
                {product.allergens && (
                  <div>
                    <strong style={{ color: 'var(--color-accent)' }}>Allergens: </strong>
                    <span style={{ color: 'var(--color-text-muted)' }}>{product.allergens}</span>
                  </div>
                )}
              </div>
            )}

            {/* Action Row */}
            <div style={{ marginTop: 'auto', paddingTop: '12px' }}>
              {isSoldOut ? (
                <div
                  style={{
                    padding: '12px',
                    textAlign: 'center',
                    background: 'var(--color-surface-warm)',
                    color: 'var(--color-text-muted)',
                    borderRadius: 'var(--radius-full)',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                  }}
                >
                  Currently Sold Out
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Quantity Stepper */}
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-full)',
                      padding: '4px',
                      background: '#FFFFFF',
                    }}
                  >
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      style={{
                        width: '36px',
                        height: '36px',
                        border: 'none',
                        background: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        borderRadius: '50%',
                      }}
                      title="Decrease quantity"
                      aria-label="Decrease quantity"
                    >
                      <Minus size={16} />
                    </button>
                    <span style={{ width: '32px', textAlign: 'center', fontWeight: 600, fontSize: '0.95rem' }}>
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                      style={{
                        width: '36px',
                        height: '36px',
                        border: 'none',
                        background: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        borderRadius: '50%',
                      }}
                      title="Increase quantity"
                      aria-label="Increase quantity"
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  {/* Add to Cart Button */}
                  <button
                    onClick={handleAdd}
                    className="btn btn-primary"
                    style={{
                      flex: 1,
                      minHeight: '44px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '12px 20px',
                      borderRadius: 'var(--radius-full)',
                    }}
                  >
                    <ShoppingBag size={18} />
                    <span>Add to Cart — {BRAND_CONFIG.currency}{(Number(product.price) * quantity).toFixed(0)}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
