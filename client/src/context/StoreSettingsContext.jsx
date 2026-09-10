import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/api';
import { BRAND_CONFIG } from '../config/brand';

const StoreSettingsContext = createContext(null);

export const StoreSettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    brand_name: BRAND_CONFIG.name,
    brand_tagline: BRAND_CONFIG.tagline,
    contact_email: BRAND_CONFIG.email,
    contact_phone: BRAND_CONFIG.phone,
    boutique_address: BRAND_CONFIG.boutiqueAddress,
    business_hours: BRAND_CONFIG.hours,
    instagram_handle: BRAND_CONFIG.instagram,
    currency_symbol: BRAND_CONFIG.currency,
    pickup_enabled: BRAND_CONFIG.pickupAvailable ? 1 : 0,
    default_delivery_fee: BRAND_CONFIG.defaultDeliveryFee,
    hero_heading: null,
    hero_subtitle: null,
    hero_image_url: null,
    about_story: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getSettings();
      const s = res.settings || res;
      if (s && typeof s === 'object') {
        setSettings((prev) => ({
          ...prev,
          ...s,
        }));
      }
      setError(null);
    } catch (err) {
      console.warn('Could not load dynamic store settings from server, using fallback display values:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return (
    <StoreSettingsContext.Provider
      value={{
        settings,
        loading,
        error,
        refreshSettings: fetchSettings,
      }}
    >
      {children}
    </StoreSettingsContext.Provider>
  );
};

export const useStoreSettings = () => {
  const context = useContext(StoreSettingsContext);
  if (!context) {
    throw new Error('useStoreSettings must be used within a StoreSettingsProvider');
  }
  return context;
};
