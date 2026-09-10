import React, { useState, useEffect } from 'react';
import { Cake, Calendar, Users, Eye, Phone, Mail, Check, X } from 'lucide-react';
import { api } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function AdminEnquiriesPage() {
  const { adminToken } = useAuth();
  const { addToast } = useToast();

  const [enquiries, setEnquiries] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Inspection & edit modal
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [statusDraft, setStatusDraft] = useState('');

  const fetchEnquiries = () => {
    if (!adminToken) return;
    setLoading(true);
    api.getAdminEnquiries({ status: selectedStatus }, adminToken)
      .then((res) => setEnquiries(res.enquiries || []))
      .catch((err) => console.error('Failed to load cake requests:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchEnquiries();
  }, [adminToken, selectedStatus]);

  const handleOpenInspect = (enq) => {
    setSelectedEnquiry(enq);
    setAdminNotes(enq.admin_notes || '');
    setStatusDraft(enq.status);
  };

  const handleUpdateEnquiry = async () => {
    if (!selectedEnquiry) return;
    try {
      await api.updateEnquiry(selectedEnquiry.id, {
        status: statusDraft,
        admin_notes: adminNotes
      }, adminToken);
      addToast(`Request ${selectedEnquiry.enquiry_number} updated to ${statusDraft}.`, 'success');
      setSelectedEnquiry(null);
      fetchEnquiries();
    } catch (err) {
      addToast('Failed to update request.', 'error');
    }
  };

  const statusFilters = ['ALL', 'NEW', 'CONTACTED', 'CONFIRMED', 'COMPLETED', 'DECLINED'];

  return (
    <div style={{ width: '100%', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: '28px' }}>
        <span className="section-eyebrow" style={{ marginBottom: '4px' }}>Customer Requests</span>
        <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Custom Cakes</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '2px' }}>
          Manage customer custom cake requests, review dates, and update statuses.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs" style={{ marginBottom: '24px', display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
        {statusFilters.map((st) => (
          <button
            key={st}
            onClick={() => setSelectedStatus(st)}
            className={`filter-tab ${selectedStatus === st ? 'active' : ''}`}
            style={{ minHeight: '36px', padding: '6px 14px', fontSize: '0.85rem' }}
          >
            {st}
          </button>
        ))}
      </div>

      <div className="admin-table-card">
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Ref #</th>
                <th>Customer</th>
                <th>Contact</th>
                <th>Cake Date</th>
                <th>Servings / Size</th>
                <th>Flavour & Theme</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>Loading custom cake requests...</td>
                </tr>
              ) : enquiries.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
                    No custom cake requests found in this view.
                  </td>
                </tr>
              ) : (
                enquiries.map((enq) => (
                  <tr key={enq.id}>
                    <td style={{ fontWeight: 700 }}>{enq.enquiry_number}</td>
                    <td>
                      <strong style={{ display: 'block', fontSize: '0.95rem' }}>{enq.name}</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        {new Date(enq.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>{enq.phone}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{enq.email}</div>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.88rem', fontWeight: 600 }}>
                        <Calendar size={14} color="var(--color-accent)" />
                        {enq.preferred_date}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.88rem' }}>{enq.servings_quantity || '—'}</td>
                    <td>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{enq.cake_flavour || '—'}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{enq.cake_theme || '—'}</div>
                    </td>
                    <td>
                      <span className={`badge badge-${(enq.status || 'new').toLowerCase()}`}>
                        {enq.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => handleOpenInspect(enq)}
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', minHeight: '34px' }}
                      >
                        <Eye size={14} />
                        <span>Review</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review & Status Modal */}
      {selectedEnquiry && (
        <div className="modal-overlay" onClick={() => setSelectedEnquiry(null)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '640px', padding: 'clamp(24px, 4vw, 36px)', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <span className="section-eyebrow" style={{ marginBottom: '2px' }}>Request Details</span>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 700 }}>{selectedEnquiry.enquiry_number}</h3>
              </div>
              <button
                onClick={() => setSelectedEnquiry(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Customer Info Card */}
              <div style={{ background: 'var(--color-surface-warm)', padding: '16px', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '6px' }}>{selectedEnquiry.name}</div>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Phone size={14} color="var(--color-accent)" />
                    {selectedEnquiry.phone}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Mail size={14} color="var(--color-accent)" />
                    {selectedEnquiry.email}
                  </span>
                </div>
              </div>

              {/* Cake Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.9rem' }}>
                <div>
                  <label className="form-label">Cake Date</label>
                  <div style={{ fontWeight: 600 }}>{selectedEnquiry.preferred_date}</div>
                </div>
                <div>
                  <label className="form-label">Servings / Size</label>
                  <div style={{ fontWeight: 600 }}>{selectedEnquiry.servings_quantity || 'Not specified'}</div>
                </div>
                <div>
                  <label className="form-label">Cake Flavour</label>
                  <div style={{ fontWeight: 600 }}>{selectedEnquiry.cake_flavour || 'Not specified'}</div>
                </div>
                <div>
                  <label className="form-label">Cake Theme</label>
                  <div style={{ fontWeight: 600 }}>{selectedEnquiry.cake_theme || 'Not specified'}</div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="form-label">Customer Requirements & Notes</label>
                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '0.9rem',
                    lineHeight: 1.5,
                  }}
                >
                  {selectedEnquiry.description}
                </div>
              </div>

              {/* Status Selector */}
              <div>
                <label className="form-label">Update Status</label>
                <select
                  value={statusDraft}
                  onChange={(e) => setStatusDraft(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', minHeight: '44px' }}
                >
                  {statusFilters.filter(st => st !== 'ALL').map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              {/* Internal Admin Notes */}
              <div>
                <label className="form-label">Internal Notes</label>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add internal notes on discussion, pricing, or confirmation..."
                  className="form-input"
                  style={{ width: '100%', padding: '10px' }}
                />
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedEnquiry(null)}
                  className="btn btn-secondary"
                  style={{ minHeight: '42px' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateEnquiry}
                  className="btn btn-primary"
                  style={{ minHeight: '42px', padding: '8px 20px' }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
