import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle2, ShieldCheck, User, Phone, MapPin, ArrowLeft } from 'lucide-react';
import { BRAND_CONFIG } from '../config/brand';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { api } from '../api/api';

export default function AuthModal({ isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState('sign_in'); // 'sign_in' | 'complete_profile'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');
  const [devMockAllowed, setDevMockAllowed] = useState(false);

  // Profile completion state for new customers
  const [tempRegistration, setTempRegistration] = useState(null);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [defaultAddress, setDefaultAddress] = useState('');

  const googleBtnRef = useRef(null);
  const { loginWithGoogle, completeGoogleProfile } = useAuth();
  const { addToast } = useToast();
  const { settings } = useStoreSettings();

  const brandName = settings?.brand_name || BRAND_CONFIG.name;

  // Reset state on modal open & fetch server Google configuration
  useEffect(() => {
    if (isOpen) {
      setStep('sign_in');
      setError('');
      setLoading(false);
      setTempRegistration(null);
      setFullName('');
      setPhoneNumber('');
      setDefaultAddress('');

      api.getGoogleConfig()
        .then((cfg) => {
          if (cfg.clientId) setGoogleClientId(cfg.clientId);
          if (cfg.devMockAllowed !== undefined) setDevMockAllowed(cfg.devMockAllowed);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const isRealGoogleConfigured = Boolean(
    googleClientId &&
    googleClientId.trim() !== '' &&
    googleClientId !== 'your_google_client_id_here' &&
    !googleClientId.includes('your_google_client_id')
  );

  // Initialize official Google Identity Services (GIS) button when Client ID is configured
  useEffect(() => {
    if (!isOpen || step !== 'sign_in' || !isRealGoogleConfigured) return;

    const initGoogleGsi = () => {
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          if (googleBtnRef.current) {
            googleBtnRef.current.innerHTML = '';
            window.google.accounts.id.renderButton(googleBtnRef.current, {
              theme: 'outline',
              size: 'large',
              type: 'standard',
              text: 'continue_with',
              shape: 'rectangular',
              logo_alignment: 'left',
              width: 320,
            });
          }
        } catch (err) {
          console.error('Google Identity Services initialization error:', err);
        }
      }
    };

    if (window.google?.accounts?.id) {
      initGoogleGsi();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          initGoogleGsi();
        }
      }, 300);
      return () => clearInterval(interval);
    }
  }, [isOpen, step, isRealGoogleConfigured, googleClientId]);

  // Handle Google OpenID Connect Credential Response
  const handleGoogleCredentialResponse = async (response) => {
    if (!response || !response.credential) {
      setError('No credential received from Google. Please try again.');
      return;
    }
    await processGoogleToken(response.credential);
  };

  const processGoogleToken = async (idToken) => {
    setError('');
    setLoading(true);

    try {
      const res = await loginWithGoogle(idToken);
      if (res.isNewCustomer) {
        // Step 2: Show profile completion modal
        setTempRegistration(res);
        setFullName(res.googleProfile?.name || '');
        setStep('complete_profile');
      } else {
        // Returning Customer
        addToast(res.message || `Welcome back to ${brandName}, ${res.user.name}!`, 'success');
        onClose();
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      setError(err.message || 'Google authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Profile completion submission
  const handleCompleteProfileSubmit = async (e) => {
    e.preventDefault();
    if (!tempRegistration || !tempRegistration.tempToken) {
      setError('Registration session expired. Please sign in with Google again.');
      setStep('sign_in');
      return;
    }

    if (!fullName || fullName.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }

    const cleanPhone = phoneNumber.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      setError('Please enter a valid 10-digit Indian mobile number (e.g. 9820012345).');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await completeGoogleProfile({
        tempToken: tempRegistration.tempToken,
        name: fullName.trim(),
        phone: cleanPhone,
        default_address: defaultAddress.trim() || null,
      });

      addToast(res.message || `Welcome to ${brandName}, ${res.user.name}!`, 'success');
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to complete profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Instant demo Google account login (available in development mode when real client ID is absent)
  const handleDevGoogleLogin = async () => {
    const randomSub = 'mock_google_sub_' + Math.floor(100000 + Math.random() * 900000);
    const token = `mock-dev-token:${randomSub}:guest@customer.patisserie:Pâtisserie Gourmet Guest:`;
    await processGoogleToken(token);
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(24, 18, 14, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        className="animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '38px 32px',
          background: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 25px 65px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.08)',
          color: 'var(--color-text-main)',
          position: 'relative',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Close"
        >
          <X size={20} />
        </button>

        {step === 'sign_in' ? (
          <>
            {/* Brand Header */}
            <div style={{ textAlign: 'center', marginBottom: '26px' }}>
              <span className="gold-tag" style={{ marginBottom: '8px', display: 'inline-block' }}>
                Customer Sign In
              </span>
              <h3 style={{ fontSize: '1.7rem', marginBottom: '8px', fontFamily: 'var(--font-serif)', color: 'var(--color-primary)' }}>
                Welcome to {brandName}
              </h3>
              <p style={{ fontSize: '0.86rem', color: 'var(--color-text-muted)', lineHeight: 1.5, margin: 0 }}>
                Sign in securely with your Google account to track your orders and earn rewards.
              </p>
            </div>

            {error && (
              <div
                style={{
                  padding: '11px 14px',
                  background: '#FFF5F5',
                  border: '1px solid #FEB2B2',
                  color: '#C53030',
                  fontSize: '0.84rem',
                  borderRadius: '8px',
                  marginBottom: '18px',
                  lineHeight: 1.4,
                }}
              >
                {error}
              </div>
            )}

            {/* GOOGLE SIGN-IN SECTION - EXACTLY ONE BUTTON SHOWN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center', minHeight: '52px', justifyContent: 'center' }}>
              {isRealGoogleConfigured ? (
                /* Option A: Official Google Identity Services Button */
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    width: '100%',
                    minHeight: '44px',
                  }}
                >
                  <div ref={googleBtnRef}></div>
                </div>
              ) : (
                /* Option B: Fallback / Dev Mode Button (Shown ONLY when real Client ID is not configured) */
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleDevGoogleLogin}
                  className="btn"
                  style={{
                    width: '100%',
                    padding: '13px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    background: '#FFFFFF',
                    border: '1px solid #DADCE0',
                    borderRadius: '8px',
                    color: '#3C4043',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>{loading ? 'Signing in...' : 'Continue with Google'}</span>
                </button>
              )}
            </div>

            {/* Benefits Footnote */}
            <div
              style={{
                marginTop: '26px',
                paddingTop: '18px',
                borderTop: '1px solid var(--color-border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '0.8rem',
                color: 'var(--color-text-muted)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={15} color="var(--color-gold)" style={{ flexShrink: 0 }} />
                <span>Earn 1 complimentary artisanal pastry for every 10 orders</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={15} color="var(--color-gold)" style={{ flexShrink: 0 }} />
                <span>Fast, passwordless login protected by Google OpenID Connect</span>
              </div>
            </div>
          </>
        ) : (
          /* STEP 2: PROFILE COMPLETION MODAL */
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <button
                type="button"
                onClick={() => { setStep('sign_in'); setError(''); }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: 'var(--color-text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Back to Sign In"
              >
                <ArrowLeft size={18} />
              </button>
              <span className="gold-tag">Step 2 of 2</span>
            </div>

            <h3 style={{ fontSize: '1.5rem', marginBottom: '6px', fontFamily: 'var(--font-serif)', color: 'var(--color-primary)' }}>
              Complete Your Profile
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '18px', lineHeight: 1.5 }}>
              Link your mobile number for order updates and to start earning rewards.
            </p>

            {/* Verified Google Account Badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '10px',
                marginBottom: '18px',
              }}
            >
              {tempRegistration?.googleProfile?.picture ? (
                <img
                  src={tempRegistration.googleProfile.picture}
                  alt="Google Avatar"
                  style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: 'var(--color-gold)',
                    color: '#FFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                  }}
                >
                  <User size={18} />
                </div>
              )}
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {tempRegistration?.googleProfile?.email}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Verified Google Account
                </div>
              </div>
            </div>

            {error && (
              <div
                style={{
                  padding: '11px 14px',
                  background: '#FFF5F5',
                  border: '1px solid #FEB2B2',
                  color: '#C53030',
                  fontSize: '0.84rem',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  lineHeight: 1.4,
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleCompleteProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-main)' }}>
                  Full Name *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your name"
                    className="form-input"
                    style={{ width: '100%', paddingLeft: '36px', height: '42px' }}
                  />
                  <User size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--color-text-light)' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-main)' }}>
                  Mobile Number (India) *
                </label>
                <div style={{ position: 'relative', display: 'flex' }}>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 10px',
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRight: 'none',
                      borderRadius: '8px 0 0 8px',
                      fontSize: '0.86rem',
                      color: 'var(--color-text-muted)',
                      fontWeight: 600,
                    }}
                  >
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="98200 12345"
                    className="form-input"
                    style={{ flexGrow: 1, borderRadius: '0 8px 8px 0', height: '42px' }}
                  />
                </div>
                <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: '4px', display: 'block' }}>
                  Required for delivery tracking and artisan order confirmation.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-main)' }}>
                  Default Delivery Address <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>(Optional)</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={defaultAddress}
                    onChange={(e) => setDefaultAddress(e.target.value)}
                    placeholder="e.g. 12 Rue de Rivoli, Bandra West"
                    className="form-input"
                    style={{ width: '100%', paddingLeft: '36px', height: '42px' }}
                  />
                  <MapPin size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--color-text-light)' }} />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px', marginTop: '6px' }}
              >
                {loading ? 'Creating Profile...' : 'Complete Profile & Join'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
