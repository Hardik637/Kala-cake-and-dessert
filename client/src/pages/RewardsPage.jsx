import React, { useState, useEffect } from 'react';
import { Gift, Award, CheckCircle2, History, ArrowRight } from 'lucide-react';
import { BRAND_CONFIG } from '../config/brand';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import MilestoneTracker from '../components/MilestoneTracker';

export default function RewardsPage({ setActivePage, onOpenAuth }) {
  const { customerToken, isCustomerAuthenticated, customerMilestone } = useAuth();
  const [rewardData, setRewardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const { settings } = useStoreSettings();

  useEffect(() => {
    if (isCustomerAuthenticated && customerToken) {
      setLoading(true);
      api.getMyRewardStatus(customerToken)
        .then((res) => {
          setRewardData(res);
        })
        .catch((err) => console.error('Failed to load rewards:', err))
        .finally(() => setLoading(false));
    }
  }, [isCustomerAuthenticated, customerToken]);

  const brandName = settings?.brand_name || BRAND_CONFIG.name || 'Kala';
  const displayedMilestone = rewardData?.activeMilestone || customerMilestone;
  const requiredOrders = displayedMilestone?.required_orders || 10;
  const completedOrders = displayedMilestone?.completed_orders || 0;
  const remainingOrders = Math.max(0, requiredOrders - completedOrders);
  const rewardName = displayedMilestone?.reward_name || 'Free Dessert Box';

  return (
    <div className="section-spacing" style={{ paddingTop: 'clamp(24px, 5vw, 40px)', width: '100%', boxSizing: 'border-box' }}>
      <div className="container" style={{ maxWidth: '840px', padding: '0 16px', boxSizing: 'border-box' }}>
        {/* Header */}
        <div className="section-header" style={{ marginBottom: '32px' }}>
          <span className="section-eyebrow">Customer Rewards</span>
          <h1 className="section-title">Kala Rewards</h1>
          <p className="section-subtitle">
            Complete orders and unlock rewards. Every delivered order brings you closer to complimentary treats.
          </p>
        </div>

        {/* Milestone Tracker Display */}
        <div style={{ marginBottom: '40px', width: '100%' }}>
          {isCustomerAuthenticated ? (
            <div>
              {loading && !displayedMilestone ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
                  <div className="spinner" style={{ margin: '0 auto 12px auto' }} />
                  <p>Loading your rewards progress...</p>
                </div>
              ) : (
                <MilestoneTracker milestone={displayedMilestone} />
              )}
            </div>
          ) : (
            /* Unauthenticated Visitor Card */
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid var(--color-border)',
                borderRadius: '20px',
                padding: 'clamp(32px, 6vw, 48px) clamp(20px, 4vw, 36px)',
                textAlign: 'center',
                boxShadow: 'var(--shadow-sm)',
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'var(--color-surface-warm)',
                  color: 'var(--color-accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 18px auto',
                }}
              >
                <Award size={30} />
              </div>
              <h2 style={{ fontSize: '1.6rem', marginBottom: '10px', fontWeight: 700 }}>
                Join Kala Rewards
              </h2>
              <p style={{ maxWidth: '520px', margin: '0 auto 24px auto', color: 'var(--color-text-muted)', lineHeight: 1.6, fontSize: '0.95rem' }}>
                Every delivered order brings you closer to your {rewardName}. Sign in with your Google account to start your {requiredOrders}-order cycle.
              </p>
              <button
                onClick={onOpenAuth}
                className="btn btn-primary btn-lg"
                style={{ minHeight: '46px', padding: '12px 28px', borderRadius: 'var(--radius-full)' }}
              >
                Sign In with Google to Start
              </button>
            </div>
          )}
        </div>

        {/* Milestone History (If customer has past redemptions) */}
        {isCustomerAuthenticated && rewardData?.history && rewardData.history.length > 0 && (
          <div style={{ marginTop: '48px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <History size={20} color="var(--color-accent)" />
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Reward History</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {rewardData.history.map((h) => (
                <div
                  key={h.id}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid var(--color-border)',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--color-text-main)' }}>
                      {h.reward_name || 'Complimentary Treat'}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--color-text-light)', marginTop: '2px' }}>
                      Redeemed on {new Date(h.redeemed_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </div>
                  </div>

                  <span
                    style={{
                      background: 'rgba(34, 197, 94, 0.1)',
                      color: '#15803d',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full)',
                    }}
                  >
                    Redeemed
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* How It Works Section */}
        <div style={{ marginTop: '56px', width: '100%' }}>
          <h3 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '20px', textAlign: 'center' }}>
            How It Works
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
              gap: '20px',
            }}
          >
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid var(--color-border)',
                borderRadius: '16px',
                padding: '24px 20px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-accent)', marginBottom: '8px' }}>1</div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '6px' }}>Order Online</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                Order your favorite cakes, dessert tubs, brownies, and cookies online.
              </p>
            </div>

            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid var(--color-border)',
                borderRadius: '16px',
                padding: '24px 20px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-accent)', marginBottom: '8px' }}>2</div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '6px' }}>Earn With Delivery</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                Each successfully delivered order adds 1 step to your active rewards cycle.
              </p>
            </div>

            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid var(--color-border)',
                borderRadius: '16px',
                padding: '24px 20px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-accent)', marginBottom: '8px' }}>3</div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '6px' }}>Enjoy Your Treat</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                Reach your goal and unlock your complimentary treat box.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
