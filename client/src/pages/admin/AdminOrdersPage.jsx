import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, AlertTriangle, Check, RefreshCw, X, ShieldAlert } from 'lucide-react';
import { BRAND_CONFIG } from '../../config/brand';
import { api } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function AdminOrdersPage() {
  const { adminToken } = useAuth();
  const { addToast } = useToast();

  const [orders, setOrders] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Inspection modal
  const [inspectOrder, setInspectOrder] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  // Reverse Credit Modal state
  const [isReverseModalOpen, setIsReverseModalOpen] = useState(false);
  const [reversalReason, setReversalReason] = useState('');
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);
  const [reversing, setReversing] = useState(false);

  const fetchOrders = () => {
    if (!adminToken) return;
    setLoading(true);
    api.getAdminOrders({ status: selectedStatus, search: searchQuery }, adminToken)
      .then((res) => setOrders(res.orders))
      .catch((err) => console.error('Failed to load orders:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, [adminToken, selectedStatus, searchQuery]);

  const handleOpenInspect = (orderId) => {
    setInspectLoading(true);
    api.getAdminOrderDetails(orderId, adminToken)
      .then((res) => {
        setInspectOrder(res);
      })
      .catch((err) => addToast('Failed to load order details.', 'error'))
      .finally(() => setInspectLoading(false));
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const res = await api.updateOrderStatus(orderId, newStatus, adminToken);
      if (res.milestone?.credited || res.milestoneUpdated) {
        const count = res.milestone?.completedOrders ?? res.milestoneEvent?.newCount ?? '';
        const reqOrders = res.milestone?.requiredOrders ?? res.milestoneEvent?.required ?? 10;
        addToast(`Order ${res.order.order_number} marked DELIVERED: Customer milestone updated to ${count}/${reqOrders}!`, 'success');
      } else {
        addToast(`Order status updated to ${newStatus}.`, 'success');
      }
      fetchOrders();
      if (inspectOrder && inspectOrder.order.id === orderId) {
        handleOpenInspect(orderId);
      }
    } catch (err) {
      addToast(err.message || 'Failed to update order status.', 'error');
    }
  };

  const handleExecuteReversal = async () => {
    if (!confirmCheckbox) {
      addToast('Please check the confirmation box to proceed.', 'error');
      return;
    }
    if (!reversalReason.trim()) {
      addToast('Please provide an audit reason for the reversal.', 'error');
      return;
    }

    setReversing(true);
    try {
      const res = await api.reverseMilestoneCredit(
        inspectOrder.order.id,
        reversalReason.trim(),
        confirmCheckbox,
        adminToken
      );
      addToast(res.message, 'success');
      setIsReverseModalOpen(false);
      setReversalReason('');
      setConfirmCheckbox(false);
      fetchOrders();
      handleOpenInspect(inspectOrder.order.id);
    } catch (err) {
      addToast(err.message || 'Failed to reverse milestone credit.', 'error');
    } finally {
      setReversing(false);
    }
  };

  const statusList = ['ALL', 'NEW', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <span className="section-eyebrow" style={{ marginBottom: '4px' }}>Order Pipeline</span>
        <h1 style={{ fontSize: '2.2rem' }}>Order Management</h1>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        {/* Status Filter Tabs */}
        <div className="filter-tabs">
          {statusList.map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`filter-tab ${selectedStatus === st ? 'active' : ''}`}
            >
              {st.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: '280px' }}>
          <input
            type="text"
            placeholder="Search #1042, name, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input"
            style={{ width: '100%', paddingLeft: '36px', height: '40px', fontSize: '0.85rem' }}
          />
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--color-text-light)' }} />
        </div>
      </div>

      {/* Orders Table */}
      <div className="admin-table-card">
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Fulfillment</th>
                <th>Items</th>
                <th>Amount</th>
                <th>Milestone</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
                    No matching orders found.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 700 }}>{o.order_number}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{o.customer_name}</div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-light)' }}>
                        {o.customer_phone}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem' }}>
                        {o.fulfillment_type === 'PICKUP' ? '🏬 Boutique Pickup' : '🚚 Home Delivery'}
                      </span>
                    </td>
                    <td>{o.item_count} items</td>
                    <td style={{ fontWeight: 600 }}>
                      {BRAND_CONFIG.currency}{o.total_amount.toFixed(2)}
                    </td>
                    <td>
                      {o.milestone_credited === 1 ? (
                        <span style={{ color: '#22543D', fontWeight: 700, fontSize: '0.8rem' }}>
                          ● Credited (+1)
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-text-light)', fontSize: '0.8rem' }}>
                          ○ Uncredited
                        </span>
                      )}
                    </td>
                    <td>
                      <select
                        value={o.status}
                        onChange={(e) => handleStatusChange(o.id, e.target.value)}
                        className="form-select"
                        style={{ padding: '4px 8px', fontSize: '0.78rem', borderRadius: '4px' }}
                      >
                        <option value="NEW">NEW</option>
                        <option value="CONFIRMED">CONFIRMED</option>
                        <option value="PREPARING">PREPARING</option>
                        <option value="READY">READY</option>
                        <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
                        <option value="DELIVERED">DELIVERED (+1)</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </td>
                    <td>
                      <button
                        onClick={() => handleOpenInspect(o.id)}
                        className="admin-action-btn"
                        title="Inspect full details"
                      >
                        <Eye size={14} />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Inspection Modal */}
      {inspectOrder && (
        <div className="modal-overlay" onClick={() => setInspectOrder(null)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '640px', padding: '36px' }}
          >
            <button className="modal-close-btn" onClick={() => setInspectOrder(null)} title="Close">
              <X size={18} />
            </button>

            <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '18px', marginBottom: '20px' }}>
              <span className="section-eyebrow" style={{ marginBottom: '2px' }}>Order Details</span>
              <h2 style={{ fontSize: '1.8rem', color: 'var(--color-text-main)' }}>
                {inspectOrder.order.order_number}
              </h2>
              <span style={{ fontSize: '0.82rem', color: 'var(--color-text-light)' }}>
                Placed: {new Date(inspectOrder.order.created_at).toLocaleString('en-GB')}
              </span>
            </div>

            {/* Status changer in modal */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-surface-warm)', padding: '14px 18px', borderRadius: '6px', marginBottom: '24px' }}>
              <div>
                <strong style={{ fontSize: '0.85rem', display: 'block' }}>Update Pipeline Status:</strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                  Changing to DELIVERED atomically credits milestone progress.
                </span>
              </div>
              <select
                value={inspectOrder.order.status}
                onChange={(e) => handleStatusChange(inspectOrder.order.id, e.target.value)}
                className="form-select"
                style={{ fontWeight: 600 }}
              >
                <option value="NEW">NEW</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="PREPARING">PREPARING</option>
                <option value="READY">READY</option>
                <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
                <option value="DELIVERED">DELIVERED (+1 Milestone)</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>

            {/* Customer & Fulfillment Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '0.88rem', marginBottom: '24px' }}>
              <div>
                <strong>Customer:</strong>
                <p style={{ color: 'var(--color-text-muted)' }}>
                  {inspectOrder.order.customer_name}<br />
                  {inspectOrder.order.customer_phone}<br />
                  {inspectOrder.order.customer_email}
                </p>
              </div>

              <div>
                <strong>Fulfillment ({inspectOrder.order.fulfillment_type}):</strong>
                <p style={{ color: 'var(--color-text-muted)' }}>
                  {inspectOrder.order.fulfillment_type === 'DELIVERY'
                    ? inspectOrder.order.delivery_address
                    : `Pickup: ${inspectOrder.order.pickup_time || 'Standard Hours'}`}
                </p>
              </div>
            </div>

            {inspectOrder.order.notes && (
              <div style={{ background: '#FFFDF9', border: '1px solid #E8DFD3', padding: '12px', borderRadius: '4px', marginBottom: '20px', fontSize: '0.85rem' }}>
                <strong>Customer Order Notes:</strong> "{inspectOrder.order.notes}"
              </div>
            )}

            {/* Items table */}
            <h4 style={{ fontSize: '1.05rem', marginBottom: '10px' }}>Items</h4>
            <div style={{ border: '1px solid var(--color-border)', borderRadius: '6px', overflow: 'hidden', marginBottom: '24px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <tbody>
                  {inspectOrder.items.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                      <td style={{ padding: '10px 14px' }}>{item.quantity}× {item.product_name}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>
                        {BRAND_CONFIG.currency}{item.total_price.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: 'var(--color-surface-warm)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 700 }}>Total Paid ({inspectOrder.order.payment_method})</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, fontSize: '1.05rem' }}>
                      {BRAND_CONFIG.currency}{inspectOrder.order.total_amount.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Rule 3: Admin-Only Reverse Milestone Credit Action */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--color-text-main)' }}>
                    Milestone Credit Status
                  </strong>
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                    {inspectOrder.order.milestone_credited === 1
                      ? '✓ This order contributed +1 to customer milestone.'
                      : '○ Order has not contributed to milestone.'}
                  </p>
                </div>

                {inspectOrder.order.milestone_credited === 1 && (
                  <button
                    type="button"
                    onClick={() => setIsReverseModalOpen(true)}
                    className="admin-action-btn danger"
                    style={{ padding: '8px 14px' }}
                  >
                    <AlertTriangle size={14} />
                    <span>Reverse Milestone Credit</span>
                  </button>
                )}
              </div>

              {/* Audit history for this order */}
              {inspectOrder.auditLogs && inspectOrder.auditLogs.length > 0 && (
                <div style={{ marginTop: '16px', background: 'var(--color-surface-warm)', padding: '12px', borderRadius: '4px', fontSize: '0.78rem' }}>
                  <strong>Milestone Audit Log:</strong>
                  {inspectOrder.auditLogs.map((log) => (
                    <div key={log.id} style={{ marginTop: '4px', color: 'var(--color-text-muted)' }}>
                      • <strong>{log.action_type}</strong>: {log.previous_completed_orders} &rarr; {log.new_completed_orders} orders. Reason: "{log.reason}" by {log.admin_name || 'Admin'} ({new Date(log.created_at).toLocaleString('en-GB')})
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Reverse Milestone Action */}
      {isReverseModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={() => setIsReverseModalOpen(false)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '480px', padding: '32px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#9B2C2C', marginBottom: '16px' }}>
              <ShieldAlert size={28} />
              <h3 style={{ fontSize: '1.4rem' }}>Reverse Milestone Credit</h3>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', marginBottom: '18px', lineHeight: 1.5 }}>
              This will decrement <strong>{inspectOrder.order.customer_name}'s</strong> active milestone by <strong>-1</strong> and record an immutable entry in the administrative audit log.
            </p>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontSize: '0.82rem' }}>Audit Reason (Mandatory) *</label>
              <textarea
                rows={2}
                required
                placeholder="e.g. Order cancelled and refunded at customer request."
                className="form-textarea"
                style={{ width: '100%', fontSize: '0.85rem' }}
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
              />
            </div>

            <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '0.82rem', marginBottom: '24px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={confirmCheckbox}
                onChange={(e) => setConfirmCheckbox(e.target.checked)}
                style={{ marginTop: '3px' }}
              />
              <span>I confirm that this milestone credit was granted erroneously or the order was refunded.</span>
            </label>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setIsReverseModalOpen(false)}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteReversal}
                disabled={reversing || !confirmCheckbox || !reversalReason.trim()}
                className="btn btn-primary btn-sm"
                style={{ background: '#9B2C2C', borderColor: '#9B2C2C' }}
              >
                {reversing ? 'Reversing...' : 'Confirm Reversal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
