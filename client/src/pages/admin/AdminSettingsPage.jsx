import React, { useState, useEffect } from 'react';
import { KeyRound, Shield, Store, Save, Lock, User, CheckCircle2, AlertCircle, Sparkles, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../api/api';

export default function AdminSettingsPage() {
  const { adminUser, updateAdminCredentials, adminToken } = useAuth();
  const { addToast } = useToast();

  // Credentials State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [credError, setCredError] = useState('');
  const [credSuccess, setCredSuccess] = useState('');
  const [credLoading, setCredLoading] = useState(false);

  // Store Settings State (Canonical Schema)
  const [settings, setSettings] = useState({
    brand_name: '',
    brand_tagline: '',
    contact_email: '',
    contact_phone: '',
    boutique_address: '',
    business_hours: '',
    instagram_handle: '',
    pickup_enabled: 1,
    default_delivery_fee: 50.00,
    hero_heading: '',
    hero_subtitle: '',
    hero_image_url: '',
    about_story: '',
  });
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await api.getSettings();
      if (res.settings) {
        setSettings({
          brand_name: res.settings.brand_name || '',
          brand_tagline: res.settings.brand_tagline || '',
          contact_email: res.settings.contact_email || '',
          contact_phone: res.settings.contact_phone || '',
          boutique_address: res.settings.boutique_address || '',
          business_hours: res.settings.business_hours || '',
          instagram_handle: res.settings.instagram_handle || '',
          pickup_enabled: res.settings.pickup_enabled !== undefined ? res.settings.pickup_enabled : 1,
          default_delivery_fee: res.settings.default_delivery_fee !== undefined ? res.settings.default_delivery_fee : 50.00,
          hero_heading: res.settings.hero_heading || '',
          hero_subtitle: res.settings.hero_subtitle || '',
          hero_image_url: res.settings.hero_image_url || '',
          about_story: res.settings.about_story || '',
        });
      }
    } catch (err) {
      console.error('Failed to load store settings:', err);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleUpdateCredentials = async (e) => {
    e.preventDefault();
    setCredError('');
    setCredSuccess('');

    if (!currentPassword) {
      setCredError('Current password is required to make changes.');
      return;
    }

    if (!newUsername && !newPassword) {
      setCredError('Please provide a new username or new password to update.');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setCredError('New password and confirmation do not match.');
      return;
    }

    // Minimum password length 12+ characters per Requirement 3
    if (newPassword && newPassword.length < 12) {
      setCredError('New password must be at least 12 characters long.');
      return;
    }

    setCredLoading(true);
    try {
      await updateAdminCredentials({
        current_password: currentPassword,
        new_username: newUsername.trim() || undefined,
        new_password: newPassword || undefined,
      });

      setCredSuccess('Owner credentials updated successfully. Previous sessions have been invalidated.');
      addToast('Owner credentials updated successfully.', 'success');
      setCurrentPassword('');
      setNewUsername('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setCredError(err.message || 'Failed to update credentials. Check your current password.');
    } finally {
      setCredLoading(false);
    }
  };

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    setSettingsSaving(true);
    try {
      await api.updateSettings(settings, adminToken);
      addToast('Store settings and content updated successfully.', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to update store settings.', 'error');
    } finally {
      setSettingsSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '920px', margin: '0 auto', paddingBottom: '50px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.8rem', fontFamily: 'var(--font-serif)', color: 'var(--color-text-main)', marginBottom: '6px' }}>
          Owner Settings & Configuration
        </h1>
        <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>
          Manage your owner account credentials, boutique operating parameters, and dynamic boutique content.
        </p>
      </div>

      {/* SECTION 1: OWNER ACCOUNT CREDENTIALS (SINGLE OWNER SECURITY) */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '28px',
          marginBottom: '32px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              background: 'rgba(197, 160, 89, 0.15)',
              color: 'var(--color-gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <KeyRound size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--color-text-main)', margin: 0 }}>
              Owner Account Credentials
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Current Username: <strong>{adminUser?.username || 'owner'}</strong> (Single Owner Account: admins/owner)
            </span>
          </div>
        </div>

        {credError && (
          <div
            style={{
              padding: '11px 14px',
              background: '#FFF5F5',
              border: '1px solid #FEB2B2',
              color: '#C53030',
              fontSize: '0.84rem',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} />
            <span>{credError}</span>
          </div>
        )}

        {credSuccess && (
          <div
            style={{
              padding: '11px 14px',
              background: '#F0FFF4',
              border: '1px solid #9AE6B4',
              color: '#276749',
              fontSize: '0.84rem',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle2 size={16} />
            <span>{credSuccess}</span>
          </div>
        )}

        <form onSubmit={handleUpdateCredentials}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div className="form-group">
              <label className="form-label">
                <span>New Username (Optional)</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="e.g. owner"
                  className="form-input"
                  style={{ paddingLeft: '36px' }}
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                />
                <User size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>New Password (Min 12 chars)</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  placeholder="Min 12 characters"
                  className="form-input"
                  style={{ paddingLeft: '36px' }}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <Lock size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                <span>Confirm New Password</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  placeholder="Repeat new password"
                  className="form-input"
                  style={{ paddingLeft: '36px' }}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={!newPassword}
                />
                <Lock size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '16px',
              background: 'var(--color-surface-warm)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '20px',
            }}
          >
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontWeight: 600 }}>
                <span>Current Password</span>
                <span style={{ color: 'var(--color-accent)', marginLeft: '4px' }}>*</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: '6px' }}>
                  (Required to authorize changes to the owner account)
                </span>
              </label>
              <div style={{ position: 'relative', maxWidth: '340px' }}>
                <input
                  type="password"
                  required
                  placeholder="Enter current owner password"
                  className="form-input"
                  style={{ paddingLeft: '36px' }}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <Lock size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={credLoading}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Shield size={16} />
            <span>{credLoading ? 'Verifying & Updating...' : 'Save Credential Changes'}</span>
          </button>
        </form>
      </div>

      {/* SECTION 2: BOUTIQUE STORE OPERATING PARAMETERS & DYNAMIC CONTENT */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: '28px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              background: 'rgba(184, 107, 83, 0.15)',
              color: 'var(--color-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Store size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--color-text-main)', margin: 0 }}>
              Boutique Store Configuration
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Brand details, boutique address, contact info, and fulfillment parameters.
            </span>
          </div>
        </div>

        {settingsLoading ? (
          <div>Loading store configuration...</div>
        ) : (
          <form onSubmit={handleUpdateSettings}>
            <h4 style={{ fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-accent)', marginBottom: '14px' }}>
              Brand & Contact Details
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group">
                <label className="form-label">Brand Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={settings.brand_name || ''}
                  onChange={(e) => setSettings({ ...settings, brand_name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Brand Tagline</label>
                <input
                  type="text"
                  className="form-input"
                  value={settings.brand_tagline || ''}
                  onChange={(e) => setSettings({ ...settings, brand_tagline: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contact Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={settings.contact_email || ''}
                  onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contact Phone</label>
                <input
                  type="text"
                  className="form-input"
                  value={settings.contact_phone || ''}
                  onChange={(e) => setSettings({ ...settings, contact_phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Business Hours</label>
                <input
                  type="text"
                  placeholder="e.g. Tue - Sun: 9:00 AM - 10:00 PM"
                  className="form-input"
                  value={settings.business_hours || ''}
                  onChange={(e) => setSettings({ ...settings, business_hours: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Instagram Handle</label>
                <input
                  type="text"
                  placeholder="e.g. @instagram_handle"
                  className="form-input"
                  value={settings.instagram_handle || ''}
                  onChange={(e) => setSettings({ ...settings, instagram_handle: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Default Delivery Fee (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  className="form-input"
                  value={settings.default_delivery_fee || 50}
                  onChange={(e) => setSettings({ ...settings, default_delivery_fee: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Boutique Pickup</label>
                <select
                  className="form-input"
                  value={settings.pickup_enabled ? 1 : 0}
                  onChange={(e) => setSettings({ ...settings, pickup_enabled: parseInt(e.target.value, 10) })}
                >
                  <option value={1}>Enabled (Customers can choose pickup)</option>
                  <option value={0}>Disabled (Delivery only)</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label">Bakery Address</label>
              <textarea
                className="form-textarea"
                rows={2}
                value={settings.boutique_address || ''}
                onChange={(e) => setSettings({ ...settings, boutique_address: e.target.value })}
              />
            </div>

            <h4 style={{ fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-accent)', marginBottom: '14px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
              Homepage Hero & Story Content (Owner CMS)
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group">
                <label className="form-label">Hero Main Heading</label>
                <input
                  type="text"
                  placeholder="e.g. Little moments, made sweeter."
                  className="form-input"
                  value={settings.hero_heading || ''}
                  onChange={(e) => setSettings({ ...settings, hero_heading: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Hero Image URL</label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/..."
                  className="form-input"
                  value={settings.hero_image_url || ''}
                  onChange={(e) => setSettings({ ...settings, hero_image_url: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Hero Subtitle</label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="Order fresh cakes, dessert tubs, brownies and cookies online..."
                value={settings.hero_subtitle || ''}
                onChange={(e) => setSettings({ ...settings, hero_subtitle: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label">About Story Content</label>
              <textarea
                className="form-textarea"
                rows={4}
                placeholder="Our story..."
                value={settings.about_story || ''}
                onChange={(e) => setSettings({ ...settings, about_story: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={settingsSaving}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Save size={16} />
              <span>{settingsSaving ? 'Saving Settings...' : 'Save Boutique Settings'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
