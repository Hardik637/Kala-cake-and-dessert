import React, { useState, useEffect } from 'react';
import { User, MapPin, Phone, Mail, Package, LogOut, Edit2, Check, ArrowRight, Clock, ShieldCheck } from 'lucide-react';
import { BRAND_CONFIG } from '../config/brand';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { api } from '../api/api';
import MilestoneTracker from '../components/MilestoneTracker';

export default function ProfilePage({ setActivePage, setTrackOrderId }) {
  const { customerUser, customerToken, logoutCustomer, customerMilestone, refreshCustomerProfile } = useAuth();
  const { addToast } = useToast();
  const { settings } = useStoreSettings();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressInput, setAddressInput] = useState('');

  useEffect(() => {
    if (customerUser) {
      setAddressInput(customerUser.default_address || '');
    }
  }, [customerUser]);

  useEffect(() => {
    if (customerToken) {
      api.getMyOrders(customerToken)
        .then((res) => setOrders(res.orders || []))
        .catch((err) => console.error('Failed to load orders:', err))
        .finally(() => setLoading(false));
    }
  }, [customerToken]);

  const handleUpdateAddress = async () => {
    try {
      await api.updateProfile({ default_address: addressInput.trim() }, customerToken);
      await refreshCustomerProfile();
      setIsEditingAddress(false);
      addToast('Delivery address updated successfully.', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to update address.', 'error');
    }
  };

  const handleTrackClick = (trackingToken) => {
    if (trackingToken) {
      setTrackOrderId(trackingToken);
      setActivePage('order-tracking');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (!customerUser) return null;

  const currencySymbol = settings?.currency_symbol || BRAND_CONFIG.currency;

  return (
    <div className="section-spacing" style={{ paddingTop: '40px' }}>
      <div className="container" style={{ maxWidth: '960px' }}>
        {/* Customer Greeting Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '36px',
          }}
        >
          <div>
            <span className="section-eyebrow">Customer Account</span>
            <h1 style={{ fontSize: '2.4rem' }}>
              Hello, {customerUser.name} ✨
            </h1>
          </div>

          <button
            onClick={() => {
              logoutCustomer();
              setActivePage('home');
            }}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Milestone Tracker Section */}
        <div style={{ marginBottom: '48px' }}>
          <MilestoneTracker milestone={customerMilestone} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px', marginBottom: '48px' }}>
          {/* Account Profile Card */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              padding: '28px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '22px' }}>
              {customerUser.profile_image ? (
                <img
                  src={customerUser.profile_image}
                  alt={customerUser.name}
                  style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'var(--color-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-gold)',
                  }}
                >
                  <User size={24} />
                </div>
              )}
              <div>
                <h3 style={{ fontSize: '1.2rem', margin: 0, fontFamily: 'var(--font-serif)' }}>
                  Personal Profile
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Google OpenID Verified
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Mail size={18} color="var(--color-text-light)" />
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block' }}>Email</span>
                  <span>{customerUser.email}</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Phone size={18} color="var(--color-text-light)" />
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block' }}>Mobile</span>
                  <span>+91 {customerUser.phone}</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <MapPin size={18} color="var(--color-text-light)" style={{ marginTop: '3px' }} />
                <div style={{ flexGrow: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Default Delivery Address</span>
                    {!isEditingAddress && (
                      <button
                        onClick={() => setIsEditingAddress(true)}
                        style={{ background: 'none', border: 'none', color: 'var(--color-gold)', cursor: 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Edit2 size={12} />
                        <span>Edit</span>
                      </button>
                    )}
                  </div>

                  {isEditingAddress ? (
                    <div style={{ marginTop: '8px' }}>
                      <textarea
                        rows={3}
                        value={addressInput}
                        onChange={(e) => setAddressInput(e.target.value)}
                        placeholder="Enter complete building, street and area..."
                        className="form-input"
                        style={{ width: '100%', fontSize: '0.85rem', marginBottom: '8px' }}
                      />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={handleUpdateAddress}
                          className="btn btn-primary"
                          style={{ padding: '6px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <Check size={14} />
                          <span>Save Address</span>
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingAddress(false);
                            setAddressInput(customerUser.default_address || '');
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span style={{ color: customerUser.default_address ? 'inherit' : 'var(--color-text-muted)' }}>
                      {customerUser.default_address || 'No default address saved.'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Membership / Program Details */}
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              padding: '28px',
            }}
          >
            <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', fontFamily: 'var(--font-serif)' }}>
              Kalã Rewards Privileges
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: '20px' }}>
              Your account is active and automatically participating in our loyalty milestone program. Every delivered order brings you closer to complimentary treats.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldCheck size={18} color="var(--color-gold)" />
                <span>Synchronized across all your devices via Google Sign-In</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Clock size={18} color="var(--color-gold)" />
                <span>Rewards never expire and reset into fresh milestone cycles</span>
              </div>
            </div>
          </div>
        </div>

        {/* Order History */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.6rem', fontFamily: 'var(--font-serif)' }}>
              Your Orders
            </h3>
            <button
              onClick={() => setActivePage('menu')}
              className="btn btn-secondary"
              style={{ padding: '8px 18px', fontSize: '0.85rem' }}
            >
              Order Again
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-muted)' }}>
              <div className="spinner" style={{ margin: '0 auto 16px auto' }} />
              <p>Loading your order history...</p>
            </div>
          ) : orders.length === 0 ? (
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid var(--color-border)',
                padding: '60px 20px',
                textAlign: 'center',
              }}
            >
              <Package size={48} color="var(--color-gold)" style={{ margin: '0 auto 16px auto', display: 'block' }} />
              <h4 style={{ fontSize: '1.2rem', marginBottom: '8px', fontFamily: 'var(--font-serif)' }}>
                No Orders Placed Yet
              </h4>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
                Order your favorite cakes and desserts to start earning rewards.
              </p>
              <button
                onClick={() => setActivePage('menu')}
                className="btn btn-primary"
              >
                Browse Menu
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {orders.map((order) => (
                <div
                  key={order.id}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid var(--color-border)',
                    borderRadius: '12px',
                    padding: '24px',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: '12px',
                      borderBottom: '1px solid var(--color-border)',
                      paddingBottom: '16px',
                      marginBottom: '16px',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '1.1rem', fontWeight: 600, fontFamily: 'var(--font-serif)', display: 'block' }}>
                        {order.order_number}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        Placed on {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span
                        style={{
                          padding: '4px 12px',
                          borderRadius: '16px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          background: order.status === 'DELIVERED' ? '#EBF8EE' : order.status === 'CANCELLED' ? '#FEECEB' : '#FEF3D6',
                          color: order.status === 'DELIVERED' ? '#2B6E3F' : order.status === 'CANCELLED' ? '#BD271E' : '#B8860B',
                        }}
                      >
                        {order.status}
                      </span>

                      {/* Track Button with secure tracking_token */}
                      <button
                        onClick={() => handleTrackClick(order.tracking_token)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <span>Track</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''} • {order.fulfillment_type === 'DELIVERY' ? 'Artisanal Courier' : 'Boutique Collection'}
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                      {currencySymbol}{order.total_amount}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
