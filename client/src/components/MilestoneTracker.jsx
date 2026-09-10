import React, { useEffect } from 'react';
import { Gift, Check, Award } from 'lucide-react';
import confetti from 'canvas-confetti';
import { BRAND_CONFIG } from '../config/brand';

export default function MilestoneTracker({ milestone, compact = false }) {
  const completed = milestone?.completed_orders || 0;
  const required = milestone?.required_orders || 10;
  const isUnlocked = milestone?.unlocked === 1 || completed >= required;
  const rewardName = milestone?.reward_name || 'Free Dessert Box';
  const remaining = Math.max(0, required - completed);

  useEffect(() => {
    if (isUnlocked && !compact) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#B86B53', '#C5A059', '#FAF7F2']
        });
      } catch (e) {
        // Safe fallback
      }
    }
  }, [isUnlocked, compact]);

  // Generate dots array
  const dots = Array.from({ length: required }, (_, idx) => {
    const stepNumber = idx + 1;
    const isFilled = stepNumber <= completed;
    const isNext = stepNumber === completed + 1;
    const isLast = stepNumber === required;
    return { stepNumber, isFilled, isNext, isLast };
  });

  if (compact) {
    return (
      <div
        style={{
          background: 'var(--color-surface-warm)',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid var(--color-border)',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, color: 'var(--color-accent)' }}>
            Your Rewards Progress
          </span>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-text-main)' }}>
            {completed} of {required} Orders
          </span>
        </div>

        {/* Scalable Progress Bar */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', width: '100%' }}>
          {dots.map((d) => (
            <div
              key={d.stepNumber}
              style={{
                flex: 1,
                height: '8px',
                borderRadius: '4px',
                background: d.isFilled ? 'var(--color-accent)' : d.isLast && isUnlocked ? 'var(--color-gold)' : 'var(--color-border)',
                transition: 'background 0.3s ease',
              }}
            />
          ))}
        </div>

        <div style={{ marginTop: '8px', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
          {isUnlocked ? (
            <span style={{ color: 'var(--color-gold)', fontWeight: 600 }}>
              Reward unlocked! Enjoy your {rewardName}.
            </span>
          ) : (
            <span>{remaining} more {remaining === 1 ? 'order' : 'orders'} to unlock your {rewardName}.</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="milestone-container"
      style={{
        background: '#FFFFFF',
        border: '1px solid var(--color-border)',
        borderRadius: '16px',
        padding: '28px 24px',
        boxShadow: 'var(--shadow-sm)',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Header Info */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <span className="section-eyebrow" style={{ marginBottom: '4px' }}>
            Kala Rewards
          </span>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 700, lineHeight: 1.2 }}>Your Progress</h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Earn rewards with every delivered order.
          </p>
        </div>

        <div
          style={{
            background: 'var(--color-surface-warm)',
            padding: '10px 18px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--color-border)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text-main)', lineHeight: 1 }}>
            {completed} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--color-text-light)' }}>/ {required}</span>
          </div>
          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            Orders Delivered
          </div>
        </div>
      </div>

      {/* Responsive Progress Track */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '6px',
          margin: '28px 0 24px 0',
          position: 'relative',
          flexWrap: 'nowrap',
          width: '100%',
        }}
      >
        {dots.map((d) => (
          <div
            key={d.stepNumber}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
            }}
          >
            <div
              style={{
                width: 'clamp(24px, 6vw, 36px)',
                height: 'clamp(24px, 6vw, 36px)',
                borderRadius: '50%',
                background: d.isFilled ? 'var(--color-accent)' : d.isLast && isUnlocked ? 'var(--color-gold)' : '#FFFFFF',
                border: `2px solid ${d.isFilled ? 'var(--color-accent)' : d.isLast ? 'var(--color-gold)' : 'var(--color-border)'}`,
                color: d.isFilled || (d.isLast && isUnlocked) ? '#FFFFFF' : 'var(--color-text-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 'clamp(0.68rem, 1.8vw, 0.82rem)',
                fontWeight: 700,
                transition: 'all 0.25s ease',
              }}
            >
              {d.isFilled ? (
                <Check size={14} strokeWidth={3} />
              ) : d.isLast ? (
                <Gift size={14} />
              ) : (
                d.stepNumber
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Reward Status Banner */}
      <div
        style={{
          background: isUnlocked ? 'rgba(212, 175, 55, 0.12)' : 'var(--color-surface-warm)',
          border: `1px solid ${isUnlocked ? 'var(--color-gold)' : 'var(--color-border)'}`,
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: isUnlocked ? 'var(--color-gold)' : 'var(--color-border)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {isUnlocked ? <Award size={24} /> : <Gift size={20} />}
        </div>

        <div style={{ flexGrow: 1 }}>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '2px' }}>
            {isUnlocked ? 'Reward Unlocked!' : rewardName}
          </h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            {isUnlocked
              ? `You have unlocked your ${rewardName}! The boutique owner will confirm your complimentary treat on your next visit or delivery.`
              : `${remaining} more delivered ${remaining === 1 ? 'order' : 'orders'} to unlock your ${rewardName}.`}
          </p>
        </div>
      </div>
    </div>
  );
}
