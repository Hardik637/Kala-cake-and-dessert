import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, ShoppingBag, Check } from 'lucide-react';
import { BRAND_CONFIG } from '../config/brand';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';

export default function ProductModal({ product, onClose }) {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedTopping, setSelectedTopping] = useState(null);

  const { addToCart } = useCart();
  const { addToast } = useToast();

  useEffect(() => {
    if (product) {
      if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
        setSelectedVariant(product.variants[0]);
      } else {
        setSelectedVariant(null);
      }

      if (product.toppings && Array.isArray(product.toppings) && product.toppings.length > 0) {
        setSelectedTopping(product.toppings[0]);
      } else {
        setSelectedTopping(null);
      }
      setQuantity(1);
    }
  }, [product]);

  if (!product) return null;

  const isSoldOut = product.available === 0;
  const currentUnitPrice = selectedVariant && selectedVariant.price !== undefined 
    ? Number(selectedVariant.price) 
    : Number(product.price);

  const handleAdd = () => {
    if (isSoldOut) return;
    addToCart(product, quantity, selectedVariant, selectedTopping);
    const variantLabel = selectedVariant ? ` (${selectedVariant.name})` : '';
    addToast(`Added ${quantity} × ${product.name}${variantLabel} to your cart.`, 'success');
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
              src={product.image_url || '/placeholder.jpg'}
              onError={(e) => { e.currentTarget.src = '/placeholder.jpg'; }}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
              <span className="product-category-tag">
                {product.category_name || product.category || 'Dessert'}
              </span>
              {product.size && (
                <span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--color-text-muted)', background: 'var(--color-surface-warm)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                  {product.size}
                </span>
              )}
              {Boolean(product.is_eggless) && (
                <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#2B5835', background: '#EAF3EC', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                  Eggless
                </span>
              )}
              {Boolean(product.no_refined_sugar) && (
                <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#2B5835', background: '#EAF3EC', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                  No Refined Sugar
                </span>
              )}
              {Boolean(product.no_maida) && (
                <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#2B5835', background: '#EAF3EC', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                  No Maida
                </span>
              )}
              {Boolean(product.alcohol_free) && (
                <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#2B5835', background: '#EAF3EC', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                  Alcohol Free
                </span>
              )}
            </div>

            <h2 style={{ fontSize: '1.65rem', marginBottom: '8px', lineHeight: 1.25 }}>{product.name}</h2>

            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-text-main)', marginBottom: '14px' }}>
              {BRAND_CONFIG.currency}{currentUnitPrice.toFixed(0)}
            </div>

            {product.description && (
              <p style={{ fontSize: '0.92rem', color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: '16px' }}>
                {product.description}
              </p>
            )}

            {/* Product Variants (Options / Packs) */}
            {product.variants && Array.isArray(product.variants) && product.variants.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-main)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Select Option
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {product.variants.map((v) => {
                    const isSelected = selectedVariant?.id === v.id || selectedVariant?.name === v.name;
                    return (
                      <button
                        key={v.id || v.name}
                        type="button"
                        onClick={() => setSelectedVariant(v)}
                        style={{
                          padding: '7px 14px',
                          borderRadius: 'var(--radius-full)',
                          border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                          background: isSelected ? 'var(--color-surface-warm)' : '#FFFFFF',
                          color: isSelected ? 'var(--color-primary)' : 'var(--color-text-main)',
                          fontWeight: isSelected ? 700 : 500,
                          fontSize: '0.84rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {isSelected && <Check size={14} color="var(--color-primary)" />}
                        <span>{v.name} — {BRAND_CONFIG.currency}{v.price}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Product Toppings */}
            {product.toppings && Array.isArray(product.toppings) && product.toppings.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-main)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Select Topping / Flavor
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {product.toppings.map((t) => {
                    const isSelected = selectedTopping === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSelectedTopping(t)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 'var(--radius-full)',
                          border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                          background: isSelected ? 'var(--color-surface-warm)' : '#FFFFFF',
                          color: isSelected ? 'var(--color-primary)' : 'var(--color-text-main)',
                          fontWeight: isSelected ? 700 : 500,
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {isSelected && <Check size={13} color="var(--color-primary)" />}
                        <span>{t}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Serving Information */}
            {product.serves && (
              <div
                style={{
                  background: 'var(--color-surface-warm)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  marginBottom: '16px',
                  fontSize: '0.84rem',
                }}
              >
                <strong style={{ color: 'var(--color-text-main)' }}>Serves: </strong>
                <span style={{ color: 'var(--color-text-muted)' }}>{product.serves}</span>
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
                    <span>Add to Cart — {BRAND_CONFIG.currency}{(currentUnitPrice * quantity).toFixed(0)}</span>
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
