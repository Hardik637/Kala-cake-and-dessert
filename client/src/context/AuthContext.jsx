import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Customer State (Google Authentication)
  const [customerToken, setCustomerToken] = useState(() => localStorage.getItem('patisserie_customer_token'));
  const [customerUser, setCustomerUser] = useState(() => {
    try {
      const saved = localStorage.getItem('patisserie_customer_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [customerMilestone, setCustomerMilestone] = useState(null);

  // Admin State (Single Owner)
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('patisserie_admin_token'));
  const [adminUser, setAdminUser] = useState(() => {
    try {
      const saved = localStorage.getItem('patisserie_admin_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);

  // Verify owner admin token on mount or token change
  useEffect(() => {
    if (adminToken) {
      api.verifyAdmin(adminToken)
        .then((res) => {
          setAdminUser(res.admin);
          localStorage.setItem('patisserie_admin_user', JSON.stringify(res.admin));
        })
        .catch(() => {
          logoutAdmin();
        });
    }
  }, [adminToken]);

  // Listen for admin unauthorized events to prompt clean re-login
  useEffect(() => {
    const handleUnauthorized = () => {
      logoutAdmin();
    };
    window.addEventListener('patisserie_admin_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('patisserie_admin_unauthorized', handleUnauthorized);
  }, []);

  // Load customer profile and milestone on mount or token change
  useEffect(() => {
    if (customerToken) {
      api.getProfile(customerToken)
        .then((res) => {
          setCustomerUser(res.user);
          setCustomerMilestone(res.milestone);
          localStorage.setItem('patisserie_customer_user', JSON.stringify(res.user));
        })
        .catch(() => {
          logoutCustomer();
        });
    }
  }, [customerToken]);

  // Customer: Login / Authenticate with Google ID Token
  const loginWithGoogle = async (idToken) => {
    setLoading(true);
    try {
      const res = await api.googleAuth(idToken);
      if (!res.isNewCustomer && res.token) {
        setCustomerToken(res.token);
        setCustomerUser(res.user);
        if (res.milestone) {
          setCustomerMilestone(res.milestone);
        }
        localStorage.setItem('patisserie_customer_token', res.token);
        localStorage.setItem('patisserie_customer_user', JSON.stringify(res.user));
      }
      return res;
    } finally {
      setLoading(false);
    }
  };

  // Customer: Complete First-Time Profile with Name & Phone
  const completeGoogleProfile = async (profileData) => {
    setLoading(true);
    try {
      const res = await api.completeGoogleProfile(profileData);
      if (res.token) {
        setCustomerToken(res.token);
        setCustomerUser(res.user);
        if (res.milestone) {
          setCustomerMilestone(res.milestone);
        }
        localStorage.setItem('patisserie_customer_token', res.token);
        localStorage.setItem('patisserie_customer_user', JSON.stringify(res.user));
      }
      return res;
    } finally {
      setLoading(false);
    }
  };

  const setCustomerSession = (user, token, milestone = null) => {
    if (token) {
      setCustomerToken(token);
      localStorage.setItem('patisserie_customer_token', token);
    }
    if (user) {
      setCustomerUser(user);
      localStorage.setItem('patisserie_customer_user', JSON.stringify(user));
    }
    if (milestone) {
      setCustomerMilestone(milestone);
    }
  };

  const logoutCustomer = () => {
    setCustomerToken(null);
    setCustomerUser(null);
    setCustomerMilestone(null);
    localStorage.removeItem('patisserie_customer_token');
    localStorage.removeItem('patisserie_customer_user');
  };

  const refreshCustomerProfile = async () => {
    if (!customerToken) return;
    try {
      const res = await api.getProfile(customerToken);
      setCustomerUser(res.user);
      setCustomerMilestone(res.milestone);
      localStorage.setItem('patisserie_customer_user', JSON.stringify(res.user));
    } catch (err) {
      console.error('Failed to refresh profile:', err);
    }
  };

  // Admin Actions (Strictly Username + Password for Single Owner)
  const loginAdmin = async (username, password) => {
    setLoading(true);
    try {
      const res = await api.adminLogin({ username, password });
      setAdminToken(res.token);
      setAdminUser(res.admin);
      localStorage.setItem('patisserie_admin_token', res.token);
      localStorage.setItem('patisserie_admin_user', JSON.stringify(res.admin));
      return res;
    } finally {
      setLoading(false);
    }
  };

  const updateAdminCredentials = async (credentials) => {
    if (!adminToken) throw new Error('Owner authorization required.');
    const res = await api.updateAdminCredentials(credentials, adminToken);
    if (res.admin) {
      setAdminUser(res.admin);
      localStorage.setItem('patisserie_admin_user', JSON.stringify(res.admin));
    }
    return res;
  };

  const logoutAdmin = () => {
    setAdminToken(null);
    setAdminUser(null);
    localStorage.removeItem('patisserie_admin_token');
    localStorage.removeItem('patisserie_admin_user');
  };

  return (
    <AuthContext.Provider value={{
      customerToken,
      customerUser,
      customerMilestone,
      isCustomerAuthenticated: !!customerToken,
      loginWithGoogle,
      completeGoogleProfile,
      setCustomerSession,
      logoutCustomer,
      refreshCustomerProfile,

      adminToken,
      adminUser,
      isAdminAuthenticated: !!adminToken,
      loginAdmin,
      updateAdminCredentials,
      logoutAdmin,

      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
