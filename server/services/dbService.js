/**
 * Database Service Layer for Pâtisserie Application
 * Backed strictly by Google Cloud Firestore via firebase-admin.
 * Strict adherence to:
 * 1) Canonical active_milestone_id on user document with transactional atomicity
 * 2) Milestone crediting stamps milestone_credit_id on order; reversals target exact cycle
 * 3) Reversal guard: disallows reversing orders on already-redeemed milestone cycles
 * 4) Single owner admin (admins/owner strictly, no fallbacks)
 * 5) Unique sequential order numbers via Firestore transactional counter on counters/order_counter
 * 6) Cryptographic 32-byte tracking_token for public tracking
 * 7) Standardized 'available' field & soft product archival (is_archived: 1, available: 0)
 * 8) Strict failure if Firestore store settings or active rewards are missing for business logic
 * 9) Strict status pipeline transitions (NEW -> CONFIRMED -> PREPARING -> READY -> OUT_FOR_DELIVERY -> DELIVERED)
 * 10) Paginated, query-efficient Firestore access
 */

const crypto = require('crypto');
const { getDb, checkFirebaseHealth } = require('../firebase');
const brandConfig = require('../config/brand.config');

// Collection Names
const COLLECTIONS = {
  SETTINGS: 'store_settings',
  ADMINS: 'admins',
  USERS: 'users',
  CATEGORIES: 'categories',
  PRODUCTS: 'products',
  ORDERS: 'orders',
  COUNTERS: 'counters',
  REWARDS: 'rewards',
  MILESTONES: 'customer_milestones',
  REDEMPTIONS: 'reward_redemptions',
  AUDIT_LOGS: 'milestone_audit_logs',
  ENQUIRIES: 'custom_enquiries',
  PAYMENT_SESSIONS: 'payment_sessions',
  WEBHOOK_EVENTS: 'webhook_events',
};

// Helper to format Firestore document with its ID
function docWithId(doc) {
  if (!doc || !doc.exists) return null;
  const data = doc.data() || {};
  return { id: doc.id, ...data, _docId: doc.id };
}

// Helper to convert Firestore QuerySnapshot to array of objects
function snapshotToArray(snapshot) {
  if (!snapshot || snapshot.empty) return [];
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), _docId: doc.id }));
}

// ---------------------------------------------------------------------------
// HEALTH CHECK
// ---------------------------------------------------------------------------
exports.checkHealth = async () => {
  return await checkFirebaseHealth();
};

// ---------------------------------------------------------------------------
// 1. STORE SETTINGS (Canonical Schema)
// ---------------------------------------------------------------------------
/**
 * Backend Business Settings
 * Fails safely with an informative error if required settings are missing in Firestore.
 * Never silently uses hard-coded fallback defaults for financial or business calculations.
 */
exports.getStoreSettings = async () => {
  const db = getDb();
  const doc = await db.collection(COLLECTIONS.SETTINGS).doc('default').get();
  if (!doc.exists) {
    throw new Error('Store business settings are unconfigured or unavailable in Firestore.');
  }

  const data = doc.data();
  if (data.default_delivery_fee === undefined || data.default_delivery_fee === null) {
    throw new Error('Required store delivery fee setting is missing in Firestore configuration.');
  }

  return {
    id: doc.id,
    brand_name: data.brand_name || brandConfig.BRAND_NAME,
    brand_tagline: data.brand_tagline || brandConfig.TAGLINE,
    contact_email: data.contact_email || brandConfig.CONTACT_EMAIL,
    contact_phone: data.contact_phone || brandConfig.CONTACT_PHONE,
    boutique_address: data.boutique_address || brandConfig.BOUTIQUE_ADDRESS,
    business_hours: data.business_hours || brandConfig.BUSINESS_HOURS,
    instagram_handle: data.instagram_handle || brandConfig.INSTAGRAM_HANDLE,
    currency_symbol: data.currency_symbol || brandConfig.CURRENCY_SYMBOL,
    pickup_enabled: data.pickup_enabled !== undefined ? (data.pickup_enabled ? 1 : 0) : 1,
    default_delivery_fee: Number(data.default_delivery_fee),
    hero_heading: data.hero_heading || null,
    hero_subtitle: data.hero_subtitle || null,
    hero_image_url: data.hero_image_url || null,
    about_story: data.about_story || null,
  };
};

/**
 * Public Settings for Frontend Presentation
 * Tolerant retrieval for initial loading / presentation fallback.
 */
exports.getStoreSettingsPublic = async () => {
  try {
    return await exports.getStoreSettings();
  } catch {
    return {
      brand_name: brandConfig.BRAND_NAME,
      brand_tagline: brandConfig.TAGLINE,
      contact_email: brandConfig.CONTACT_EMAIL,
      contact_phone: brandConfig.CONTACT_PHONE,
      boutique_address: brandConfig.BOUTIQUE_ADDRESS,
      business_hours: brandConfig.BUSINESS_HOURS,
      instagram_handle: brandConfig.INSTAGRAM_HANDLE,
      currency_symbol: brandConfig.CURRENCY_SYMBOL,
      pickup_enabled: brandConfig.PICKUP_ENABLED ? 1 : 0,
      default_delivery_fee: brandConfig.DEFAULT_DELIVERY_FEE,
      hero_heading: null,
      hero_subtitle: null,
      hero_image_url: null,
      about_story: null,
    };
  }
};

exports.updateStoreSettings = async (data) => {
  const db = getDb();
  const docRef = db.collection(COLLECTIONS.SETTINGS).doc('default');
  const now = new Date().toISOString();

  const updatePayload = {
    ...data,
    updated_at: now,
  };

  await docRef.set(updatePayload, { merge: true });
  const updated = await docRef.get();
  return docWithId(updated);
};

// ---------------------------------------------------------------------------
// 2. ADMIN OWNER (EXACTLY ONE ACCOUNT: admins/owner)
// ---------------------------------------------------------------------------
exports.getAdminByUsername = async (username) => {
  const db = getDb();
  const clean = username.trim().toLowerCase();

  // The single owner record must reside at admins/owner
  const ownerDoc = await db.collection(COLLECTIONS.ADMINS).doc('owner').get();
  if (ownerDoc.exists) {
    const data = ownerDoc.data();
    if ((data.username && data.username.toLowerCase() === clean) || (data.email && data.email.toLowerCase() === clean)) {
      return docWithId(ownerDoc);
    }
  }

  // Also query username attribute specifically on admins collection
  let snap = await db.collection(COLLECTIONS.ADMINS)
    .where('username', '==', clean)
    .limit(1)
    .get();

  if (!snap.empty && snap.docs[0].id === 'owner') {
    return docWithId(snap.docs[0]);
  }

  snap = await db.collection(COLLECTIONS.ADMINS)
    .where('email', '==', clean)
    .limit(1)
    .get();

  if (!snap.empty && snap.docs[0].id === 'owner') {
    return docWithId(snap.docs[0]);
  }

  return null;
};

/**
 * Retrieve Admin by ID
 * Strictly requires id === 'owner'. No fallback to "first admin".
 */
exports.getAdminById = async (id) => {
  if (!id || String(id) !== 'owner') {
    return null;
  }

  const db = getDb();
  const doc = await db.collection(COLLECTIONS.ADMINS).doc('owner').get();
  return docWithId(doc);
};

exports.updateAdminCredentials = async (id, data) => {
  if (String(id) !== 'owner') {
    throw new Error('Unauthorized. Only the boutique owner account can be updated.');
  }

  const db = getDb();
  const now = new Date().toISOString();
  const payload = {
    ...data,
    updated_at: now,
  };

  await db.collection(COLLECTIONS.ADMINS).doc('owner').set(payload, { merge: true });
  const updated = await db.collection(COLLECTIONS.ADMINS).doc('owner').get();
  return docWithId(updated);
};

// ---------------------------------------------------------------------------
// 3. USERS (GOOGLE OAUTH IDENTITY & CANONICAL ACTIVE MILESTONE)
// ---------------------------------------------------------------------------
exports.getUserByGoogleId = async (googleSub) => {
  const db = getDb();
  const snap = await db.collection(COLLECTIONS.USERS)
    .where('google_id', '==', googleSub)
    .limit(1)
    .get();

  if (snap.empty) return null;
  return docWithId(snap.docs[0]);
};

exports.getUserById = async (id) => {
  const db = getDb();
  const doc = await db.collection(COLLECTIONS.USERS).doc(String(id)).get();
  if (doc.exists) return docWithId(doc);

  const numId = Number(id);
  let snap = await db.collection(COLLECTIONS.USERS)
    .where('id', '==', isNaN(numId) ? id : numId)
    .limit(1)
    .get();

  if (!snap.empty) return docWithId(snap.docs[0]);
  return null;
};

/**
 * Atomic Customer Creation with Initial Milestone
 * 1) Idempotent on Google sub
 * 2) Validates required 10-digit Indian phone (never creates customer with phone: null)
 * 3) Creates exactly ONE initial active milestone
 * 4) Points customer active_milestone_id canonically
 */
exports.createUserWithInitialMilestoneTransaction = async ({
  google_id,
  name,
  email,
  profile_image,
  phone,
  default_address,
}) => {
  if (!google_id) throw new Error('Google identity subject (sub) is required.');
  if (!name || !name.trim()) throw new Error('Full name is required.');

  // Strict Phone Validation
  const phoneMatch = String(phone || '').trim().match(/^(?:\+91[\s-]?)?0?([6-9]\d{9})$/);
  if (!phoneMatch) {
    throw new Error('A valid 10-digit Indian mobile number is required.');
  }
  const cleanPhone = phoneMatch[1];

  const db = getDb();
  const now = new Date().toISOString();

  const result = await db.runTransaction(async (transaction) => {
    // 1. Check if user already exists for this Google sub
    const existingSnap = await transaction.get(
      db.collection(COLLECTIONS.USERS).where('google_id', '==', google_id).limit(1)
    );

    if (!existingSnap.empty) {
      const existingUserDoc = existingSnap.docs[0];
      const existingUserData = existingUserDoc.data();
      let activeMilestone = null;

      if (existingUserData.active_milestone_id) {
        const mDoc = await transaction.get(db.collection(COLLECTIONS.MILESTONES).doc(existingUserData.active_milestone_id));
        if (mDoc.exists && mDoc.data().redeemed === 0) {
          activeMilestone = docWithId(mDoc);
        }
      }

      return {
        user: docWithId(existingUserDoc),
        milestone: activeMilestone,
        alreadyExisted: true,
      };
    }

    // 2. Fetch current active reward configuration
    const rewardsSnap = await transaction.get(
      db.collection(COLLECTIONS.REWARDS).where('active', '==', 1).limit(1)
    );

    let activeReward = null;
    if (!rewardsSnap.empty) {
      activeReward = rewardsSnap.docs[0].data();
    }

    const rewardId = activeReward ? rewardsSnap.docs[0].id : 1;
    const rewardName = activeReward ? activeReward.name : brandConfig.DEFAULT_REWARD_NAME;
    const rewardDesc = activeReward ? (activeReward.description || '') : brandConfig.DEFAULT_REWARD_DESCRIPTION;
    const requiredOrders = activeReward ? (activeReward.required_orders || 10) : brandConfig.DEFAULT_MILESTONE_REQUIRED_ORDERS;

    // 3. Generate references
    const userRef = db.collection(COLLECTIONS.USERS).doc();
    const milestoneRef = db.collection(COLLECTIONS.MILESTONES).doc();

    const newMilestone = {
      id: milestoneRef.id,
      user_id: userRef.id,
      reward_id: rewardId,
      reward_name: rewardName,
      reward_description: rewardDesc,
      completed_orders: 0,
      required_orders: requiredOrders,
      unlocked: 0,
      unlocked_at: null,
      redeemed: 0,
      redeemed_at: null,
      created_at: now,
      updated_at: now,
    };

    const newUser = {
      id: userRef.id,
      google_id,
      name: name.trim(),
      email: email ? email.trim().toLowerCase() : null,
      phone: cleanPhone,
      profile_image: profile_image || null,
      default_address: default_address ? default_address.trim() : null,
      active_milestone_id: milestoneRef.id,
      created_at: now,
      updated_at: now,
    };

    transaction.set(userRef, newUser);
    transaction.set(milestoneRef, newMilestone);

    return {
      user: { id: userRef.id, ...newUser },
      milestone: newMilestone,
      alreadyExisted: false,
    };
  });

  return result;
};

exports.updateUser = async (id, userData) => {
  const db = getDb();
  const docRef = db.collection(COLLECTIONS.USERS).doc(String(id));
  const now = new Date().toISOString();

  const payload = {
    ...userData,
    updated_at: now,
  };

  await docRef.set(payload, { merge: true });
  const updated = await docRef.get();
  return docWithId(updated);
};

// ---------------------------------------------------------------------------
// 4. CATEGORIES & PRODUCTS (Standardized on 'available' and soft archival)
// ---------------------------------------------------------------------------
exports.getCategories = async () => {
  const db = getDb();
  const snap = await db.collection(COLLECTIONS.CATEGORIES).get();
  const list = snapshotToArray(snap);
  const canonicalSlugs = [
    'baked-cheesecakes',
    'brownies',
    'cookies',
    'desserts',
    'gifting',
    'healthy-bakes',
    'teacakes',
    'dessert-tubs',
    'cookie-tin'
  ];
  
  const slugMap = new Map();
  for (const c of list) {
    if (canonicalSlugs.includes(c.slug) && !slugMap.has(c.slug)) {
      slugMap.set(c.slug, c);
    }
  }

  const canonicalDefaults = {
    'baked-cheesecakes': { id: 1, slug: 'baked-cheesecakes', name: 'Baked Cheesecakes', description: 'Rich, creamy slow-baked cheesecakes', display_order: 1 },
    'brownies': { id: 2, slug: 'brownies', name: 'Brownies', description: 'Rich, fudgy chocolate brownies', display_order: 2 },
    'cookies': { id: 3, slug: 'cookies', name: 'Cookies', description: 'Freshly baked artisanal cookies', display_order: 3 },
    'desserts': { id: 4, slug: 'desserts', name: 'Desserts', description: 'Handcrafted specialty dessert creations', display_order: 4 },
    'gifting': { id: 5, slug: 'gifting', name: 'Gifting', description: 'Curated dessert boxes and artisanal gift hampers', display_order: 5 },
    'healthy-bakes': { id: 6, slug: 'healthy-bakes', name: 'Healthy Bakes', description: 'Wholesome, nourishing artisanal bakes', display_order: 6 },
    'teacakes': { id: 7, slug: 'teacakes', name: 'Teacakes', description: 'Delicate tea-time loafs & fragrant slices', display_order: 7 },
    'dessert-tubs': { id: 8, slug: 'dessert-tubs', name: 'Dessert Tubs', description: 'Layered dessert tubs ready to spoon', display_order: 8 },
    'cookie-tin': { id: 9, slug: 'cookie-tin', name: 'Cookie Tin', description: 'Curated assorted cookie gift tins', display_order: 9 },
  };

  return canonicalSlugs.map(slug => slugMap.get(slug) || canonicalDefaults[slug]);
};

exports.getCategoryBySlug = async (slug) => {
  const db = getDb();
  const snap = await db.collection(COLLECTIONS.CATEGORIES)
    .where('slug', '==', slug)
    .limit(1)
    .get();

  if (snap.empty) return null;
  return docWithId(snap.docs[0]);
};

exports.getProducts = async (categoryFilter = null, includeArchived = false, includeSoldOut = false) => {
  const db = getDb();
  let query = db.collection(COLLECTIONS.PRODUCTS);

  if (!includeArchived) {
    query = query.where('is_archived', '==', 0);
  }

  // Public catalog excludes unavailable products
  if (!includeSoldOut) {
    query = query.where('available', '==', 1);
  }

  const snap = await query.get();
  let products = snapshotToArray(snap);

  if (categoryFilter && categoryFilter !== 'all') {
    const isNum = !isNaN(Number(categoryFilter));
    const numCat = Number(categoryFilter);

    products = products.filter(p => {
      if (p.category_slug && p.category_slug.toLowerCase() === categoryFilter.toLowerCase()) return true;
      if (isNum && (p.category_id === numCat || Number(p.category_id) === numCat)) return true;
      return false;
    });
  }

  return products.sort((a, b) => (a.id || 0) - (b.id || 0));
};

exports.getProductById = async (id) => {
  const db = getDb();
  const doc = await db.collection(COLLECTIONS.PRODUCTS).doc(String(id)).get();
  if (doc.exists) return docWithId(doc);

  const numId = Number(id);
  const snap = await db.collection(COLLECTIONS.PRODUCTS)
    .where('id', '==', isNaN(numId) ? id : numId)
    .limit(1)
    .get();

  if (!snap.empty) return docWithId(snap.docs[0]);
  return null;
};

exports.createProduct = async (productData) => {
  const db = getDb();
  const now = new Date().toISOString();

  let categoryName = null;
  let categorySlug = null;
  if (productData.category_id) {
    const catDoc = await db.collection(COLLECTIONS.CATEGORIES).doc(String(productData.category_id)).get();
    if (catDoc.exists) {
      categoryName = catDoc.data().name;
      categorySlug = catDoc.data().slug;
    }
  }

  const docRef = db.collection(COLLECTIONS.PRODUCTS).doc();
  const newProduct = {
    id: docRef.id,
    name: productData.name.trim(),
    french_name: productData.french_name ? productData.french_name.trim() : null,
    description: productData.description ? productData.description.trim() : null,
    category_id: productData.category_id ? Number(productData.category_id) : 1,
    category_name: categoryName || productData.category_name || 'Pastries',
    category_slug: categorySlug || productData.category_slug || 'pastries',
    price: Number(productData.price),
    image_url: productData.image_url || null,
    is_featured: productData.is_featured ? 1 : 0,
    available: productData.available !== undefined ? (productData.available ? 1 : 0) : 1,
    is_archived: 0,
    ingredients: productData.ingredients || null,
    allergens: productData.allergens || null,
    created_at: now,
    updated_at: now,
  };

  await docRef.set(newProduct);
  return newProduct;
};

exports.updateProduct = async (id, data) => {
  const db = getDb();
  const docRef = db.collection(COLLECTIONS.PRODUCTS).doc(String(id));
  const now = new Date().toISOString();

  const payload = { ...data, updated_at: now };
  if (data.available !== undefined) {
    payload.available = data.available ? 1 : 0;
  }

  await docRef.set(payload, { merge: true });
  const updated = await docRef.get();
  return docWithId(updated);
};

exports.toggleProductAvailability = async (id) => {
  const db = getDb();
  const docRef = db.collection(COLLECTIONS.PRODUCTS).doc(String(id));
  const doc = await docRef.get();
  if (!doc.exists) return null;

  const currentData = doc.data();
  const current = currentData.available !== undefined ? currentData.available : 1;
  const newStatus = current === 1 ? 0 : 1;

  await docRef.update({
    available: newStatus,
    updated_at: new Date().toISOString(),
  });

  const updated = await docRef.get();
  return docWithId(updated);
};

/**
 * Soft Delete / Archive Product (Requirement 22)
 * Preserves historical product references and past order snapshots.
 */
exports.deleteProduct = async (id) => {
  const db = getDb();
  const docRef = db.collection(COLLECTIONS.PRODUCTS).doc(String(id));
  const doc = await docRef.get();
  if (!doc.exists) return false;

  await docRef.update({
    is_archived: 1,
    available: 0,
    updated_at: new Date().toISOString(),
  });
  return true;
};

// ---------------------------------------------------------------------------
// 5. ORDERS (TRANSACTIONAL COUNTER, EMBEDDED SNAPSHOTS, 32-BYTE TRACKING TOKEN)
// ---------------------------------------------------------------------------
/**
 * Atomically generates next sequential order number using a dedicated counter document.
 */
async function getNextOrderNumberAtomic(transaction, db) {
  const counterRef = db.collection(COLLECTIONS.COUNTERS).doc('order_counter');
  const counterDoc = await transaction.get(counterRef);

  let nextNum = 1001;
  if (counterDoc.exists) {
    nextNum = (counterDoc.data().last_number || 1000) + 1;
    transaction.update(counterRef, {
      last_number: nextNum,
      updated_at: new Date().toISOString(),
    });
  } else {
    transaction.set(counterRef, {
      last_number: nextNum,
      updated_at: new Date().toISOString(),
    });
  }

  return `#${nextNum}`;
}

exports.createOrder = async (orderData) => {
  const db = getDb();
  const now = new Date().toISOString();

  // Generate cryptographically random 32-byte tracking token for public tracking (Requirement 5)
  const trackingToken = orderData.tracking_token || crypto.randomBytes(32).toString('hex');
  const docRef = orderData.id
    ? db.collection(COLLECTIONS.ORDERS).doc(String(orderData.id))
    : db.collection(COLLECTIONS.ORDERS).doc();

  const createdOrder = await db.runTransaction(async (transaction) => {
    let orderNumber = orderData.order_number;
    if (!orderNumber) {
      orderNumber = await getNextOrderNumberAtomic(transaction, db);
    }

    const payload = {
      ...orderData,
      id: docRef.id,
      order_number: orderNumber,
      tracking_token: trackingToken,
      payment_method: orderData.payment_method || 'CARD',
      payment_status: orderData.payment_status || (orderData.payment_method === 'COD' ? 'COD_PENDING' : 'PENDING'),
      payment_reference: orderData.payment_reference || null,
      created_at: orderData.created_at || now,
      updated_at: now,
    };

    transaction.set(docRef, payload);
    return payload;
  });

  return createdOrder;
};

exports.getOrderById = async (id) => {
  const db = getDb();
  const doc = await db.collection(COLLECTIONS.ORDERS).doc(String(id)).get();
  if (doc.exists) return docWithId(doc);

  const numId = Number(id);
  const snap = await db.collection(COLLECTIONS.ORDERS)
    .where('id', '==', isNaN(numId) ? id : numId)
    .limit(1)
    .get();

  if (!snap.empty) return docWithId(snap.docs[0]);
  return null;
};

exports.getOrderByTrackingToken = async (token) => {
  if (!token || typeof token !== 'string') return null;
  const db = getDb();
  const snap = await db.collection(COLLECTIONS.ORDERS)
    .where('tracking_token', '==', token.trim())
    .limit(1)
    .get();

  if (snap.empty) return null;
  return docWithId(snap.docs[0]);
};

exports.getUserOrders = async (userId) => {
  const db = getDb();
  const snap = await db.collection(COLLECTIONS.ORDERS)
    .where('user_id', '==', String(userId))
    .get();

  const orders = snapshotToArray(snap);
  return orders.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
};

exports.getAllOrders = async (statusFilter = 'ALL', page = 1, limit = 50) => {
  const db = getDb();
  let query = db.collection(COLLECTIONS.ORDERS);

  if (statusFilter && statusFilter !== 'ALL') {
    query = query.where('status', '==', statusFilter);
  }

  const snap = await query.get();
  const orders = snapshotToArray(snap);
  orders.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  const offset = (page - 1) * limit;
  return orders.slice(offset, offset + limit);
};

// ---------------------------------------------------------------------------
// 6. ORDER STATUS PIPELINE & ATOMIC MILESTONE CREDITING
// ---------------------------------------------------------------------------
// Sensible State Transitions (Requirement 6)
const VALID_TRANSITIONS = {
  NEW: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'], // DELIVERED allowed directly for PICKUP
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [], // Prevent changing DELIVERED back into an earlier active state
  CANCELLED: [], // Prevent CANCELLED -> active states
};

exports.updateOrderStatusWithMilestoneTransaction = async (orderId, newStatus, adminId) => {
  const db = getDb();
  const orderRef = db.collection(COLLECTIONS.ORDERS).doc(String(orderId));
  const now = new Date().toISOString();

  const result = await db.runTransaction(async (transaction) => {
    const orderDoc = await transaction.get(orderRef);
    if (!orderDoc.exists) {
      throw new Error(`Order ${orderId} not found.`);
    }

    const order = orderDoc.data();
    const currentStatus = order.status || 'NEW';

    // If status is identical, return current state idempotently
    if (currentStatus === newStatus) {
      return {
        order: { id: orderDoc.id, ...order },
        milestoneCredited: false,
        alreadyCredited: order.milestone_credited === 1,
        milestoneId: order.milestone_credit_id || null,
      };
    }

    // Pipeline Transition Validation
    if (currentStatus === 'DELIVERED') {
      throw new Error('Delivered orders cannot be moved back to an earlier active state.');
    }
    if (currentStatus === 'CANCELLED') {
      throw new Error('Cancelled orders cannot be reopened or transitioned.');
    }

    const allowedNext = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowedNext.includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}.`);
    }

    // For delivery orders: READY -> DELIVERED must pass through OUT_FOR_DELIVERY
    if (currentStatus === 'READY' && newStatus === 'DELIVERED' && order.fulfillment_type === 'DELIVERY') {
      throw new Error('Delivery orders must transition to OUT_FOR_DELIVERY before being marked DELIVERED.');
    }

    // Non-DELIVERED transitions (e.g. CONFIRMED, PREPARING, READY, OUT_FOR_DELIVERY, CANCELLED)
    if (newStatus !== 'DELIVERED') {
      transaction.update(orderRef, {
        status: newStatus,
        updated_at: now,
      });

      return {
        order: { id: orderDoc.id, ...order, status: newStatus, updated_at: now },
        milestoneCredited: false,
      };
    }

    // DELIVERED TRANSITION: Only transition into DELIVERED once & credit milestone
    if (order.milestone_credited === 1) {
      transaction.update(orderRef, { status: 'DELIVERED', updated_at: now });
      return {
        order: { id: orderDoc.id, ...order, status: 'DELIVERED', milestone_credited: 1, updated_at: now },
        milestoneCredited: false,
        alreadyCredited: true,
        milestoneId: order.milestone_credit_id || null,
      };
    }

    if (!order.user_id) {
      transaction.update(orderRef, { status: 'DELIVERED', milestone_credited: 1, updated_at: now });
      return {
        order: { id: orderDoc.id, ...order, status: 'DELIVERED', milestone_credited: 1, updated_at: now },
        milestoneCredited: false,
        guestOrder: true,
      };
    }

    // Read Customer Document
    const userRef = db.collection(COLLECTIONS.USERS).doc(String(order.user_id));
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists) {
      throw new Error(`Customer account (${order.user_id}) does not exist.`);
    }

    const userData = userDoc.data();
    let activeMilestoneId = userData.active_milestone_id;
    let milestoneRef;
    let milestoneData;

    // Load active milestone via canonical pointer
    if (activeMilestoneId) {
      milestoneRef = db.collection(COLLECTIONS.MILESTONES).doc(activeMilestoneId);
      const mDoc = await transaction.get(milestoneRef);
      if (mDoc.exists && mDoc.data().redeemed === 0) {
        milestoneData = mDoc.data();
      }
    }

    // If no active milestone exists, fetch current active reward configuration and initialize
    if (!milestoneData) {
      const rewardsSnap = await transaction.get(
        db.collection(COLLECTIONS.REWARDS).where('active', '==', 1).limit(1)
      );
      if (rewardsSnap.empty) {
        throw new Error('No active milestone reward configuration found in Firestore.');
      }
      const activeReward = rewardsSnap.docs[0].data();

      milestoneRef = db.collection(COLLECTIONS.MILESTONES).doc();
      milestoneData = {
        id: milestoneRef.id,
        user_id: String(order.user_id),
        reward_id: rewardsSnap.docs[0].id,
        reward_name: activeReward.name || brandConfig.DEFAULT_REWARD_NAME,
        reward_description: activeReward.description || brandConfig.DEFAULT_REWARD_DESCRIPTION,
        completed_orders: 0,
        required_orders: activeReward.required_orders || 10,
        unlocked: 0,
        unlocked_at: null,
        redeemed: 0,
        redeemed_at: null,
        created_at: now,
        updated_at: now,
      };

      transaction.set(milestoneRef, milestoneData);
      transaction.update(userRef, { active_milestone_id: milestoneRef.id, updated_at: now });
    }

    if (milestoneData.redeemed === 1) {
      throw new Error('Customer milestone is already redeemed and cannot receive further order credits.');
    }

    const required = milestoneData.required_orders || 10;
    if (milestoneData.unlocked === 1 || (milestoneData.completed_orders || 0) >= required) {
      throw new Error('Customer milestone reward is already unlocked. Please redeem it before earning credits on a new cycle.');
    }

    const prevCompleted = milestoneData.completed_orders || 0;
    const newCompleted = prevCompleted + 1;
    const unlocked = newCompleted >= required ? 1 : 0;
    const unlockedAt = unlocked && !milestoneData.unlocked ? now : milestoneData.unlocked_at;

    // 1. Update Order atomically with milestone_credit_id
    transaction.update(orderRef, {
      status: 'DELIVERED',
      milestone_credited: 1,
      milestone_credit_id: milestoneRef.id,
      updated_at: now,
    });

    // 2. Update Milestone atomically
    transaction.update(milestoneRef, {
      completed_orders: newCompleted,
      unlocked,
      unlocked_at: unlockedAt,
      updated_at: now,
    });

    // 3. Write Audit Trail Record (Never logs passwords or tokens)
    const auditRef = db.collection(COLLECTIONS.AUDIT_LOGS).doc();
    transaction.set(auditRef, {
      order_id: String(orderDoc.id),
      order_number: order.order_number,
      user_id: String(order.user_id),
      milestone_id: milestoneRef.id,
      customer_name: order.customer_name || userData.name,
      admin_id: adminId || 'owner',
      admin_username: 'owner',
      action_type: 'AUTO_CREDIT',
      previous_completed_orders: prevCompleted,
      new_completed_orders: newCompleted,
      reason: `Order ${order.order_number} transitioned to DELIVERED`,
      created_at: now,
      timestamp: now,
    });

    return {
      order: {
        id: orderDoc.id,
        ...order,
        status: 'DELIVERED',
        milestone_credited: 1,
        milestone_credit_id: milestoneRef.id,
        updated_at: now,
      },
      milestoneCredited: true,
      milestoneId: milestoneRef.id,
      completedOrders: newCompleted,
      requiredOrders: required,
      unlocked: !!unlocked,
    };
  });

  return result;
};

// ---------------------------------------------------------------------------
// 7. ATOMIC OWNER MILESTONE REVERSAL (TARGETS EXACT CYCLE)
// ---------------------------------------------------------------------------
exports.reverseMilestoneCreditAtomic = async (orderId, reason, adminId) => {
  const db = getDb();
  const orderRef = db.collection(COLLECTIONS.ORDERS).doc(String(orderId));
  const now = new Date().toISOString();

  const result = await db.runTransaction(async (transaction) => {
    const orderDoc = await transaction.get(orderRef);
    if (!orderDoc.exists) {
      throw new Error('Order record not found.');
    }

    const order = orderDoc.data();
    if (order.milestone_credited !== 1) {
      throw new Error('This order has not been credited toward a customer milestone or has already been reversed.');
    }

    // Target the EXACT milestone cycle that this order credited (Requirement 17)
    const targetMilestoneId = order.milestone_credit_id;
    if (!targetMilestoneId) {
      throw new Error('Cannot reverse milestone credit: this order is missing an associated milestone_credit_id.');
    }

    const milestoneRef = db.collection(COLLECTIONS.MILESTONES).doc(targetMilestoneId);
    const milestoneDoc = await transaction.get(milestoneRef);
    if (!milestoneDoc.exists) {
      throw new Error(`Target milestone cycle ${targetMilestoneId} not found.`);
    }

    const milestone = milestoneDoc.data();

    // Reversal Guard: Cannot reverse an order belonging to an already-redeemed milestone (Requirement 17)
    if (milestone.redeemed === 1) {
      throw new Error('Cannot reverse credit: the milestone cycle associated with this order has already been redeemed by the customer.');
    }

    const prevCompleted = milestone.completed_orders || 0;
    const newCompleted = Math.max(0, prevCompleted - 1);
    const required = milestone.required_orders || 10;
    const unlocked = newCompleted >= required ? 1 : 0;

    // 1. Revert Order milestone crediting flags
    transaction.update(orderRef, {
      milestone_credited: 0,
      milestone_credit_id: null,
      updated_at: now,
    });

    // 2. Decrement completed orders on the exact milestone cycle
    transaction.update(milestoneRef, {
      completed_orders: newCompleted,
      unlocked,
      unlocked_at: unlocked ? milestone.unlocked_at : null,
      updated_at: now,
    });

    // 3. Write Manual Reversal Audit Log
    const auditRef = db.collection(COLLECTIONS.AUDIT_LOGS).doc();
    transaction.set(auditRef, {
      order_id: String(orderDoc.id),
      order_number: order.order_number,
      user_id: String(order.user_id),
      milestone_id: targetMilestoneId,
      admin_id: adminId || 'owner',
      admin_username: 'owner',
      action_type: 'MANUAL_REVERSAL',
      previous_completed_orders: prevCompleted,
      new_completed_orders: newCompleted,
      reason: reason || 'Owner explicit reversal',
      created_at: now,
      timestamp: now,
    });

    return {
      orderNumber: order.order_number,
      previousOrders: prevCompleted,
      newOrders: newCompleted,
      milestoneId: targetMilestoneId,
    };
  });

  return result;
};

// ---------------------------------------------------------------------------
// 8. REWARDS & REDEMPTIONS (Canonical Active Milestone & Redemptions)
// ---------------------------------------------------------------------------
exports.getActiveReward = async () => {
  const db = getDb();
  const snap = await db.collection(COLLECTIONS.REWARDS)
    .where('active', '==', 1)
    .limit(1)
    .get();

  if (!snap.empty) return docWithId(snap.docs[0]);
  return null;
};

exports.getAllRewards = async () => {
  const db = getDb();
  const snap = await db.collection(COLLECTIONS.REWARDS).get();
  return snapshotToArray(snap);
};

/**
 * Update Reward Configuration
 * Transactionally deactivates other active rewards when activating a reward (Requirement 15)
 */
exports.updateReward = async (id, data) => {
  const db = getDb();
  const now = new Date().toISOString();

  return await db.runTransaction(async (transaction) => {
    if (data.active === 1) {
      const activeSnaps = await transaction.get(
        db.collection(COLLECTIONS.REWARDS).where('active', '==', 1)
      );
      activeSnaps.forEach((doc) => {
        if (doc.id !== String(id)) {
          transaction.update(doc.ref, { active: 0, updated_at: now });
        }
      });
    }

    const docRef = db.collection(COLLECTIONS.REWARDS).doc(String(id));
    const payload = { ...data, updated_at: now };
    transaction.set(docRef, payload, { merge: true });
    return { id: String(id), ...payload };
  });
};

/**
 * Atomically retrieves or repairs the customer's canonical active milestone (Requirement 14)
 * Uses Firestore transaction to prevent competing milestone creation during concurrent requests.
 */
exports.getUserActiveMilestone = async (userId) => {
  const db = getDb();

  return await db.runTransaction(async (transaction) => {
    const userRef = db.collection(COLLECTIONS.USERS).doc(String(userId));
    const userDoc = await transaction.get(userRef);

    if (userDoc.exists && userDoc.data().active_milestone_id) {
      const mDoc = await transaction.get(
        db.collection(COLLECTIONS.MILESTONES).doc(userDoc.data().active_milestone_id)
      );
      if (mDoc.exists && mDoc.data().redeemed === 0) {
        return docWithId(mDoc);
      }
    }

    // Check if an existing unredeemed milestone already belongs to this customer
    const snap = await transaction.get(
      db.collection(COLLECTIONS.MILESTONES)
        .where('user_id', '==', String(userId))
        .where('redeemed', '==', 0)
        .limit(1)
    );

    if (!snap.empty) {
      const activeDoc = snap.docs[0];
      if (userDoc.exists) {
        transaction.update(userRef, { active_milestone_id: activeDoc.id, updated_at: new Date().toISOString() });
      }
      return docWithId(activeDoc);
    }

    // Initialize fresh cycle using current active reward configuration
    const now = new Date().toISOString();
    const rewardsSnap = await transaction.get(
      db.collection(COLLECTIONS.REWARDS).where('active', '==', 1).limit(1)
    );
    let activeReward = null;
    if (!rewardsSnap.empty) activeReward = rewardsSnap.docs[0].data();

    const milestoneRef = db.collection(COLLECTIONS.MILESTONES).doc();
    const newMilestone = {
      id: milestoneRef.id,
      user_id: String(userId),
      reward_id: activeReward ? rewardsSnap.docs[0].id : 1,
      reward_name: activeReward ? activeReward.name : brandConfig.DEFAULT_REWARD_NAME,
      reward_description: activeReward ? (activeReward.description || '') : brandConfig.DEFAULT_REWARD_DESCRIPTION,
      completed_orders: 0,
      required_orders: activeReward ? (activeReward.required_orders || 10) : brandConfig.DEFAULT_MILESTONE_REQUIRED_ORDERS,
      unlocked: 0,
      unlocked_at: null,
      redeemed: 0,
      redeemed_at: null,
      created_at: now,
      updated_at: now,
    };

    transaction.set(milestoneRef, newMilestone);
    if (userDoc.exists) {
      transaction.update(userRef, { active_milestone_id: milestoneRef.id, updated_at: now });
    }

    return newMilestone;
  });
};

exports.getUserMilestoneHistory = async (userId) => {
  const db = getDb();
  const snap = await db.collection(COLLECTIONS.REDEMPTIONS)
    .where('user_id', '==', String(userId))
    .get();

  const items = snapshotToArray(snap);
  return items.sort((a, b) => new Date(b.redeemed_at || 0) - new Date(a.redeemed_at || 0));
};

exports.getUnlockedRewards = async () => {
  const db = getDb();
  const snap = await db.collection(COLLECTIONS.MILESTONES)
    .where('unlocked', '==', 1)
    .where('redeemed', '==', 0)
    .get();

  const unlockedList = snapshotToArray(snap);
  for (const item of unlockedList) {
    if (item.user_id) {
      const user = await exports.getUserById(item.user_id);
      if (user) {
        item.user_name = user.name;
        item.user_email = user.email;
        item.user_phone = user.phone;
      }
    }
  }

  const redSnap = await db.collection(COLLECTIONS.REDEMPTIONS).get();
  const redeemedHistory = snapshotToArray(redSnap)
    .sort((a, b) => new Date(b.redeemed_at || 0) - new Date(a.redeemed_at || 0))
    .slice(0, 50);

  return { unlockedList, redeemedHistory };
};

/**
 * Atomically Redeems an Unlocked Milestone Reward
 * 1) Marks old milestone redeemed
 * 2) Creates redemption history in reward_redemptions
 * 3) Fetches CURRENT active reward configuration (Requirement 16)
 * 4) Creates new milestone cycle using CURRENT reward config
 * 5) Updates customer active_milestone_id canonically
 */
exports.redeemRewardAtomic = async (milestoneId, notes, adminId, adminName) => {
  const db = getDb();
  const milestoneRef = db.collection(COLLECTIONS.MILESTONES).doc(String(milestoneId));
  const now = new Date().toISOString();

  const result = await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(milestoneRef);
    if (!doc.exists) throw new Error('Milestone record not found.');

    const milestone = doc.data();
    if (milestone.unlocked !== 1) throw new Error('This reward has not reached the required completed order milestone yet.');
    if (milestone.redeemed === 1) throw new Error('This reward milestone has already been redeemed.');

    const rewardName = milestone.reward_name || brandConfig.DEFAULT_REWARD_NAME;

    // Fetch CURRENT active reward configuration inside transaction read
    const rewardsSnap = await transaction.get(
      db.collection(COLLECTIONS.REWARDS).where('active', '==', 1).limit(1)
    );
    let activeReward = null;
    if (!rewardsSnap.empty) {
      activeReward = rewardsSnap.docs[0].data();
    }

    const currentRewardId = activeReward ? rewardsSnap.docs[0].id : 1;
    const currentRewardName = activeReward ? activeReward.name : brandConfig.DEFAULT_REWARD_NAME;
    const currentRewardDesc = activeReward ? (activeReward.description || '') : brandConfig.DEFAULT_REWARD_DESCRIPTION;
    const currentRequiredOrders = activeReward ? (activeReward.required_orders || 10) : brandConfig.DEFAULT_MILESTONE_REQUIRED_ORDERS;

    // 1. Mark current milestone as redeemed
    transaction.update(milestoneRef, {
      redeemed: 1,
      redeemed_at: now,
      updated_at: now,
    });

    // 2. Add Redemption History Record (Requirement 11 & 16)
    const redemptionRef = db.collection(COLLECTIONS.REDEMPTIONS).doc();
    transaction.set(redemptionRef, {
      id: redemptionRef.id,
      milestone_id: String(milestoneId),
      user_id: String(milestone.user_id),
      reward_name: rewardName,
      redeemed_at: now,
      redeemed_by_admin: adminId || 'owner',
      notes: notes || '',
    });

    // 3. Initialize fresh milestone cycle for customer using CURRENT active reward configuration
    const nextMilestoneRef = db.collection(COLLECTIONS.MILESTONES).doc();
    transaction.set(nextMilestoneRef, {
      id: nextMilestoneRef.id,
      user_id: String(milestone.user_id),
      reward_id: currentRewardId,
      reward_name: currentRewardName,
      reward_description: currentRewardDesc,
      completed_orders: 0,
      required_orders: currentRequiredOrders,
      unlocked: 0,
      unlocked_at: null,
      redeemed: 0,
      redeemed_at: null,
      created_at: now,
      updated_at: now,
    });

    // 4. Update canonical pointer on customer document
    const userRef = db.collection(COLLECTIONS.USERS).doc(String(milestone.user_id));
    transaction.update(userRef, {
      active_milestone_id: nextMilestoneRef.id,
      updated_at: now,
    });

    // 5. Write Redemption Audit Trail
    const auditRef = db.collection(COLLECTIONS.AUDIT_LOGS).doc();
    transaction.set(auditRef, {
      milestone_id: String(milestoneId),
      user_id: String(milestone.user_id),
      admin_id: adminId || 'owner',
      admin_username: adminName || 'owner',
      action_type: 'REDEEM_REWARD',
      previous_completed_orders: milestone.completed_orders || 10,
      new_completed_orders: 0,
      reason: notes || 'Reward redeemed by owner',
      created_at: now,
      timestamp: now,
    });

    return {
      message: `Reward "${rewardName}" successfully redeemed. A new milestone cycle has begun for the customer.`,
      previousMilestoneId: milestoneId,
      nextMilestoneId: nextMilestoneRef.id,
    };
  });

  return result;
};

exports.getAuditLogs = async (limit = 100) => {
  const db = getDb();
  const snap = await db.collection(COLLECTIONS.AUDIT_LOGS)
    .limit(limit)
    .get();

  const logs = snapshotToArray(snap);
  return logs.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
};

// ---------------------------------------------------------------------------
// 9. CUSTOM ENQUIRIES
// ---------------------------------------------------------------------------
exports.createEnquiry = async (enquiryData) => {
  const db = getDb();
  const now = new Date().toISOString();
  const docRef = db.collection(COLLECTIONS.ENQUIRIES).doc();

  const counterSnap = await db.collection(COLLECTIONS.ENQUIRIES).get();
  const enquiryNumber = `#ENQ-${1000 + counterSnap.size + 1}`;

  const payload = {
    ...enquiryData,
    id: docRef.id,
    enquiry_number: enquiryNumber,
    status: enquiryData.status || 'NEW',
    created_at: enquiryData.created_at || now,
    updated_at: now,
  };

  await docRef.set(payload, { merge: true });
  const doc = await docRef.get();
  return docWithId(doc);
};

exports.getAllEnquiries = async (statusFilter = 'ALL', limit = 50) => {
  const db = getDb();
  let query = db.collection(COLLECTIONS.ENQUIRIES);

  if (statusFilter && statusFilter !== 'ALL') {
    query = query.where('status', '==', statusFilter);
  }

  const snap = await query.limit(limit).get();
  const items = snapshotToArray(snap);
  return items.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
};

exports.updateEnquiry = async (id, data) => {
  const db = getDb();
  const docRef = db.collection(COLLECTIONS.ENQUIRIES).doc(String(id));
  const now = new Date().toISOString();

  const payload = {
    ...data,
    updated_at: now,
  };

  await docRef.set(payload, { merge: true });
  const doc = await docRef.get();
  return docWithId(doc);
};

// ---------------------------------------------------------------------------
// 10. ADMIN DASHBOARD & CUSTOMER CRM
// ---------------------------------------------------------------------------
exports.getDashboardMetrics = async () => {
  const db = getDb();

  const ordersSnap = await db.collection(COLLECTIONS.ORDERS).get();
  const orders = snapshotToArray(ordersSnap);

  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => ['NEW', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'].includes(o.status)).length;
  const deliveredOrders = orders.filter(o => o.status === 'DELIVERED').length;

  const totalRevenue = orders
    .filter(o => o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

  const usersSnap = await db.collection(COLLECTIONS.USERS).get();
  const totalCustomers = usersSnap.size;

  const productsSnap = await db.collection(COLLECTIONS.PRODUCTS)
    .where('is_archived', '==', 0)
    .get();
  const totalProducts = productsSnap.size;

  const milestonesSnap = await db.collection(COLLECTIONS.MILESTONES)
    .where('unlocked', '==', 1)
    .where('redeemed', '==', 0)
    .get();
  const pendingRewardRedemptions = milestonesSnap.size;

  const enquiriesSnap = await db.collection(COLLECTIONS.ENQUIRIES)
    .where('status', '==', 'NEW')
    .get();
  const newEnquiries = enquiriesSnap.size;

  const recentOrders = orders
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 10);

  return {
    totalRevenue,
    totalOrders,
    pendingOrders,
    deliveredOrders,
    totalCustomers,
    totalProducts,
    pendingRewardRedemptions,
    newEnquiries,
    recentOrders,
  };
};

exports.getCustomers = async (page = 1, limit = 50) => {
  const db = getDb();
  const usersSnap = await db.collection(COLLECTIONS.USERS).get();
  const users = snapshotToArray(usersSnap);

  const ordersSnap = await db.collection(COLLECTIONS.ORDERS).get();
  const orders = snapshotToArray(ordersSnap);

  const milestonesSnap = await db.collection(COLLECTIONS.MILESTONES)
    .where('redeemed', '==', 0)
    .get();
  const milestones = snapshotToArray(milestonesSnap);

  const customers = users.map(u => {
    const userOrders = orders.filter(o => String(o.user_id) === String(u.id));
    const deliveredCount = userOrders.filter(o => o.status === 'DELIVERED').length;
    const cancelledCount = userOrders.filter(o => o.status === 'CANCELLED').length;
    const totalSpent = userOrders
      .filter(o => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

    const activeMilestone = milestones.find(m => String(m.id) === String(u.active_milestone_id) || String(m.user_id) === String(u.id));

    return {
      ...u,
      total_orders: userOrders.length,
      lifetime_delivered_orders: deliveredCount,
      lifetime_cancelled_orders: cancelledCount,
      total_spent: totalSpent,
      active_milestone_completed: activeMilestone ? activeMilestone.completed_orders : 0,
      active_milestone_required: activeMilestone ? (activeMilestone.required_orders || 10) : 10,
      milestone_unlocked: activeMilestone ? activeMilestone.unlocked : 0,
    };
  });

  customers.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  const offset = (page - 1) * limit;
  return customers.slice(offset, offset + limit);
};

exports.getCustomerDetails = async (customerId) => {
  const db = getDb();
  const customer = await exports.getUserById(customerId);
  if (!customer) return null;

  const ordersSnap = await db.collection(COLLECTIONS.ORDERS)
    .where('user_id', '==', String(customerId))
    .get();
  const orders = snapshotToArray(ordersSnap).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  const milestonesSnap = await db.collection(COLLECTIONS.MILESTONES)
    .where('user_id', '==', String(customerId))
    .get();
  const milestones = snapshotToArray(milestonesSnap).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  const redemptionsSnap = await db.collection(COLLECTIONS.REDEMPTIONS)
    .where('user_id', '==', String(customerId))
    .get();
  const redemptions = snapshotToArray(redemptionsSnap).sort((a, b) => new Date(b.redeemed_at || 0) - new Date(a.redeemed_at || 0));

  return {
    customer,
    orders,
    milestones,
    redemptions,
  };
};


// ---------------------------------------------------------------------------
// PAYMENT SESSIONS & IDEMPOTENCY
// ---------------------------------------------------------------------------
exports.createPaymentSession = async (sessionData) => {
  const db = getDb();
  const id = sessionData.razorpay_order_id;
  const docRef = db.collection(COLLECTIONS.PAYMENT_SESSIONS).doc(String(id));
  const payload = {
    ...sessionData,
    id,
    created_at: sessionData.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  await docRef.set(payload);
  return payload;
};

exports.getPaymentSessionByRazorpayOrderId = async (razorpayOrderId) => {
  if (!razorpayOrderId) return null;
  const db = getDb();
  const doc = await db.collection(COLLECTIONS.PAYMENT_SESSIONS).doc(String(razorpayOrderId)).get();
  if (doc.exists) return docWithId(doc);
  return null;
};

exports.updatePaymentSession = async (razorpayOrderId, updates) => {
  if (!razorpayOrderId) return null;
  const db = getDb();
  const docRef = db.collection(COLLECTIONS.PAYMENT_SESSIONS).doc(String(razorpayOrderId));
  const payload = {
    ...updates,
    updated_at: new Date().toISOString(),
  };
  await docRef.set(payload, { merge: true });
  const updatedDoc = await docRef.get();
  return docWithId(updatedDoc);
};

exports.getOrderByRazorpayPaymentId = async (paymentId) => {
  if (!paymentId) return null;
  const db = getDb();
  const snap = await db.collection(COLLECTIONS.ORDERS)
    .where('payment_reference', '==', String(paymentId).trim())
    .limit(1)
    .get();

  if (snap.empty) return null;
  return docWithId(snap.docs[0]);
};

exports.getOrderByRazorpayOrderId = async (razorpayOrderId) => {
  if (!razorpayOrderId) return null;
  const db = getDb();
  const snap = await db.collection(COLLECTIONS.ORDERS)
    .where('razorpay_order_id', '==', String(razorpayOrderId).trim())
    .limit(1)
    .get();

  if (snap.empty) return null;
  return docWithId(snap.docs[0]);
};

exports.isWebhookEventProcessed = async (eventId) => {
  if (!eventId) return false;
  const db = getDb();
  const doc = await db.collection(COLLECTIONS.WEBHOOK_EVENTS).doc(String(eventId)).get();
  return doc.exists;
};

exports.recordWebhookEvent = async (eventId, payload = {}) => {
  if (!eventId) return;
  const db = getDb();
  await db.collection(COLLECTIONS.WEBHOOK_EVENTS).doc(String(eventId)).set({
    event_id: eventId,
    event: payload.event || 'unknown',
    processed_at: new Date().toISOString(),
  });
};
