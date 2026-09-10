import React, { useState } from 'react';
import { Shield, Lock, User, ArrowRight, ArrowLeft } from 'lucide-react';
import { BRAND_CONFIG } from '../../config/brand';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function AdminLoginPage({ onBackToWebsite, onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { loginAdmin } = useAuth();
  const { addToast } = useToast();

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await loginAdmin(username.trim(), password);
      addToast(`Welcome to management console, ${res.admin.name || res.admin.username}!`, 'success');
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (err) {
      setError(err.message || 'Invalid owner credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#18120F',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          background: '#221A16',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '40px 36px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          color: '#EDE6DD',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(197, 160, 89, 0.15)',
              color: 'var(--color-gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              border: '1px solid rgba(197, 160, 89, 0.3)',
            }}
          >
            <Shield size={28} />
          </div>
          <span
            style={{
              fontSize: '0.72rem',
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              color: 'var(--color-gold)',
              fontWeight: 600,
              display: 'block',
              marginBottom: '4px',
            }}
          >
            {BRAND_CONFIG.name}
          </span>
          <h2 style={{ fontSize: '1.8rem', color: '#FFFFFF', fontFamily: 'var(--font-serif)', margin: '4px 0' }}>
            Boutique Owner Portal
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#A89C91', marginTop: '4px' }}>
            Restricted management console for boutique administrator.
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '12px 14px',
              background: 'rgba(155, 44, 44, 0.25)',
              border: '1px solid #9B2C2C',
              color: '#FEB2B2',
              fontSize: '0.85rem',
              borderRadius: '6px',
              marginBottom: '20px',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleAdminSubmit}>
          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label className="form-label" style={{ color: '#EDE6DD', fontSize: '0.82rem' }}>
              Owner Username or Email
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                required
                placeholder="owner"
                className="form-input"
                style={{
                  width: '100%',
                  paddingLeft: '38px',
                  background: '#1C1512',
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                  color: '#FFFFFF',
                }}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <User size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: '#8A7E74' }} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label" style={{ color: '#EDE6DD', fontSize: '0.82rem' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                className="form-input"
                style={{
                  width: '100%',
                  paddingLeft: '38px',
                  background: '#1C1512',
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                  color: '#FFFFFF',
                }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: '#8A7E74' }} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '14px',
              background: 'var(--color-accent)',
              borderColor: 'var(--color-accent)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '0.92rem',
              fontWeight: 600,
            }}
          >
            <span>{loading ? 'Verifying Credentials...' : 'Sign In to Management Console'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
          <button
            type="button"
            onClick={onBackToWebsite}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '0.82rem',
              color: '#A89C91',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ArrowLeft size={14} />
            <span>Return to Boutique Website</span>
          </button>
        </div>
      </div>
    </div>
  );
}
