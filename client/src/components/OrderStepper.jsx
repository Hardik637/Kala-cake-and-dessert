import React from 'react';
import { Check, Clock, AlertCircle } from 'lucide-react';

export default function OrderStepper({ currentStatus, fulfillmentType = 'DELIVERY' }) {
  const steps = [
    { key: 'NEW', label: 'Received' },
    { key: 'CONFIRMED', label: 'Confirmed' },
    { key: 'PREPARING', label: 'In Kitchen' },
    { key: 'READY', label: fulfillmentType === 'PICKUP' ? 'Ready for Pickup' : 'Ready' },
    { key: 'OUT_FOR_DELIVERY', label: fulfillmentType === 'PICKUP' ? 'Awaiting You' : 'Out for Delivery' },
    { key: 'DELIVERED', label: fulfillmentType === 'PICKUP' ? 'Collected' : 'Delivered' },
  ];

  if (currentStatus === 'CANCELLED') {
    return (
      <div
        style={{
          background: 'var(--status-cancelled-bg, #FFF5F5)',
          color: 'var(--status-cancelled-text, #C53030)',
          padding: '16px 20px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          margin: '20px 0',
          border: '1px solid #FEB2B2',
        }}
      >
        <AlertCircle size={20} />
        <div>
          <strong>Order Cancelled</strong>
          <p style={{ fontSize: '0.85rem', marginTop: '2px', color: 'inherit' }}>
            This order has been cancelled and will not progress further.
          </p>
        </div>
      </div>
    );
  }

  const currentIndex = steps.findIndex((s) => s.key === currentStatus);
  const activeIdx = currentIndex >= 0 ? currentIndex : 0;
  const progressPercent = Math.min(100, Math.max(0, (activeIdx / (steps.length - 1)) * 100));

  return (
    <div className="order-stepper-wrap" style={{ width: '100%', boxSizing: 'border-box' }}>
      {/* Desktop Horizontal Stepper */}
      <div className="stepper-horizontal-view">
        <div className="stepper-container">
          <div className="stepper-progress-line" />
          <div className="stepper-progress-active" style={{ width: `${progressPercent}%` }} />

          {steps.map((step, idx) => {
            const isCompleted = idx < activeIdx;
            const isCurrent = idx === activeIdx;
            return (
              <div
                key={step.key}
                className={`stepper-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'active' : ''}`}
              >
                <div className="stepper-dot">
                  {isCompleted ? (
                    <Check size={14} strokeWidth={3} />
                  ) : isCurrent ? (
                    <Clock size={14} />
                  ) : (
                    idx + 1
                  )}
                </div>
                <span className="stepper-label">{step.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Vertical Stepper View */}
      <div className="stepper-vertical-view">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0', padding: '8px 0' }}>
          {steps.map((step, idx) => {
            const isCompleted = idx < activeIdx;
            const isCurrent = idx === activeIdx;
            const isLast = idx === steps.length - 1;

            return (
              <div
                key={step.key}
                style={{
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'flex-start',
                  position: 'relative',
                  paddingBottom: isLast ? '0' : '20px',
                }}
              >
                {/* Connecting vertical line */}
                {!isLast && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '15px',
                      top: '30px',
                      bottom: '0',
                      width: '2px',
                      background: idx < activeIdx ? 'var(--color-accent)' : 'var(--color-border)',
                      zIndex: 1,
                    }}
                  />
                )}

                {/* Status Dot */}
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: isCompleted || isCurrent ? 'var(--color-accent)' : '#FFFFFF',
                    border: `2px solid ${isCompleted || isCurrent ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    color: isCompleted || isCurrent ? '#FFFFFF' : 'var(--color-text-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    zIndex: 2,
                    flexShrink: 0,
                  }}
                >
                  {isCompleted ? (
                    <Check size={14} strokeWidth={3} />
                  ) : isCurrent ? (
                    <Clock size={14} />
                  ) : (
                    idx + 1
                  )}
                </div>

                {/* Status Info */}
                <div style={{ paddingTop: '5px' }}>
                  <div
                    style={{
                      fontSize: '0.95rem',
                      fontWeight: isCurrent ? 700 : isCompleted ? 600 : 400,
                      color: isCurrent ? 'var(--color-text-main)' : isCompleted ? 'var(--color-text-main)' : 'var(--color-text-light)',
                    }}
                  >
                    {step.label}
                  </div>
                  {isCurrent && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-accent)', fontWeight: 600, marginTop: '2px' }}>
                      In Progress
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
