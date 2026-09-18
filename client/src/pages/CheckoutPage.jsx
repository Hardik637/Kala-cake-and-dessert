import React, { useState, useEffect } from 'react';
import { Truck, Store, CreditCard, Banknote, ShieldCheck, ArrowLeft, CheckCircle2, User, Lock, Smartphone, Sparkles } from 'lucide-react';
import { BRAND_CONFIG } from '../config/brand';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { api } from '../api/api';
import { loadRazorpayScript } from '../utils/loadRazorpay';

export default function CheckoutPage({ setActivePage, onOpenAuth, setTrackOrderId }) {
  const { items, subtotal, clearCart } = useCart();
  const { customerUser, customerToken, isCustomerAuthenticated, refreshCustomerProfile } = useAuth();
  const { addToast } = useToast();
  const { settings } = useStoreSettings();

  const [fulfillmentType, setFulfillmentType] = useState('DELIVERY');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [pickupTime, setPickupTime] = useState('Today (Within 2 hours)');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('RAZORPAY_UPI'); // RAZORPAY_UPI or COD
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

    const baseOrderItems = items.map((i) => ({
      product_id: i.product?.id || i.id,
      quantity: i.quantity,
      selected_variant: i.selected_variant ? (i.selected_variant.id || i.selected_variant.name || i.selected_variant) : null,
      selected_topping: i.selected_topping || null,
    }));

    try {
      // 1. Cash on Delivery (COD) Option
      if (paymentMethod === 'COD') {
        const orderPayload = {
          fulfillment_type: fulfillmentType,
          delivery_address: fulfillmentType === 'DELIVERY' ? deliveryAddress.trim() : null,
          pickup_time: fulfillmentType === 'PICKUP' ? pickupTime : null,
          notes: notes.trim() || null,
          payment_method: 'COD',
          items: baseOrderItems,
        };

        const res = await api.placeOrder(orderPayload, customerToken);
        clearCart();
        refreshCustomerProfile();
        addToast(`Order #${res.order.order_number} confirmed with Cash on Delivery!`, 'success');

        if (setTrackOrderId) {
          setTrackOrderId(res.order.tracking_token);
        }
        setActivePage('order-tracking');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // 2. Razorpay Online Payment Flow (UPI, QR, Cards, NetBanking)
      const isScriptReady = await loadRazorpayScript();
      if (!isScriptReady && typeof window !== 'undefined' && !window.Razorpay) {
        throw new Error('Unable to load Razorpay payment gateway. Please check your internet connection.');
      }

      const rzpOrder = await api.createRazorpayOrder({
        fulfillment_type: fulfillmentType,
        delivery_address: fulfillmentType === 'DELIVERY' ? deliveryAddress.trim() : null,
        items: baseOrderItems,
      }, customerToken);

      // Handle Development Mock Mode if keys are not configured in .env
      if (rzpOrder.mode === 'mock' || (typeof window !== 'undefined' && !window.Razorpay)) {
        const mockPaymentId = `pay_mock_${Date.now()}`;
        const mockSignature = `mock_sig_${Date.now()}`;

        const verifyRes = await api.verifyRazorpayPayment({
          razorpay_order_id: rzpOrder.razorpay_order_id,
          razorpay_payment_id: mockPaymentId,
          razorpay_signature: mockSignature,
          fulfillment_type: fulfillmentType,
          delivery_address: fulfillmentType === 'DELIVERY' ? deliveryAddress.trim() : null,
          pickup_time: fulfillmentType === 'PICKUP' ? pickupTime : null,
          notes: notes.trim() || null,
          items: baseOrderItems,
        }, customerToken);

        clearCart();
        refreshCustomerProfile();
        addToast(`Order #${verifyRes.order.order_number} paid & confirmed!`, 'success');

        if (setTrackOrderId) {
          setTrackOrderId(verifyRes.order.tracking_token);
        }
        setActivePage('order-tracking');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // Launch Real Razorpay Standard Checkout Modal
      const rzpOptions = {
        key: rzpOrder.key_id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency || 'INR',
        name: 'Kalã — Cakes and Desserts',
        description: `Artisanal Order (${items.length} ${items.length === 1 ? 'item' : 'items'})`,
        image: 'https://emofly.b-cdn.net/hbd_exvhac6ayb3ZKT/width:256/plain/https%3A%2F%2Fstorage.googleapis.com%2Ftakeapp%2Fmedia%2Fcm6f1102v000003jrfygg0njp.png',
        order_id: rzpOrder.razorpay_order_id,
        prefill: {
          name: rzpOrder.customer?.name || customerUser?.name || '',
          email: rzpOrder.customer?.email || customerUser?.email || '',
          contact: rzpOrder.customer?.phone || customerUser?.phone || '',
        },
        theme: {
          color: '#2B5835', // Kalã signature green
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            addToast('Payment was cancelled. Your bag items remain saved.', 'info');
          },
        },
        handler: async (response) => {
          try {
            setLoading(true);
            const verifyPayload = {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              fulfillment_type: fulfillmentType,
              delivery_address: fulfillmentType === 'DELIVERY' ? deliveryAddress.trim() : null,
              pickup_time: fulfillmentType === 'PICKUP' ? pickupTime : null,
              notes: notes.trim() || null,
              items: baseOrderItems,
            };

            const verifyRes = await api.verifyRazorpayPayment(verifyPayload, customerToken);
            clearCart();
            refreshCustomerProfile();
            addToast(`Order #${verifyRes.order.order_number} paid & confirmed!`, 'success');

            if (setTrackOrderId) {
              setTrackOrderId(verifyRes.order.tracking_token);
            }
            setActivePage('order-tracking');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } catch (verifyErr) {
            setError(verifyErr.message || 'Payment verification failed. Please contact support.');
          } finally {
            setLoading(false);
          }
        },
      };

      const razorpayInstance = new window.Razorpay(rzpOptions);
      razorpayInstance.on('payment.failed', function (failureRes) {
        setLoading(false);
        setError(failureRes.error?.description || 'Payment failed. Please try another UPI app or card.');
      });
      razorpayInstance.open();
    } catch (err) {
      setError(err.message || 'Failed to process order. Please try again.');
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
              className="btn btn-primary btn-lg"
              style={{ minHeight: '46px', margin: '0 auto' }}
            >
              Explore Our Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="section-spacing" style={{ paddingTop: 'clamp(20px, 5vw, 40px)', width: '100%', boxSizing: 'border-box' }}>
      <div className="container" style={{ maxWidth: '1080px', padding: '0 16px', boxSizing: 'border-box' }}>
        
        {/* Navigation Breadcrumb */}
        <div style={{ marginBottom: '24px' }}>
          <button
            onClick={() => { setActivePage('menu'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="btn btn-secondary btn-sm"
            style={{ minHeight: '38px', gap: '6px' }}
          >
            <ArrowLeft size={16} />
            <span>Continue Shopping</span>
          </button>
        </div>

        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', fontWeight: 800, marginBottom: '6px' }}>
            Checkout
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
            Complete your details and choose your preferred payment method.
          </p>
        </div>

        {/* Authentication Notice if Guest */}
        {!isCustomerAuthenticated && (
          <div
            style={{
              background: 'var(--color-surface-warm)',
              border: '1px solid var(--color-border)',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <User size={22} color="var(--color-accent)" />
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Sign in for Rewards & Tracking</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '2px 0 0 0' }}>
                  Sign in with Google to earn loyalty milestones and easily track your delivery.
                </p>
              </div>
            </div>
            <button
              onClick={onOpenAuth}
              className="btn btn-primary"
              style={{ minHeight: '40px', padding: '8px 20px' }}
            >
              Sign In with Google
            </button>
          </div>
        )}

        {error && (
          <div
            style={{
              background: '#FDF2F2',
              color: '#991B1B',
              border: '1px solid #F87171',
              borderRadius: '12px',
              padding: '14px 18px',
              marginBottom: '24px',
              fontSize: '0.9rem',
              fontWeight: 500,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handlePlaceOrder}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
              gap: '28px',
              alignItems: 'flex-start',
            }}
          >
            {/* Left Column: Fulfillment, Address & Payment */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* 1. Fulfillment Type */}
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
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '16px' }}>1. Delivery or Pickup</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setFulfillmentType('DELIVERY')}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '16px 12px',
                      borderRadius: '12px',
                      border: '2px solid',
                      borderColor: fulfillmentType === 'DELIVERY' ? '#2B5835' : 'var(--color-border)',
                      background: fulfillmentType === 'DELIVERY' ? 'rgba(43, 88, 53, 0.05)' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <Truck size={22} color={fulfillmentType === 'DELIVERY' ? '#2B5835' : 'var(--color-text-muted)'} />
                    <span style={{ fontWeight: 700, fontSize: '0.92rem', color: fulfillmentType === 'DELIVERY' ? '#2B5835' : 'var(--color-text-main)' }}>
                      Home Delivery
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                      {storeDeliveryFee === 0 ? 'Free Delivery' : `${currencySymbol}${storeDeliveryFee.toFixed(0)} fee`}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFulfillmentType('PICKUP')}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '16px 12px',
                      borderRadius: '12px',
                      border: '2px solid',
                      borderColor: fulfillmentType === 'PICKUP' ? '#2B5835' : 'var(--color-border)',
                      background: fulfillmentType === 'PICKUP' ? 'rgba(43, 88, 53, 0.05)' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <Store size={22} color={fulfillmentType === 'PICKUP' ? '#2B5835' : 'var(--color-text-muted)'} />
                    <span style={{ fontWeight: 700, fontSize: '0.92rem', color: fulfillmentType === 'PICKUP' ? '#2B5835' : 'var(--color-text-main)' }}>
                      Boutique Pickup
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                      Free • Ready in 2h
                    </span>
                  </button>
                </div>
              </div>

              {/* 2. Address or Pickup Time */}
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
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '14px' }}>
                  {fulfillmentType === 'DELIVERY' ? '2. Delivery Address' : '2. Pickup Schedule'}
                </h3>

                {fulfillmentType === 'DELIVERY' ? (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-main)' }}>
                      Full Address (Building, Flat, Street, Area, Pin Code) *
                    </label>
                    <textarea
                      rows={3}
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="e.g. Flat 402, Sea Green Apts, Hill Road, Bandra West, Mumbai - 400050"
                      required
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '10px',
                        border: '1px solid var(--color-border)',
                        fontSize: '0.92rem',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                ) : (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-main)' }}>
                      Preferred Pickup Time
                    </label>
                    <select
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '10px',
                        border: '1px solid var(--color-border)',
                        fontSize: '0.92rem',
                        fontFamily: 'inherit',
                        background: '#FFFFFF',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="Today (Within 2 hours)">Today (Within 2 hours)</option>
                      <option value="Today Evening (5:00 PM - 8:00 PM)">Today Evening (5:00 PM - 8:00 PM)</option>
                      <option value="Tomorrow Morning (11:00 AM - 1:00 PM)">Tomorrow Morning (11:00 AM - 1:00 PM)</option>
                      <option value="Tomorrow Afternoon (2:00 PM - 5:00 PM)">Tomorrow Afternoon (2:00 PM - 5:00 PM)</option>
                      <option value="Tomorrow Evening (5:00 PM - 8:00 PM)">Tomorrow Evening (5:00 PM - 8:00 PM)</option>
                    </select>
                  </div>
                )}

                {/* Special Instructions / Notes */}
                <div style={{ marginTop: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-main)' }}>
                    Special Instructions (Optional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Please include birthday candles, ring the bell"
                    maxLength={150}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid var(--color-border)',
                      fontSize: '0.9rem',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* 3. Payment Method: Razorpay (UPI, Cards) and COD */}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <CreditCard size={18} color="var(--color-accent)" />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>3. Payment Method</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  
                  {/* Razorpay Online UPI Option */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '14px',
                      padding: '16px',
                      borderRadius: '12px',
                      border: '2px solid',
                      borderColor: paymentMethod === 'RAZORPAY_UPI' ? '#2B5835' : 'var(--color-border)',
                      background: paymentMethod === 'RAZORPAY_UPI' ? 'rgba(43, 88, 53, 0.04)' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      value="RAZORPAY_UPI"
                      checked={paymentMethod === 'RAZORPAY_UPI'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      style={{ marginTop: '3px', accentColor: '#2B5835' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <Smartphone size={18} color="#2B5835" />
                        <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-text-main)' }}>
                          UPI & Online Payment (Razorpay)
                        </span>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: '#EAF3EC',
                            color: '#2B5835',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-full)',
                            border: '1px solid #C8DEC9',
                          }}
                        >
                          Fast & Secure
                        </span>
                      </div>
                      <p style={{ margin: '0 0 10px 0', fontSize: '0.84rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                        Pay securely with any UPI App (Google Pay, PhonePe, Paytm, BHIM, CRED), Scan QR Code, or pay with Debit / Credit Cards & NetBanking.
                      </p>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, background: '#F4EAE6', color: '#633B2B', padding: '3px 8px', borderRadius: '6px' }}>GPay</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, background: '#ECE6F4', color: '#4B2A75', padding: '3px 8px', borderRadius: '6px' }}>PhonePe</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, background: '#E6F0F4', color: '#1B5B7A', padding: '3px 8px', borderRadius: '6px' }}>Paytm</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, background: '#EAF3EC', color: '#2B5835', padding: '3px 8px', borderRadius: '6px' }}>UPI QR</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, background: '#F7F7F7', color: '#555555', padding: '3px 8px', borderRadius: '6px', border: '1px solid #E0E0E0' }}>Cards / NetBanking</span>
                      </div>
                    </div>
                  </label>

                  {/* Cash on Delivery Option */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '14px',
                      padding: '16px',
                      borderRadius: '12px',
                      border: '2px solid',
                      borderColor: paymentMethod === 'COD' ? '#2B5835' : 'var(--color-border)',
                      background: paymentMethod === 'COD' ? 'rgba(43, 88, 53, 0.04)' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      value="COD"
                      checked={paymentMethod === 'COD'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      style={{ marginTop: '3px', accentColor: '#2B5835' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <Banknote size={18} color="#2B5835" />
                        <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-text-main)' }}>
                          Cash on Delivery (COD)
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                        Pay in cash upon arrival of your order at your doorstep or when picking up at the bakery.
                      </p>
                    </div>
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
                  const itemTotal = (i.unit_price !== undefined ? i.unit_price : Number(prod.price)) * i.quantity;
                  const variantText = i.selected_variant ? ` (${i.selected_variant.name || i.selected_variant})` : '';
                  const toppingText = i.selected_topping ? ` + ${i.selected_topping}` : '';

                  return (
                    <div key={i.key || prod.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', alignItems: 'center' }}>
                      <div style={{ minWidth: 0, paddingRight: '8px' }}>
                        <span style={{ fontWeight: 600 }}>{prod.name}{variantText}{toppingText}</span>
                        <span style={{ color: 'var(--color-text-muted)', marginLeft: '6px' }}>× {i.quantity}</span>
                      </div>
                      <span style={{ fontWeight: 600, flexShrink: 0 }}>
                        {currencySymbol}{itemTotal.toFixed(0)}
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

              {/* Action Button */}
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
                <span>
                  {loading
                    ? 'Processing...'
                    : paymentMethod === 'COD'
                    ? `Place Order (COD) • ${currencySymbol}${totalAmount.toFixed(0)}`
                    : `Pay with UPI / Razorpay • ${currencySymbol}${totalAmount.toFixed(0)}`}
                </span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '14px', fontSize: '0.78rem', color: 'var(--color-text-light)' }}>
                <ShieldCheck size={14} color="var(--color-accent)" />
                <span>Encrypted 256-bit secure checkout</span>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
