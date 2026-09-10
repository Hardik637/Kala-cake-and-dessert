import React, { useState, useEffect } from 'react';
import { Search, Clock, MapPin, AlertCircle, Shield } from 'lucide-react';
import { BRAND_CONFIG } from '../config/brand';
import { api } from '../api/api';
import { useStoreSettings } from '../context/StoreSettingsContext';
import OrderStepper from '../components/OrderStepper';

export default function OrderTrackingPage({ trackOrderId, setActivePage }) {
  const [searchToken, setSearchToken] = useState(trackOrderId || '');
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { settings } = useStoreSettings();

  const fetchTracking = (token) => {
    if (!token || !token.trim()) return;
    const cleanToken = token.trim();

    // Prevent predictable sequential number lookup
    if (cleanToken.startsWith('#') || /^\d+$/.test(cleanToken)) {
      setError('For customer privacy and security, public tracking requires your unique tracking code provided on your order confirmation.');
      setOrderData(null);
      return;
    }

    setLoading(true);
    setError('');
    api.trackOrder(cleanToken)
      .then((res) => {
        setOrderData(res.order || res);
      })
      .catch((err) => {
        setError(err.message || 'Could not find order. Please verify your tracking code.');
        setOrderData(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (trackOrderId) {
      setSearchToken(trackOrderId);
      fetchTracking(trackOrderId);
    }
  }, [trackOrderId]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchTracking(searchToken);
  };

  const currencySymbol = settings?.currency_symbol || BRAND_CONFIG.currency || '₹';

  return (
    <div className="section-spacing" style={{ paddingTop: 'clamp(24px, 5vw, 40px)', width: '100%', boxSizing: 'border-box' }}>
      <div className="container" style={{ maxWidth: '800px', padding: '0 16px', boxSizing: 'border-box' }}>
        {/* Header */}
        <div className="section-header" style={{ marginBottom: '32px' }}>
          <span className="section-eyebrow">Order Status</span>
          <h1 className="section-title">Track Your Order</h1>
          <p className="section-subtitle">
            Enter your tracking code to see your order status.
          </p>
        </div>

        {/* Search Input Bar */}
        <form onSubmit={handleSearch} style={{ maxWidth: '520px', margin: '0 auto 36px auto', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flexGrow: 1, minWidth: '220px' }}>
            <input
              type="text"
              placeholder="Paste your tracking code..."
              value={searchToken}
              onChange={(e) => setSearchToken(e.target.value)}
              className="form-input"
              style={{ width: '100%', paddingLeft: '38px', minHeight: '46px', fontSize: '16px', boxSizing: 'border-box' }}
            />
            <Search size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--color-text-light)' }} />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ padding: '0 24px', minHeight: '46px', borderRadius: 'var(--radius-full)' }}
          >
            Track Order
          </button>
        </form>

        {error && (
          <div
            style={{
              maxWidth: '520px',
              margin: '0 auto 28px auto',
              padding: '14px 18px',
              background: '#FFF5F5',
              border: '1px solid #FEB2B2',
              color: '#C53030',
              borderRadius: '12px',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-muted)' }}>
            <div className="spinner" style={{ margin: '0 auto 12px auto' }} />
            <p>Loading order details...</p>
          </div>
        ) : orderData ? (
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid var(--color-border)',
              borderRadius: '20px',
              padding: 'clamp(24px, 5vw, 40px)',
              boxShadow: 'var(--shadow-sm)',
              boxSizing: 'border-box',
              width: '100%',
            }}
          >
            {/* Top Info Bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '14px',
                paddingBottom: '20px',
                borderBottom: '1px solid var(--color-border)',
                marginBottom: '28px',
              }}
            >
              <div>
                <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-light)', display: 'block', marginBottom: '2px' }}>
                  Order Number
                </span>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text-main)' }}>
                  #{orderData.order_number}
                </span>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-light)', display: 'block', marginBottom: '2px' }}>
                  Fulfillment
                </span>
                <span
                  style={{
                    background: 'var(--color-surface-warm)',
                    color: 'var(--color-primary)',
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                  }}
                >
                  {orderData.fulfillment_type === 'PICKUP' ? 'Bakery Pickup' : 'Doorstep Delivery'}
                </span>
              </div>
            </div>

            {/* Stepper Timeline */}
            <div style={{ marginBottom: '36px', width: '100%' }}>
              <OrderStepper
                currentStatus={orderData.status}
                fulfillmentType={orderData.fulfillment_type}
              />
            </div>

            {/* Order Items */}
            <div style={{ marginTop: '28px' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '14px' }}>Items Ordered</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                {orderData.items && orderData.items.map((i, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.92rem',
                      padding: '8px 0',
                      borderBottom: '1px solid var(--color-border)',
                    }}
                  >
                    <div>
                      <span>{i.product_name || i.name} <span style={{ color: 'var(--color-text-muted)' }}>× {i.quantity}</span></span>
                      {(i.variant_name || i.selected_topping) && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                          {[i.variant_name, i.selected_topping].filter(Boolean).join(' • ')}
                        </div>
                      )}
                    </div>
                    <span style={{ fontWeight: 600 }}>{currencySymbol}{Number(i.total_price || i.item_total || (i.unit_price || 0) * i.quantity).toFixed(0)}</span>
                  </div>
                ))}
              </div>

              {/* Total Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 800, paddingTop: '10px' }}>
                <span>Total</span>
                <span>{currencySymbol}{Number(orderData.total_amount).toFixed(0)}</span>
              </div>
            </div>

            {/* Privacy Safeguard Note */}
            <div
              style={{
                marginTop: '28px',
                paddingTop: '16px',
                borderTop: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.8rem',
                color: 'var(--color-text-light)',
              }}
            >
              <Shield size={14} color="var(--color-accent)" />
              <span>Customer personal details and delivery addresses are hidden on public tracking.</span>
            </div>
          </div>
        ) : (
          <div
            style={{
              textAlign: 'center',
              padding: '48px 20px',
              background: '#FFFFFF',
              border: '1px dashed var(--color-border)',
              borderRadius: '16px',
              color: 'var(--color-text-muted)',
            }}
          >
            <Clock size={36} color="var(--color-text-light)" style={{ margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '1.2rem', marginBottom: '6px', color: 'var(--color-text-main)' }}>
              Awaiting Tracking Code
            </h3>
            <p style={{ fontSize: '0.9rem', maxWidth: '380px', margin: '0 auto' }}>
              Paste your tracking code from your order confirmation or click "Track" directly from your customer account page.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
