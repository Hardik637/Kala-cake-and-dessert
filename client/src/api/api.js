// Central API Client for Maison Pâtisserie

const BASE_URL = '/api';

async function apiFetch(endpoint, options = {}) {
  const { token, ...customConfig } = options;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...customConfig.headers,
  };

  const config = {
    ...customConfig,
    headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && (endpoint.startsWith('/admin') || (options.method && options.method !== 'GET' && endpoint.startsWith('/products')))) {
      window.dispatchEvent(new CustomEvent('patisserie_admin_unauthorized'));
    }
    const errorMsg = data.error || `Error ${response.status}: ${response.statusText}`;
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Public & Customer Auth (Google OAuth Only)
  googleAuth: (idToken) => apiFetch('/auth/google', { method: 'POST', body: JSON.stringify({ idToken }) }),
  completeGoogleProfile: (body, tempToken) => apiFetch('/auth/google/complete-profile', { method: 'POST', body: JSON.stringify(body), token: tempToken }),
  getGoogleConfig: () => apiFetch('/auth/google/config'),
  getProfile: (token) => apiFetch('/auth/profile', { token }),
  updateProfile: (body, token) => apiFetch('/auth/profile', { method: 'PUT', body: JSON.stringify(body), token }),

  // Products & Menu
  getProducts: (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.category && params.category !== 'all' && params.category !== '1') {
      searchParams.append('category', params.category);
    }
    if (params.search) searchParams.append('search', params.search);
    if (params.featuredOnly) searchParams.append('featuredOnly', 'true');
    const qs = searchParams.toString();
    return apiFetch(`/products${qs ? `?${qs}` : ''}`);
  },
  getCategories: () => apiFetch('/products/categories'),
  getProduct: (id) => apiFetch(`/products/${id}`),

  // Orders
  placeOrder: (body, token) => apiFetch('/orders', { method: 'POST', body: JSON.stringify(body), token }),
  getMyOrders: (token) => apiFetch('/orders/my-orders', { token }),
  // Public tracking strictly by cryptographically random tracking token
  trackOrder: (trackingToken) => apiFetch(`/orders/track/${encodeURIComponent(trackingToken)}`),

  // Razorpay Online Payments (UPI & Cards)
  getRazorpayConfig: () => apiFetch('/orders/razorpay/config'),
  createRazorpayOrder: (body, token) => apiFetch('/orders/razorpay/create-order', { method: 'POST', body: JSON.stringify(body), token }),
  verifyRazorpayPayment: (body, token) => apiFetch('/orders/razorpay/verify-payment', { method: 'POST', body: JSON.stringify(body), token }),

  // Rewards (Authenticated Customer Only)
  getMyRewardStatus: (token) => apiFetch('/rewards/my-status', { token }),

  // Custom Enquiries
  submitEnquiry: (body) => apiFetch('/enquiries', { method: 'POST', body: JSON.stringify(body) }),

  // Settings
  getSettings: () => apiFetch('/settings'),

  // ADMIN ENDPOINTS (Single Owner Account: admins/owner)
  adminLogin: ({ username, password }) => apiFetch('/admin/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  verifyAdmin: (token) => apiFetch('/admin/verify', { token }),
  updateAdminCredentials: (body, token) => apiFetch('/admin/credentials', { method: 'PUT', body: JSON.stringify(body), token }),
  getMetrics: (token) => apiFetch('/admin/metrics', { token }),
  getAdminOrders: (params = {}, token) => {
    const searchParams = new URLSearchParams();
    if (params.status) searchParams.append('status', params.status);
    if (params.search) searchParams.append('search', params.search);
    const qs = searchParams.toString();
    return apiFetch(`/orders/admin/all${qs ? `?${qs}` : ''}`, { token });
  },
  getAdminOrderDetails: (id, token) => apiFetch(`/orders/admin/${id}`, { token }),
  updateOrderStatus: (id, status, token) => apiFetch(`/orders/admin/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }), token }),
  reverseMilestoneCredit: (id, reason, confirm, token) => apiFetch(`/orders/admin/${id}/reverse-milestone`, { method: 'POST', body: JSON.stringify({ reason, confirm }), token }),
  
  // Admin Products
  createProduct: (body, token) => apiFetch('/products', { method: 'POST', body: JSON.stringify(body), token }),
  updateProduct: (id, body, token) => apiFetch(`/products/${id}`, { method: 'PUT', body: JSON.stringify(body), token }),
  toggleProductAvailability: (id, token) => apiFetch(`/products/${id}/toggle-availability`, { method: 'PATCH', token }),
  deleteProduct: (id, token) => apiFetch(`/products/${id}`, { method: 'DELETE', token }),

  // Admin Customers
  getCustomers: (token) => apiFetch('/admin/customers', { token }),
  getCustomerDetails: (id, token) => apiFetch(`/admin/customers/${id}`, { token }),

  // Admin Rewards
  getRewardConfig: (token) => apiFetch('/rewards/admin/config', { token }),
  updateRewardConfig: (body, token) => apiFetch('/rewards/admin/config', { method: 'PUT', body: JSON.stringify(body), token }),
  getUnlockedRewards: (token) => apiFetch('/rewards/admin/unlocked', { token }),
  redeemReward: (milestoneId, notes, token) => apiFetch(`/rewards/admin/redeem/${milestoneId}`, { method: 'POST', body: JSON.stringify({ notes }), token }),
  getMilestoneAuditLogs: (token) => apiFetch('/rewards/admin/audit-logs', { token }),

  // Admin Enquiries
  getAdminEnquiries: (params = {}, token) => {
    const searchParams = new URLSearchParams();
    if (params.status) searchParams.append('status', params.status);
    const qs = searchParams.toString();
    return apiFetch(`/enquiries/admin/all${qs ? `?${qs}` : ''}`, { token });
  },
  updateEnquiry: (id, body, token) => apiFetch(`/enquiries/admin/${id}`, { method: 'PATCH', body: JSON.stringify(body), token }),

  // Admin Settings
  updateSettings: (body, token) => apiFetch('/settings', { method: 'PUT', body: JSON.stringify(body), token }),
};
