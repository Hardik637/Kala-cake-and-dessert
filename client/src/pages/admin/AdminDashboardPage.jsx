import React, { useState, useEffect } from 'react';
import { ShoppingBag, TrendingUp, Clock, CheckCircle2, Gift, MessageSquare, ArrowRight } from 'lucide-react';
import { BRAND_CONFIG } from '../../config/brand';
import { api } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function AdminDashboardPage({ setAdminView }) {
  const { adminToken } = useAuth();
  const { addToast } = useToast();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = () => {
    if (!adminToken) return;
    setLoading(true);
    api.getMetrics(adminToken)
      .then((res) => setMetrics(res))
      .catch((err) => console.error('Failed to load metrics:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMetrics();
  }, [adminToken]);

  const handleQuickStatusChange = async (orderId, newStatus) => {
    try {
      const res = await api.updateOrderStatus(orderId, newStatus, adminToken);
      if (res.milestoneUpdated) {
        addToast(`Order ${res.order.order_number} marked DELIVERED: Milestone progress increased to ${res.milestoneEvent.newCount}/${res.milestoneEvent.required}!`, 'success');
      } else {
        addToast(`Order status updated to ${newStatus}.`, 'success');
      }
      fetchMetrics();
    } catch (err) {
      addToast(err.message || 'Failed to update order status.', 'error');
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', color: 'var(--color-text-muted)' }}>Loading store metrics...</div>;
  }

  return (
    <div>
      {/* Page Title */}
      <div style={{ marginBottom: '28px' }}>
        <span className="section-eyebrow" style={{ marginBottom: '4px' }}>Overview & Analytics</span>
        <h1 style={{ fontSize: '2.2rem' }}>Store Dashboard</h1>
      </div>

      {/* 4 Primary Metric Cards */}
      <div className="metric-grid">
        <div className="metric-card">
          <span className="metric-label">Today's Orders</span>
          <div className="metric-value">{metrics?.todayOrders || 0}</div>
          <span className="metric-sub">Confirmed today</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Today's Revenue</span>
          <div className="metric-value">
            {BRAND_CONFIG.currency}{(metrics?.todayRevenue || 0).toFixed(2)}
          </div>
          <span className="metric-sub">Total sales for today</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Pending / In Kitchen</span>
          <div className="metric-value" style={{ color: 'var(--color-accent)' }}>
            {metrics?.pendingOrders || 0}
          </div>
          <span className="metric-sub">Active orders being prepared/dispatched</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Delivered Orders</span>
          <div className="metric-value" style={{ color: '#22543D' }}>
            {metrics?.completedOrders || 0}
          </div>
          <span className="metric-sub">Contributed to customer milestones</span>
        </div>
      </div>

      {/* Secondary Highlights Banner: Milestone Rewards & Custom Enquiries */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
        }}
      >
        <div
          onClick={() => setAdminView('rewards')}
          style={{
            background: '#FFFFFF',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'rgba(197, 160, 89, 0.15)',
                color: 'var(--color-gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Gift size={20} />
            </div>
            <div>
              <strong style={{ fontSize: '1rem', color: 'var(--color-text-main)', display: 'block' }}>
                {metrics?.pendingRewardsCount || 0} Unlocked Rewards Pending
              </strong>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                Customers awaiting reward redemption
              </span>
            </div>
          </div>
          <ArrowRight size={18} color="var(--color-text-light)" />
        </div>

        <div
          onClick={() => setAdminView('enquiries')}
          style={{
            background: '#FFFFFF',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'rgba(184, 107, 83, 0.15)',
                color: 'var(--color-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MessageSquare size={20} />
            </div>
            <div>
              <strong style={{ fontSize: '1rem', color: 'var(--color-text-main)', display: 'block' }}>
                {metrics?.newEnquiriesCount || 0} New Custom Enquiries
              </strong>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                Bespoke cake & event consultations
              </span>
            </div>
          </div>
          <ArrowRight size={18} color="var(--color-text-light)" />
        </div>
      </div>

      {/* Recent Orders Live Table */}
      <div className="admin-table-card">
        <div className="admin-table-header">
          <div>
            <h3 style={{ fontSize: '1.25rem' }}>Recent Order Activity</h3>
            <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
              Live pipeline. Marking an order <strong>DELIVERED</strong> triggers the customer's milestone credit.
            </span>
          </div>

          <button
            onClick={() => setAdminView('orders')}
            className="btn btn-secondary btn-sm"
          >
            <span>View All Orders</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Fulfillment</th>
                <th>Amount</th>
                <th>Current Status</th>
                <th>Quick Pipeline Action</th>
              </tr>
            </thead>
            <tbody>
              {!metrics?.recentOrders || metrics.recentOrders.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>
                    No orders placed yet.
                  </td>
                </tr>
              ) : (
                metrics.recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 700 }}>{o.order_number}</td>
                    <td>
                      <div>{o.customer_name}</div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-light)' }}>{o.customer_phone}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem' }}>
                        {o.fulfillment_type === 'PICKUP' ? '🏬 Pickup' : '🚚 Delivery'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {BRAND_CONFIG.currency}{o.total_amount.toFixed(2)}
                    </td>
                    <td>
                      <span className={`status-pill ${o.status.toLowerCase()}`}>
                        {o.status.replace(/_/g, ' ')}
                      </span>
                      {o.milestone_credited === 1 && (
                        <span
                          title="Milestone credited to customer"
                          style={{ marginLeft: '6px', fontSize: '0.72rem', color: '#22543D', fontWeight: 700 }}
                        >
                          ✓ Credited
                        </span>
                      )}
                    </td>
                    <td>
                      <select
                        value={o.status}
                        onChange={(e) => handleQuickStatusChange(o.id, e.target.value)}
                        className="form-select"
                        style={{ padding: '6px 10px', fontSize: '0.8rem', borderRadius: '4px' }}
                      >
                        <option value="NEW">NEW</option>
                        <option value="CONFIRMED">CONFIRMED</option>
                        <option value="PREPARING">PREPARING</option>
                        <option value="READY">READY</option>
                        <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
                        <option value="DELIVERED">DELIVERED (+1 Milestone)</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
