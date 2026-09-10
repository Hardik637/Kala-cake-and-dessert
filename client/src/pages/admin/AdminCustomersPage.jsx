import React, { useState, useEffect } from 'react';
import { Users, Eye, Gift, ShoppingBag, X, Phone, Mail, MapPin } from 'lucide-react';
import { BRAND_CONFIG } from '../../config/brand';
import { api } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function AdminCustomersPage() {
  const { adminToken } = useAuth();
  const { addToast } = useToast();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  const fetchCustomers = () => {
    if (!adminToken) return;
    setLoading(true);
    api.getCustomers(adminToken)
      .then((res) => setCustomers(res.customers))
      .catch((err) => console.error('Failed to load customers:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCustomers();
  }, [adminToken]);

  const handleInspectCustomer = (customerId) => {
    setInspectLoading(true);
    api.getCustomerDetails(customerId, adminToken)
      .then((res) => {
        setSelectedCustomer(res);
      })
      .catch((err) => addToast('Failed to load customer details.', 'error'))
      .finally(() => setInspectLoading(false));
  };

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <span className="section-eyebrow" style={{ marginBottom: '4px' }}>Clientele CRM</span>
        <h1 style={{ fontSize: '2.2rem' }}>Customer Management</h1>
      </div>

      <div className="admin-table-card">
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact</th>
                <th>Lifetime Orders</th>
                <th>Total Spend</th>
                <th>Active Milestone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
                    Loading customer roster...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
                    No registered customers yet.
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const completed = c.active_milestone_completed ?? 0;
                  const required = c.active_milestone_required ?? 10;
                  const remaining = Math.max(0, required - completed);
                  const isUnlocked = c.milestone_unlocked === 1;

                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-light)' }}>
                          Joined {new Date(c.created_at).toLocaleDateString('en-GB')}
                        </span>
                      </td>
                      <td>
                        <div>{c.email}</div>
                        <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{c.phone}</span>
                      </td>
                      <td>
                        <div><strong>{c.total_orders}</strong> placed</div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-light)' }}>
                          ({c.lifetime_delivered_orders} delivered)
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {BRAND_CONFIG.currency}{c.total_spent.toFixed(2)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 700, color: isUnlocked ? 'var(--color-gold)' : 'var(--color-text-main)' }}>
                            {completed} / {required}
                          </span>
                          {isUnlocked ? (
                            <span className="status-pill ready">★ UNLOCKED</span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                              ({remaining} to go)
                            </span>
                          )}
                        </div>
                        {/* Mini visual dots */}
                        <div style={{ display: 'flex', gap: '2px', marginTop: '4px' }}>
                          {Array.from({ length: required }).map((_, i) => (
                            <span
                              key={i}
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: i < completed ? 'var(--color-accent)' : '#E8DFD3',
                              }}
                            />
                          ))}
                        </div>
                      </td>
                      <td>
                        <button
                          onClick={() => handleInspectCustomer(c.id)}
                          className="admin-action-btn"
                          title="View order history & reward status"
                        >
                          <Eye size={13} />
                          <span>View History</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Deep-Dive Modal */}
      {selectedCustomer && (
        <div className="modal-overlay" onClick={() => setSelectedCustomer(null)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '720px', padding: '36px' }}
          >
            <button className="modal-close-btn" onClick={() => setSelectedCustomer(null)}>
              <X size={18} />
            </button>

            <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '18px', marginBottom: '24px' }}>
              <span className="section-eyebrow" style={{ marginBottom: '2px' }}>Customer Dossier</span>
              <h2 style={{ fontSize: '1.85rem' }}>{selectedCustomer.customer.name}</h2>
              <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                <span>{selectedCustomer.customer.email}</span>
                <span>•</span>
                <span>{selectedCustomer.customer.phone}</span>
              </div>
            </div>

            {/* Address */}
            {selectedCustomer.customer.default_address && (
              <div style={{ background: 'var(--color-surface-warm)', padding: '12px 16px', borderRadius: '6px', marginBottom: '24px', fontSize: '0.85rem' }}>
                <strong>Saved Address:</strong> {selectedCustomer.customer.default_address}
              </div>
            )}

            {/* Milestones Section */}
            <h3 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>Kala Reward Milestones</h3>
            <div style={{ marginBottom: '24px', border: '1px solid var(--color-border)', borderRadius: '6px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead style={{ background: 'var(--color-surface-warm)' }}>
                  <tr>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Reward</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>Completed</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCustomer.milestones.map((m) => (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{m.reward_name || 'Signature Cookie Box'}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        {m.completed_orders} / {m.required_orders}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        {m.redeemed === 1 ? (
                          <span className="status-pill delivered">Redeemed</span>
                        ) : m.unlocked === 1 ? (
                          <span className="status-pill ready">★ UNLOCKED</span>
                        ) : (
                          <span className="status-pill preparing">In Progress</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--color-text-light)' }}>
                        {m.redeemed === 1
                          ? `Redeemed: ${new Date(m.redeemed_at).toLocaleDateString('en-GB')}`
                          : m.unlocked === 1
                          ? `Unlocked: ${new Date(m.unlocked_at).toLocaleDateString('en-GB')}`
                          : `Started: ${new Date(m.created_at).toLocaleDateString('en-GB')}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Complete Order History */}
            <h3 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>Lifetime Orders ({selectedCustomer.orders.length})</h3>
            <div style={{ border: '1px solid var(--color-border)', borderRadius: '6px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead style={{ background: 'var(--color-surface-warm)' }}>
                  <tr>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Order #</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Date</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Total</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCustomer.orders.map((o) => (
                    <tr key={o.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{o.order_number}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--color-text-muted)' }}>
                        {new Date(o.created_at).toLocaleDateString('en-GB')}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                        {BRAND_CONFIG.currency}{o.total_amount.toFixed(2)}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span className={`status-pill ${o.status.toLowerCase()}`}>
                          {o.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
