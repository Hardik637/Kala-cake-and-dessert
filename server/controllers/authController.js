const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const dbService = require('../services/dbService');
const brandConfig = require('../config/brand.config');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Validates and normalizes an Indian mobile number.
 * Accepts exactly 10-digit Indian mobile numbers starting with 6-9,
 * or properly formatted +91 / 0 prefixed representations.
 * Does NOT blindly strip arbitrary characters or slice last 10 digits.
 * Rejects invalid/ambiguous formats.
 */
function validateAndNormalizeIndianPhone(phone) {
  if (!phone || (typeof phone !== 'string' && typeof phone !== 'number')) {
    return null;
  }
  const str = String(phone).trim();
  if (/[^\d\s+-]/.test(str)) {
    return null;
  }
  const compact = str.replace(/[\s-]/g, '');
  const match = compact.match(/^(?:\+91|91|0)?([6-9]\d{9})$/);
  if (!match) {
    return null;
  }
  return match[1];
}

/**
 * Verifies a Google ID Token against Google OpenID Connect
 * In production: Strictly verified via Google's cryptographic public keys.
 * Explicitly requires payload.email_verified === true.
 * In development/test: Mock testing is allowed strictly when NODE_ENV !== 'production' AND ENABLE_DEV_MOCK_GOOGLE === 'true'.
 */
async function verifyGoogleToken(idToken) {
  const isProduction = process.env.NODE_ENV === 'production';
  const devMockAllowed = !isProduction && process.env.ENABLE_DEV_MOCK_GOOGLE === 'true';

  // Development/Test mock token isolation
  if (idToken && idToken.startsWith('mock-dev-token:')) {
    if (isProduction || !devMockAllowed) {
      throw new Error('Development mock authentication is strictly disabled in production.');
    }
    const parts = idToken.split(':');
    return {
      sub: parts[1] || 'mock-google-sub-dev',
      email: parts[2] || 'customer@example.com',
      name: parts[3] || 'Google User',
      picture: parts[4] || null,
      email_verified: true,
    };
  }

  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Google authentication ID token is required.');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId || clientId === 'your_google_client_id_here') {
    throw new Error('Google Client ID is not configured on the server.');
  }

  const ticket = await googleClient.verifyIdToken({
    idToken: idToken,
    audience: clientId,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.sub) {
    throw new Error('Invalid Google ID token payload.');
  }

  // Explicit requirement: Google email must be verified
  if (payload.email_verified !== true) {
    throw new Error('Google account email is not verified. Please verify your email with Google.');
  }

  return {
    sub: payload.sub,
    email: payload.email || '',
    name: payload.name || '',
    picture: payload.picture || null,
    email_verified: true,
  };
}

// Public configuration for frontend Google Identity Services
exports.getGoogleConfig = (req, res) => {
  return res.json({
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    devMockAllowed: process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEV_MOCK_GOOGLE === 'true',
  });
};

/**
 * Customer Google Authentication (Google Identity Services)
 * POST /api/auth/google
 * Pure Google OpenID Connect login:
 * - Returning Customer: identifies by Google sub, issues minimal customer JWT.
 * - New Customer: issues temporary registration token, requires profile completion (name + phone).
 * - Never creates a customer with phone: null.
 */
exports.googleAuth = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'Google authentication credential is required.' });
    }

    const googleUser = await verifyGoogleToken(idToken);

    // Primary Identity Check: Query strictly by Google `sub`
    let customer = await dbService.getUserByGoogleId(googleUser.sub);

    // NEW CUSTOMER: Issue temporary registration credential (expires in 15 mins)
    // Registration token contains a purpose claim and is never accepted as a normal customer/admin token
    if (!customer) {
      const tempToken = jwt.sign(
        {
          tempSub: googleUser.sub,
          email: googleUser.email,
          name: googleUser.name,
          picture: googleUser.picture,
          purpose: 'customer_registration',
        },
        brandConfig.JWT_SECRET,
        { expiresIn: '15m' }
      );

      return res.json({
        isNewCustomer: true,
        tempToken,
        googleProfile: {
          email: googleUser.email,
          name: googleUser.name || '',
          picture: googleUser.picture || null,
        },
      });
    }

    // RETURNING CUSTOMER: Issue standard customer session with minimal claims
    const activeMilestone = await dbService.getUserActiveMilestone(customer.id);

    const token = jwt.sign(
      { id: customer.id, role: 'customer', sub: customer.google_id },
      brandConfig.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      isNewCustomer: false,
      message: `Welcome back to ${brandConfig.BRAND_NAME}, ${customer.name}!`,
      token,
      user: customer,
      milestone: activeMilestone,
    });
  } catch (err) {
    console.error('Google auth error:', err.message);
    return res.status(401).json({ error: err.message || 'Google authentication failed.' });
  }
};

/**
 * Protected Customer Profile Completion for First-Time Google Users
 * POST /api/auth/google/complete-profile
 * Requires valid tempToken signed during Google authentication.
 * Server validates Name (required) and 10-digit Indian Mobile Number (required).
 * Atomically creates customer profile and exactly ONE active milestone cycle.
 */
exports.completeGoogleProfile = async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const tempToken = req.body.tempToken || (authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null);

    if (!tempToken) {
      return res.status(401).json({ error: 'Temporary registration token is required. Please sign in with Google again.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(tempToken, brandConfig.JWT_SECRET);
      if (decoded.purpose !== 'customer_registration' || !decoded.tempSub) {
        return res.status(401).json({ error: 'Invalid registration credential.' });
      }
    } catch {
      return res.status(401).json({ error: 'Registration session expired. Please sign in with Google again.' });
    }

    const { name, phone, default_address } = req.body;

    // Server-Side Input Validation
    if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) {
      return res.status(400).json({ error: 'Full name is required (between 2 and 80 characters).' });
    }

    const cleanPhone = validateAndNormalizeIndianPhone(phone);
    if (!cleanPhone) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number (e.g. 9820012345 or +91 9820012345).' });
    }

    // Atomic Transaction: Creates Customer & Single Canonical Milestone
    const result = await dbService.createUserWithInitialMilestoneTransaction({
      google_id: decoded.tempSub,
      name: name.trim(),
      email: decoded.email,
      profile_image: decoded.picture,
      phone: cleanPhone,
      default_address: default_address && typeof default_address === 'string' ? default_address.trim() : null,
    });

    const customer = result.user;
    const milestone = result.milestone;

    // Issue Minimal Customer JWT
    const token = jwt.sign(
      { id: customer.id, role: 'customer', sub: customer.google_id },
      brandConfig.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      isNewCustomer: false,
      message: `Welcome to ${brandConfig.BRAND_NAME}, ${customer.name}!`,
      token,
      user: customer,
      milestone,
    });
  } catch (err) {
    console.error('Profile completion error:', err.message);
    return res.status(400).json({ error: 'Failed to complete profile: ' + err.message });
  }
};

/**
 * Customer Profile Retrieval
 * GET /api/auth/profile
 */
exports.getProfile = async (req, res) => {
  try {
    const user = await dbService.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Customer account not found.' });
    }

    const milestone = await dbService.getUserActiveMilestone(user.id);
    return res.json({ user, milestone });
  } catch (err) {
    console.error('Profile fetch error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch customer profile.' });
  }
};

/**
 * Customer Profile Update (Standardized strictly on default_address)
 * PUT /api/auth/profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, default_address } = req.body;

    const user = await dbService.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Customer account not found.' });
    }

    let cleanPhone = undefined;
    if (phone !== undefined) {
      cleanPhone = validateAndNormalizeIndianPhone(phone);
      if (!cleanPhone) {
        return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number.' });
      }
    }

    let cleanName = undefined;
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) {
        return res.status(400).json({ error: 'Name must be between 2 and 80 characters.' });
      }
      cleanName = name.trim();
    }

    let cleanAddress = undefined;
    if (default_address !== undefined) {
      cleanAddress = default_address ? String(default_address).trim() : null;
      if (cleanAddress && cleanAddress.length > 300) {
        return res.status(400).json({ error: 'Address must be at most 300 characters.' });
      }
    }

    const updated = await dbService.updateUser(user.id, {
      name: cleanName,
      phone: cleanPhone,
      default_address: cleanAddress,
    });

    return res.json({ message: 'Profile updated successfully.', user: updated });
  } catch (err) {
    console.error('Profile update error:', err.message);
    return res.status(500).json({ error: 'Failed to update customer profile.' });
  }
};

exports.validateAndNormalizeIndianPhone = validateAndNormalizeIndianPhone;
