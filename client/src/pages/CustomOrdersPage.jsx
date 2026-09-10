import React, { useState } from 'react';
import { Cake, Phone, Mail, User, Calendar, Users, CheckCircle, Send } from 'lucide-react';
import { api } from '../api/api';
import { useToast } from '../context/ToastContext';

export default function CustomOrdersPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    preferred_date: '',
    servings_quantity: '',
    cake_flavour: '',
    cake_theme: '',
    description: '',
  });

  const [submittedEnquiry, setSubmittedEnquiry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { addToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.submitEnquiry({
        ...formData,
        event_type: 'CUSTOM_CAKE',
      });
      setSubmittedEnquiry(res.enquiry);
      addToast("Your custom cake request has been received. We'll contact you soon!", 'success');
      window.scrollTo({ top: 50, behavior: 'smooth' });
    } catch (err) {
      setError(err.message || 'Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submittedEnquiry) {
    return (
      <div className="section-spacing" style={{ paddingTop: 'clamp(24px, 5vw, 40px)', width: '100%', boxSizing: 'border-box' }}>
        <div className="container" style={{ maxWidth: '580px', padding: '0 16px', boxSizing: 'border-box' }}>
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid var(--color-border)',
              borderRadius: '20px',
              padding: 'clamp(32px, 6vw, 48px) clamp(20px, 4vw, 36px)',
              textAlign: 'center',
              boxShadow: 'var(--shadow-md)',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--color-surface-warm)',
                color: 'var(--color-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px auto',
              }}
            >
              <CheckCircle size={32} />
            </div>

            <span className="section-eyebrow" style={{ marginBottom: '6px' }}>Request Received</span>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '14px', lineHeight: 1.25 }}>
              Thank You!
            </h2>

            <div
              style={{
                background: 'var(--color-surface-warm)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px',
                display: 'inline-block',
                border: '1px solid var(--color-border)',
                width: '100%',
                maxWidth: '320px',
                boxSizing: 'border-box',
              }}
            >
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-light)', display: 'block', marginBottom: '4px' }}>
                Reference Number
              </span>
              <strong style={{ fontSize: '1.25rem', fontFamily: 'monospace', color: 'var(--color-primary)' }}>
                {submittedEnquiry.enquiry_number}
              </strong>
            </div>

            <p style={{ fontSize: '1rem', color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: '28px' }}>
              We'll contact you soon to discuss your cake.
            </p>

            <button
              onClick={() => {
                setSubmittedEnquiry(null);
                setFormData({
                  name: '',
                  email: '',
                  phone: '',
                  preferred_date: '',
                  servings_quantity: '',
                  cake_flavour: '',
                  cake_theme: '',
                  description: '',
                });
              }}
              className="btn btn-secondary"
              style={{ minHeight: '44px', padding: '10px 24px', width: '100%', maxWidth: '280px' }}
            >
              Submit Another Request
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="section-spacing" style={{ paddingTop: 'clamp(24px, 5vw, 40px)', width: '100%', boxSizing: 'border-box' }}>
      <div className="container" style={{ maxWidth: '720px', padding: '0 16px', boxSizing: 'border-box' }}>
        {/* Header */}
        <div className="section-header" style={{ marginBottom: '32px' }}>
          <span className="section-eyebrow">Custom Cakes</span>
          <h1 className="section-title">Custom Cakes</h1>
          <p className="section-subtitle">
            Have a cake idea in mind? Tell us what you need and we'll get back to you with the details.
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '14px 18px',
              background: '#FFF5F5',
              border: '1px solid #FEB2B2',
              color: '#C53030',
              borderRadius: '8px',
              marginBottom: '24px',
              fontSize: '0.9rem',
            }}
          >
            {error}
          </div>
        )}

        {/* Custom Cake Form (1 field per row on mobile) */}
        <form
          onSubmit={handleSubmit}
          style={{
            background: '#FFFFFF',
            border: '1px solid var(--color-border)',
            borderRadius: '20px',
            padding: 'clamp(24px, 5vw, 40px)',
            boxShadow: 'var(--shadow-sm)',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
            {/* Customer Name */}
            <div>
              <label className="form-label" htmlFor="custom-cake-name">
                Your Name <span style={{ color: 'var(--color-accent)' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="custom-cake-name"
                  type="text"
                  required
                  placeholder="e.g. Priya Sharma"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="form-input"
                  style={{ width: '100%', paddingLeft: '40px', minHeight: '46px', fontSize: '16px', boxSizing: 'border-box' }}
                />
                <User size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--color-text-light)' }} />
              </div>
            </div>

            {/* Contact Details Grid (Stacks on mobile) */}
            <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '16px' }}>
              <div>
                <label className="form-label" htmlFor="custom-cake-phone">
                  Phone / WhatsApp <span style={{ color: 'var(--color-accent)' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="custom-cake-phone"
                    type="tel"
                    required
                    placeholder="e.g. 98200 54321"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="form-input"
                    style={{ width: '100%', paddingLeft: '40px', minHeight: '46px', fontSize: '16px', boxSizing: 'border-box' }}
                  />
                  <Phone size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--color-text-light)' }} />
                </div>
              </div>

              <div>
                <label className="form-label" htmlFor="custom-cake-email">
                  Email Address <span style={{ color: 'var(--color-accent)' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="custom-cake-email"
                    type="email"
                    required
                    placeholder="e.g. priya@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="form-input"
                    style={{ width: '100%', paddingLeft: '40px', minHeight: '46px', fontSize: '16px', boxSizing: 'border-box' }}
                  />
                  <Mail size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--color-text-light)' }} />
                </div>
              </div>
            </div>

            {/* Date and Servings */}
            <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '16px' }}>
              <div>
                <label className="form-label" htmlFor="custom-cake-date">
                  Cake Date <span style={{ color: 'var(--color-accent)' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="custom-cake-date"
                    type="date"
                    required
                    value={formData.preferred_date}
                    onChange={(e) => setFormData({ ...formData, preferred_date: e.target.value })}
                    className="form-input"
                    style={{ width: '100%', paddingLeft: '40px', minHeight: '46px', fontSize: '16px', boxSizing: 'border-box' }}
                  />
                  <Calendar size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--color-text-light)' }} />
                </div>
              </div>

              <div>
                <label className="form-label" htmlFor="custom-cake-servings">
                  Number of People / Size
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="custom-cake-servings"
                    type="text"
                    placeholder="e.g. 1 kg / 8-10 people"
                    value={formData.servings_quantity}
                    onChange={(e) => setFormData({ ...formData, servings_quantity: e.target.value })}
                    className="form-input"
                    style={{ width: '100%', paddingLeft: '40px', minHeight: '46px', fontSize: '16px', boxSizing: 'border-box' }}
                  />
                  <Users size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--color-text-light)' }} />
                </div>
              </div>
            </div>

            {/* Flavour and Theme */}
            <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '16px' }}>
              <div>
                <label className="form-label" htmlFor="custom-cake-flavour">
                  Cake Flavour
                </label>
                <input
                  id="custom-cake-flavour"
                  type="text"
                  placeholder="e.g. Chocolate Truffle, Vanilla Berry"
                  value={formData.cake_flavour}
                  onChange={(e) => setFormData({ ...formData, cake_flavour: e.target.value })}
                  className="form-input"
                  style={{ width: '100%', minHeight: '46px', fontSize: '16px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label className="form-label" htmlFor="custom-cake-theme">
                  Cake Theme / Design
                </label>
                <input
                  id="custom-cake-theme"
                  type="text"
                  placeholder="e.g. Floral, Minimal Vintage, Superhero"
                  value={formData.cake_theme}
                  onChange={(e) => setFormData({ ...formData, cake_theme: e.target.value })}
                  className="form-input"
                  style={{ width: '100%', minHeight: '46px', fontSize: '16px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Additional Details */}
            <div>
              <label className="form-label" htmlFor="custom-cake-description">
                Additional Details <span style={{ color: 'var(--color-accent)' }}>*</span>
              </label>
              <textarea
                id="custom-cake-description"
                required
                rows={4}
                placeholder="Tell us what you have in mind (eggless requirements, color palette, custom message, etc.)..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="form-input"
                style={{ width: '100%', padding: '12px 14px', fontSize: '16px', lineHeight: 1.5, boxSizing: 'border-box' }}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg"
              style={{
                width: '100%',
                minHeight: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                borderRadius: 'var(--radius-full)',
                marginTop: '8px',
              }}
            >
              <Send size={18} />
              <span>{loading ? 'Submitting...' : 'Submit Custom Cake Request'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
