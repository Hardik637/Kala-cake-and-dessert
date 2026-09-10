import React, { useState, useEffect } from 'react';
import { Gift, Award, CheckCircle2, History, Settings, ShieldAlert, Sparkles } from 'lucide-react';
import { BRAND_CONFIG } from '../../config/brand';
import { api } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function AdminRewardsPage() {
  const { adminToken } = useAuth();
  const { addToast } = useToast();

  const [rewardConfig, setRewardConfig] = useState(null);
  const [unlockedList, setUnlockedList] = useState([]);
  const [redeemedHistory, setRedeemedHistory] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Config editing state
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [configForm, setConfigForm] = useState({
    name: '',
    description: '',
    required_orders: 10
  });

  // Redemption dialog state
  const [selectedMilestoneToRedeem, setSelectedMilestoneToRedeem] = useState(null);
  const [redemptionNotes, setRedemptionNotes] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  const fetchAllRewardData = () => {
    if (!adminToken) return;
    setLoading(true);
    Promise.all([
      api.getRewardConfig(adminToken),
      api.getUnlockedRewards(adminToken),
      api.getMilestoneAuditLogs(adminToken)
    ])
      .then(([configRes, unlockedRes, logsRes]) => {
        setRewardConfig(configRes.config);
        if (configRes.config) {
          setConfigForm({
            name: configRes.config.name,
            description: configRes.config.description || '',
            required_orders: configRes.config.required_orders
          });
        }
        setUnlockedList(unlockedRes.unlockedList || []);
        setRedeemedHistory(unlockedRes.redeemedHistory || []);
        setAuditLogs(logsRes.logs || []);
      })
      .catch((err) => console.error('Failed to load reward administration data:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAllRewardData();
  }, [adminToken]);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    try {
      const res = await api.updateRewardConfig(configForm, adminToken);
      setRewardConfig(res.config);
      setIsEditingConfig(false);
      addToast('Milestone reward configuration updated.', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to update reward configuration.', 'error');
    }
  };

  const handleRedeemSubmit = async () => {
    if (!selectedMilestoneToRedeem) return;
    setRedeeming(true);
    try {
      const res = await api.redeemReward(
        selectedMilestoneToRedeem.id,
        redemptionNotes,
        adminToken
      );
      addToast(res.message, 'success');
      setSelectedMilestoneToRedeem(null);
      setRedemptionNotes('');
      fetchAllRewardData();
    } catch (err) {
      addToast(err.message || 'Failed to redeem reward.', 'error');
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <span className="section-eyebrow" style={{ marginBottom: '4px' }}>Milestone Reward Engine</span>
        <h1 style={{ fontSize: '2.2rem' }}>Reward Configuration & Redemptions</h1>
      </div>

      {/* 1. ACTIVE MILESTONE CONFIGURATION CARD */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '32px',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '36px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Settings size={22} color="var(--color-accent)" />
            <h3 style={{ fontSize: '1.4rem' }}>Active Milestone Configuration</h3>
          </div>

          {!isEditingConfig && (
            <button
              onClick={() => setIsEditingConfig(true)}
              className="btn btn-secondary btn-sm"
            >
              Configure Reward
            </button>
          )}
        </div>

        {isEditingConfig ? (
          <form onSubmit={handleSaveConfig}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group">
                <label className="form-label">Reward Name *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={configForm.name}
                  onChange={(e) => setConfigForm({ ...configForm, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Completed Orders Required *</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="100"
                  className="form-input"
                  value={configForm.required_orders}
                  onChange={(e) => setConfigForm({ ...configForm, required_orders: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Reward Description</label>
              <textarea
                rows={2}
                className="form-textarea"
                value={configForm.description}
                onChange={(e) => setConfigForm({ ...configForm, description: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setIsEditingConfig(false)}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm">
                Save Reward Configuration
              </button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', background: 'var(--color-surface-warm)', padding: '20px 24px', borderRadius: '8px' }}>
            <div>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--color-accent)', fontWeight: 600 }}>
                Target Milestone Requirement
              </span>
              <div style={{ fontSize: '1.75rem', fontFamily: 'var(--font-serif)', fontWeight: 700, color: 'var(--color-text-main)', marginTop: '2px' }}>
                {rewardConfig?.required_orders || 10} Successfully Delivered Orders
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--color-gold)', fontWeight: 600 }}>
                Complimentary Reward
              </span>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
                {rewardConfig?.name || BRAND_CONFIG.DEFAULT_REWARD_NAME}
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                {rewardConfig?.description || BRAND_CONFIG.DEFAULT_REWARD_DESCRIPTION}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 2. UNLOCKED REWARDS PENDING REDEMPTION */}
      <div className="admin-table-card">
        <div className="admin-table-header">
          <div>
            <h3 style={{ fontSize: '1.3rem' }}>Unlocked Customer Rewards Pending Redemption</h3>
            <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
              Customers who have achieved the required delivered orders and are eligible to claim their treat.
            </span>
          </div>
        </div>

        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact</th>
                <th>Reward Unlocked</th>
                <th>Completed Milestone</th>
                <th>Unlocked Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {unlockedList.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>
                    No unlocked rewards pending redemption right now.
                  </td>
                </tr>
              ) : (
                unlockedList.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.user_name}</td>
                    <td>
                      <div>{item.user_phone}</div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-light)' }}>{item.user_email}</span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--color-accent)' }}>
                      {item.reward_name || 'Signature Cookie Box'}
                    </td>
                    <td>
                      <span className="status-pill ready">
                        {item.completed_orders} / {item.required_orders} Orders
                      </span>
                    </td>
                    <td>
                      {item.unlocked_at ? new Date(item.unlocked_at).toLocaleDateString('en-GB') : 'Recently'}
                    </td>
                    <td>
                      <button
                        onClick={() => setSelectedMilestoneToRedeem(item)}
                        className="admin-action-btn primary"
                        style={{ padding: '6px 14px', borderRadius: '4px' }}
                      >
                        <CheckCircle2 size={14} />
                        <span>Mark as Redeemed</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. HISTORICAL REDEMPTIONS LOG */}
      <div className="admin-table-card">
        <div className="admin-table-header">
          <div>
            <h3 style={{ fontSize: '1.25rem' }}>Previous Redemptions History</h3>
            <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
              Audit log of customer treats successfully claimed and processed.
            </span>
          </div>
        </div>

        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Reward Claimed</th>
                <th>Redeemed Date</th>
                <th>Authorizing Admin</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {redeemedHistory.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>
                    No past redemptions recorded yet.
                  </td>
                </tr>
              ) : (
                redeemedHistory.map((rh) => (
                  <tr key={rh.id}>
                    <td style={{ fontWeight: 600 }}>{rh.user_name}</td>
                    <td>{rh.reward_name}</td>
                    <td>{new Date(rh.redeemed_at).toLocaleDateString('en-GB')}</td>
                    <td>{rh.admin_name || 'Admin'}</td>
                    <td style={{ fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
                      {rh.notes || 'In-store pickup / with delivery'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. IMMUTABLE MILESTONE AUDIT LOGS */}
      <div className="admin-table-card">
        <div className="admin-table-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} color="var(--color-accent)" />
            <h3 style={{ fontSize: '1.25rem' }}>Milestone Event & Reversal Audit Trail</h3>
          </div>
        </div>

        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Order #</th>
                <th>Customer</th>
                <th>Transition</th>
                <th>Reason / Trigger</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)' }}>
                    No milestone audit logs recorded yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      {new Date(log.created_at).toLocaleString('en-GB')}
                    </td>
                    <td>
                      <span className={`status-pill ${log.action_type === 'AUTO_CREDIT' ? 'delivered' : 'cancelled'}`}>
                        {log.action_type}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{log.order_number || 'N/A'}</td>
                    <td>{log.customer_name}</td>
                    <td style={{ fontWeight: 600 }}>
                      {log.previous_completed_orders} &rarr; {log.new_completed_orders}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                      {log.reason}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mark As Redeemed Confirmation Modal */}
      {selectedMilestoneToRedeem && (
        <div className="modal-overlay" onClick={() => setSelectedMilestoneToRedeem(null)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '460px', padding: '32px' }}
          >
            <h3 style={{ fontSize: '1.4rem', marginBottom: '12px' }}>Confirm Reward Redemption</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
              Redeeming <strong>{selectedMilestoneToRedeem.reward_name}</strong> for <strong>{selectedMilestoneToRedeem.user_name}</strong>.
              Upon confirmation, this milestone will be marked as redeemed and a <strong>fresh 0 / {rewardConfig?.required_orders || 10} cycle</strong> will immediately begin for this customer.
            </p>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Staff Notes (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Handed over signature cookie box at counter"
                className="form-input"
                value={redemptionNotes}
                onChange={(e) => setRedemptionNotes(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedMilestoneToRedeem(null)}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRedeemSubmit}
                disabled={redeeming}
                className="btn btn-primary btn-sm"
              >
                {redeeming ? 'Redeeming...' : 'Confirm Redemption'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
