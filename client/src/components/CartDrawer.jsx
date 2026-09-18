import React from 'react';
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { BRAND_CONFIG } from '../config/brand';
import { useCart } from '../context/CartContext';

export default function CartDrawer({ onProceedCheckout, onExploreMenu }) {
  const { items, isCartOpen, closeCart, updateQuantity, removeFromCart, subtotal, itemCount } = useCart();

  if (!isCartOpen) return null;

  return (
    <div className="drawer-overlay" onClick={closeCart}>
      <div
        className="drawer-panel"
        onClick={(e) => e.stopPropagation()}
        style={{ display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '20px 20px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 700 }}>Your Cart</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </span>
          </div>

          <button
            onClick={closeCart}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-main)',
              padding: '8px',
              minWidth: '44px',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Close Cart"
            aria-label="Close Cart"
          >
            <X size={22} />
          </button>
        </div>

        {/* Drawer Content */}
        <div style={{ flexGrow: 1, overflowY: 'auto', padding: '16px 20px', boxSizing: 'border-box' }}>
          {items.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                textAlign: 'center',
                padding: '30px 16px',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'var(--color-surface-warm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-accent)',
                  marginBottom: '16px',
                }}
              >
                <ShoppingBag size={28} />
              </div>
              <h4 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Your cart is empty</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '24px', maxWidth: '260px', lineHeight: 1.5 }}>
                Explore our menu to add fresh cakes, dessert tubs, brownies, and cookies.
              </p>
              <button
                onClick={() => {
                  closeCart(true);
                  if (onExploreMenu) onExploreMenu();
                }}
                className="btn btn-secondary"
                style={{ padding: '10px 24px', minHeight: '44px' }}
              >
                Explore Menu
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {items.map((item) => {
                const prod = item.product || item;
                const itemKey = item.key || prod.id;
                const unitPrice = item.unit_price !== undefined ? item.unit_price : Number(prod.price || 0);

                return (
                  <div
                    key={itemKey}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      paddingBottom: '16px',
                      borderBottom: '1px solid var(--color-border)',
                      alignItems: 'center',
                    }}
                  >
                    <img
                      src={prod.image_url || '/placeholder.jpg'}
                      onError={(e) => { e.currentTarget.src = '/placeholder.jpg'; }}
                      alt={prod.name}
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '8px',
                        objectFit: 'cover',
                        flexShrink: 0,
                      }}
                    />

                    <div style={{ flexGrow: 1, minWidth: 0 }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {prod.name}
                      </h4>
                      {item.selected_variant && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-primary)', fontWeight: 600, marginBottom: '2px' }}>
                          Option: {item.selected_variant.name || item.selected_variant}
                        </div>
                      )}
                      {item.selected_topping && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '2px' }}>
                          Topping: {item.selected_topping}
                        </div>
                      )}
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-accent)', marginBottom: '8px' }}>
                        {BRAND_CONFIG.currency}{(unitPrice * item.quantity).toFixed(0)}
                      </div>

                      {/* Quantity Controls */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-full)',
                            padding: '2px',
                          }}
                        >
                          <button
                            onClick={() => updateQuantity(itemKey, item.quantity - 1)}
                            style={{
                              width: '28px',
                              height: '28px',
                              border: 'none',
                              background: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              borderRadius: '50%',
                            }}
                            title="Decrease"
                            aria-label="Decrease quantity"
                          >
                            <Minus size={14} />
                          </button>
                          <span style={{ width: '24px', textAlign: 'center', fontSize: '0.85rem', fontWeight: 600 }}>
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(itemKey, item.quantity + 1)}
                            style={{
                              width: '28px',
                              height: '28px',
                              border: 'none',
                              background: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              borderRadius: '50%',
                            }}
                            title="Increase"
                            aria-label="Increase quantity"
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        <button
                          onClick={() => removeFromCart(itemKey)}
                          style={{
                            border: 'none',
                            background: 'none',
                            color: 'var(--color-text-light)',
                            cursor: 'pointer',
                            padding: '6px',
                            minWidth: '36px',
                            minHeight: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="Remove item"
                          aria-label="Remove item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        {items.length > 0 && (
          <div
            style={{
              padding: '20px 20px',
              borderTop: '1px solid var(--color-border)',
              background: '#FFFFFF',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '0.95rem', color: 'var(--color-text-muted)' }}>Subtotal</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-main)' }}>
                {BRAND_CONFIG.currency}{subtotal.toFixed(0)}
              </span>
            </div>

            <button
              onClick={() => {
                closeCart(true);
                if (onProceedCheckout) onProceedCheckout();
              }}
              className="btn btn-primary btn-lg"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                borderRadius: 'var(--radius-full)',
                minHeight: '48px',
              }}
            >
              <span>Proceed to Checkout</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
