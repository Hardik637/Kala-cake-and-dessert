import React, { useState, useEffect } from 'react';
import { Truck, Store, CreditCard, QrCode, Banknote, ShieldCheck, ArrowLeft, CheckCircle2, User, Lock } from 'lucide-react';
import { BRAND_CONFIG } from '../config/brand';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { api } from '../api/api';

export default function CheckoutPage({ setActivePage, onOpenAuth, setTrackOrderId }) {
  const { items, subtotal, clearCart } = useCart();
  const { customerUser, customerToken, isCustomerAuthenticated, refreshCustomerProfile } = useAuth();
  const { addToast } = useToast();
  const { settings } = useStoreSettings();

  const [fulfillmentType, setFulfillmentType] = useState('DELIVERY');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [pickupTime, setPickupTime] = useState('Today (Within 2 hours)');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [upiApp, setUpiApp] = useState('GPAY'); // GPAY, PHONEPE, PAYTM, BHIM
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill customer address if logged in
  useEffect(() => {
    if (customerUser && !deliveryAddress) {
      const addr = customerUser.default_address || '';
      if (addr) setDeliveryAddress(addr);
    }
  }, [customerUser, deliveryAddress]);

  const currencySymbol = settings?.currency_symbol || BRAND_CONFIG.currency || '₹';
  const storeDeliveryFee = settings?.default_delivery_fee !== undefined 
    ? Number(settings.default_delivery_fee) 
    : BRAND_CONFIG.defaultDeliveryFee;

  const deliveryFee = fulfillmentType === 'DELIVERY' ? storeDeliveryFee : 0;
  const totalAmount = subtotal + deliveryFee;

  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    if (!isCustomerAuthenticated) {
      onOpenAuth();
      return;
    }

    if (items.length === 0) {
      setError('Your cart is empty.');
      return;
    }

    if (fulfillmentType === 'DELIVERY' && !deliveryAddress.trim()) {
      setError('Please provide a complete delivery address.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const orderPayload = {
        fulfillment_type: fulfillmentType,
        delivery_address: fulfillmentType === 'DELIVERY' ? deliveryAddress.trim() : null,
        pickup_time: fulfillmentType === 'PICKUP' ? pickupTime : null,
        notes: notes.trim() || null,
        payment_method: paymentMethod,
        items: items.map((i) => ({
          product_id: i.product?.id || i.id,
          quantity: i.quantity,
        })),
      };

      const res = await api.placeOrder(orderPayload, customerToken);
      clearCart();
      refreshCustomerProfile();
      addToast(`Order #${res.order.order_number} confirmed! Thank you.`, 'success');
      
      // Direct to tracking strictly by random tracking_token
      if (setTrackOrderId) {
        setTrackOrderId(res.order.tracking_token);
      }
      setActivePage('order-tracking');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.message || 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="section-spacing" style={{ paddingTop: 'clamp(30px, 6vw, 60px)', width: '100%', boxSizing: 'border-box' }}>
        <div className="container" style={{ maxWidth: '540px', padding: '0 16px', textAlign: 'center', boxSizing: 'border-box' }}>
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid var(--color-border)',
              borderRadius: '20px',
              padding: '48px 24px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <h2 style={{ fontSize: '1.6rem', marginBottom: '12px' }}>Your Cart is Empty</h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px', fontSize: '0.95rem' }}>
              Add some of our fresh cakes, dessert tubs, brownies, or cookies to checkout.
            </p>
            <button
              onClick={() => { setActivePage('menu'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="btn btn-primary"
              style={{ minHeight: '44px', padding: '10px 24px' }}
            >
              Explore Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="section-spacing" style={{ paddingTop: 'clamp(20px, 4vw, 36px)', width: '100%', boxSizing: 'border-box' }}>
      <div className="container" style={{ maxWidth: '960px', padding: '0 16px', boxSizing: 'border-box' }}>
        {/* Navigation Breadcrumb */}
        <button
          onClick={() => setActivePage('menu')}
          style={{
            background: 'none',
            border: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            fontSize: '0.88rem',
            marginBottom: '20px',
            padding: '6px 0',
            minHeight: '36px',
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Menu</span>
        </button>

        <div className="section-header" style={{ marginBottom: '28px', textAlign: 'left' }}>
          <h1 className="section-title" style={{ fontSize: 'clamp(1.75rem, 4.5vw, 2.3rem)' }}>Checkout</h1>
          <p className="section-subtitle" style={{ margin: 0 }}>
            Complete your order details below.
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '14px 18px',
              background: '#FFF5F5',
              border: '1px solid #FEB2B2',
              color: '#C53030',
              borderRadius: '10px',
              marginBottom: '24px',
              fontSize: '0.9rem',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handlePlaceOrder}>
          <div
            className="checkout-layout-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
              gap: '28px',
              alignItems: 'start',
            }}
          >
            {/* Left Column: Form Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
              {/* 1. Account Section */}
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid var(--color-border)',
                  borderRadius: '16px',
                  padding: 'clamp(18px, 4vw, 24px)',
                  boxShadow: 'var(--shadow-sm)',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <User size={18} color="var(--color-accent)" />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>1. Your Account</h3>
                </div>

                {isCustomerAuthenticated ? (
                  <div style={{ fontSize: '0.92rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>{customerUser?.name}</div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>{customerUser?.email}</div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>{customerUser?.phone}</div>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '14px', lineHeight: 1.5 }}>
                      Sign in with your Google account to complete your order and earn milestone rewards.
                    </p>
                    <button
                      type="button"
                      onClick={onOpenAuth}
                      className="btn btn-primary"
                      style={{ minHeight: '44px', padding: '8px 20px', borderRadius: 'var(--radius-full)' }}
                    >
                      Sign In with Google
                    </button>
                  </div>
                )}
              </div>

              {/* 2. Fulfillment Options (Delivery vs Pickup) */}
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid var(--color-border)',
                  borderRadius: '16px',
                  padding: 'clamp(18px, 4vw, 24px)',
                  boxShadow: 'var(--shadow-sm)',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <Truck size={18} color="var(--color-accent)" />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>2. Delivery or Pickup</h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <button
                    type="button"
                    onClick={() => setFulfillmentType('DELIVERY')}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '2px solid',
                      borderColor: fulfillmentType === 'DELIVERY' ? 'var(--color-accent)' : 'var(--color-border)',
                      background: fulfillmentType === 'DELIVERY' ? 'var(--color-surface-warm)' : '#FFFFFF',
                      cursor: 'pointer',
                      textAlign: 'left',
                      minHeight: '44px',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text-main)' }}>Doorstep Delivery</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                      {storeDeliveryFee === 0 ? 'Free' : `${currencySymbol}${storeDeliveryFee.toFixed(0)} fee`}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFulfillmentType('PICKUP')}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '2px solid',
                      borderColor: fulfillmentType === 'PICKUP' ? 'var(--color-accent)' : 'var(--color-border)',
                      background: fulfillmentType === 'PICKUP' ? 'var(--color-surface-warm)' : '#FFFFFF',
                      cursor: 'pointer',
                      textAlign: 'left',
                      minHeight: '44px',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text-main)' }}>Bakery Pickup</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                      Complimentary
                    </div>
                  </button>
                </div>

                {/* Delivery Address or Pickup Details */}
                {fulfillmentType === 'DELIVERY' ? (
                  <div>
                    <label className="form-label" htmlFor="delivery-address">
                      Delivery Address <span style={{ color: 'var(--color-accent)' }}>*</span>
                    </label>
                    <textarea
                      id="delivery-address"
                      required={fulfillmentType === 'DELIVERY'}
                      rows={3}
                      placeholder="Flat/House No., Building, Street, Area, Landmark, Pincode"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="form-input"
                      style={{ width: '100%', padding: '12px', fontSize: '16px', lineHeight: 1.5, boxSizing: 'border-box' }}
                    />
                  </div>
                ) : (
                  <div>
                    <label className="form-label" htmlFor="pickup-time">
                      Estimated Pickup Time
                    </label>
                    <select
                      id="pickup-time"
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                      className="form-input"
                      style={{ width: '100%', minHeight: '46px', fontSize: '16px', boxSizing: 'border-box' }}
                    >
                      <option value="Today (Within 1-2 hours)">Today (Within 1-2 hours)</option>
                      <option value="Today Evening (5 PM - 8 PM)">Today Evening (5 PM - 8 PM)</option>
                      <option value="Tomorrow Morning (10 AM - 1 PM)">Tomorrow Morning (10 AM - 1 PM)</option>
                      <option value="Tomorrow Evening (5 PM - 8 PM)">Tomorrow Evening (5 PM - 8 PM)</option>
                    </select>
                  </div>
                )}

                {/* Order Notes */}
                <div style={{ marginTop: '16px' }}>
                  <label className="form-label" htmlFor="order-notes">
                    Special Instructions (Optional)
                  </label>
                  <input
                    id="order-notes"
                    type="text"
                    placeholder="e.g. Ring the doorbell, write 'Happy Birthday' on card"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', minHeight: '44px', fontSize: '16px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* 3. Payment Method */}
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid var(--color-border)',
                  borderRadius: '16px',
                  padding: 'clamp(18px, 4vw, 24px)',
                  boxShadow: 'var(--shadow-sm)',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <CreditCard size={18} color="var(--color-accent)" />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>3. Payment Method</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: '1px solid',
                      borderColor: paymentMethod === 'UPI' ? 'var(--color-accent)' : 'var(--color-border)',
                      background: paymentMethod === 'UPI' ? 'var(--color-surface-warm)' : '#FFFFFF',
                      cursor: 'pointer',
                      minHeight: '44px',
                    }}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      value="UPI"
                      checked={paymentMethod === 'UPI'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    <QrCode size={18} color="var(--color-accent)" />
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>UPI (GPay, PhonePe, Paytm, QR)</span>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: '1px solid',
                      borderColor: paymentMethod === 'CARD' ? 'var(--color-accent)' : 'var(--color-border)',
                      background: paymentMethod === 'CARD' ? 'var(--color-surface-warm)' : '#FFFFFF',
                      cursor: 'pointer',
                      minHeight: '44px',
                    }}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      value="CARD"
                      checked={paymentMethod === 'CARD'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    <CreditCard size={18} color="var(--color-accent)" />
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Debit / Credit Card</span>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: '1px solid',
                      borderColor: paymentMethod === 'COD' ? 'var(--color-accent)' : 'var(--color-border)',
                      background: paymentMethod === 'COD' ? 'var(--color-surface-warm)' : '#FFFFFF',
                      cursor: 'pointer',
                      minHeight: '44px',
                    }}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      value="COD"
                      checked={paymentMethod === 'COD'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    <Banknote size={18} color="var(--color-accent)" />
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Cash on Delivery / Pickup</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Right Column: Order Summary & Place Order */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid var(--color-border)',
                borderRadius: '16px',
                padding: 'clamp(20px, 4vw, 28px)',
                boxShadow: 'var(--shadow-sm)',
                position: 'sticky',
                top: '90px',
                boxSizing: 'border-box',
                width: '100%',
              }}
            >
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '18px' }}>Order Summary</h3>

              {/* Items List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', maxHeight: '240px', overflowY: 'auto' }}>
                {items.map((i) => {
                  const prod = i.product || i;
                  return (
                    <div key={prod.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', alignItems: 'center' }}>
                      <div style={{ minWidth: 0, paddingRight: '8px' }}>
                        <span style={{ fontWeight: 600 }}>{prod.name}</span>
                        <span style={{ color: 'var(--color-text-muted)', marginLeft: '6px' }}>× {i.quantity}</span>
                      </div>
                      <span style={{ fontWeight: 600, flexShrink: 0 }}>
                        {currencySymbol}{(Number(prod.price) * i.quantity).toFixed(0)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.92rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)' }}>
                  <span>Subtotal</span>
                  <span>{currencySymbol}{subtotal.toFixed(0)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)' }}>
                  <span>Delivery Fee</span>
                  <span>{deliveryFee === 0 ? 'Free' : `${currencySymbol}${deliveryFee.toFixed(0)}`}</span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: 'var(--color-text-main)',
                    borderTop: '1px solid var(--color-border)',
                    paddingTop: '12px',
                    marginTop: '4px',
                  }}
                >
                  <span>Total Amount</span>
                  <span>{currencySymbol}{totalAmount.toFixed(0)}</span>
                </div>
              </div>

              {/* Place Order Button */}
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-lg"
                style={{
                  width: '100%',
                  minHeight: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  borderRadius: 'var(--radius-full)',
                  marginTop: '24px',
                }}
              >
                <Lock size={16} />
                <span>{loading ? 'Processing Order...' : `Place Order • ${currencySymbol}${totalAmount.toFixed(0)}`}</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '14px', fontSize: '0.78rem', color: 'var(--color-text-light)' }}>
                <ShieldCheck size={14} color="var(--color-accent)" />
                <span>Encrypted & secure checkout</span>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
