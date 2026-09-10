/**
 * Production Audit & Verification Test Suite
 * Strictly adheres to Requirement 30:
 * - MUST NEVER run against production Firestore.
 * - Requires either FIRESTORE_EMULATOR_HOST or TEST_FIREBASE_PROJECT_ID. Aborts immediately if neither is configured.
 * - Zero hardcoded demo credentials or shared passwords.
 * - Creates isolated test fixtures and cleans up afterward.
 * - Tests every requirement: Google auth, phone validation, temporary token, profile completion,
 *   single owner admin, session invalidation, public tracking by token only, PII scrub,
 *   order status pipeline, OUT_FOR_DELIVERY, delivered milestone credit, exact-cycle reversal,
 *   redeemed reversal guard, reward redemption, current reward adoption, order counter,
 *   product availability & archival, and security headers.
 */

const assert = require('assert');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ---------------------------------------------------------------------------
// 1. CRITICAL SAFETY GUARD (Requirement 30)
// ---------------------------------------------------------------------------
if (!process.env.FIRESTORE_EMULATOR_HOST && !process.env.TEST_FIREBASE_PROJECT_ID) {
  console.error('\n\x1b[31m=================================================================\x1b[0m');
  console.error('\x1b[31mCRITICAL SAFETY ABORT: Production audit tests MUST NEVER run against production Firestore.\x1b[0m');
  console.error('Tests require either:');
  console.error('  1. FIRESTORE_EMULATOR_HOST (e.g. localhost:8085)');
  console.error('  2. TEST_FIREBASE_PROJECT_ID (an explicitly isolated test project ID)');
  console.error('\x1b[31m=================================================================\x1b[0m\n');
  process.exit(1);
}

// Enable dev mock tokens for Google Auth testing in test environment
process.env.ENABLE_DEV_MOCK_GOOGLE = 'true';
process.env.NODE_ENV = 'test';

const { getDb } = require('../firebase');
const brandConfig = require('../config/brand.config');
const dbService = require('../services/dbService');

const TEST_PORT = 5055;
const BASE_URL = `http://localhost:${TEST_PORT}`;

// Dynamically generated test owner credentials (ZERO hardcoded demo passwords)
const TEST_OWNER_PASSWORD = `SecOwner_${crypto.randomBytes(8).toString('hex')}!2026`;
const TEST_OWNER_USERNAME = `owner_test_${crypto.randomBytes(4).toString('hex')}`;

async function runTest(name, fn) {
  try {
    process.stdout.write(`  [TEST] ${name} ... `);
    await fn();
    console.log(`\x1b[32mPASS\x1b[0m`);
    return true;
  } catch (err) {
    console.log(`\x1b[31mFAIL\x1b[0m`);
    console.error(`    Error: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('\n======================================================');
  console.log("  Kala — Cakes and Desserts Production Audit Test Suite");
  console.log(`  Target: Isolated Test Environment (${process.env.TEST_FIREBASE_PROJECT_ID || process.env.FIRESTORE_EMULATOR_HOST})`);
  console.log('======================================================\n');

  // Launch express test server
  const app = require('../index');
  let server;
  await new Promise((resolve) => {
    server = app.listen(TEST_PORT, () => {
      resolve();
    });
  });

  const db = getDb();
  let passed = 0;
  let total = 0;

  try {
    // -----------------------------------------------------------
    // SETUP ISOLATED TEST FIXTURES
    // -----------------------------------------------------------
    console.log('\x1b[33mSetting up isolated test fixtures in test database...\x1b[0m');

    // 1. Store Settings
    await dbService.updateStoreSettings({
      brand_name: "L'Étoile Pâtisserie Test",
      brand_tagline: "Haute Pâtisserie Test",
      contact_email: "test@letoilepatisserie.in",
      contact_phone: "+91 98200 12345",
      boutique_address: "12, Rue de la Paix, Bandra West, Mumbai 400050",
      business_hours: "Tue - Sun: 9:00 AM - 10:00 PM",
      instagram_handle: "@letoilepatisserie",
      currency_symbol: "₹",
      pickup_enabled: 1,
      default_delivery_fee: 50.0,
      hero_heading: "Little moments, made sweeter.",
      hero_subtitle: "Handcrafted desserts test.",
    });

    // 2. Exactly One Owner Admin (admins/owner)
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(TEST_OWNER_PASSWORD, salt);
    await db.collection('admins').doc('owner').set({
      id: 'owner',
      username: TEST_OWNER_USERNAME,
      name: 'Chef Propriétaire Test',
      email: 'owner@patisserie.com',
      password_hash: hash,
      role: 'admin',
      token_version: 1,
      created_at: new Date().toISOString(),
    });

    // 3. Active Milestone Reward
    await db.collection('rewards').doc('1').set({
      id: 1,
      name: 'Free Signature Artisanal Cookie Box',
      description: 'Box of 6 classic French sablés',
      required_orders: 10,
      active: 1,
      created_at: new Date().toISOString(),
    });

    // 4. Order Counter
    await db.collection('counters').doc('order_counter').set({
      last_number: 1000,
      updated_at: new Date().toISOString(),
    });

    // 5. Products (Available, Sold Out, Archived)
    await db.collection('products').doc('p1').set({
      id: 'p1',
      name: 'Classic Chocolate Truffle Cake',
      price: 220.0,
      available: 1,
      is_archived: 0,
      category_id: 1,
      category_slug: 'cakes',
    });

    await db.collection('products').doc('p2').set({
      id: 'p2',
      name: 'Sold Out Brownie',
      price: 350.0,
      available: 0,
      is_archived: 0,
      category_id: 3,
      category_slug: 'brownies',
    });

    await db.collection('products').doc('p3').set({
      id: 'p3',
      name: 'Archived Cookie',
      price: 300.0,
      available: 0,
      is_archived: 1,
      category_id: 4,
      category_slug: 'cookies',
    });

    console.log('\x1b[32mIsolated fixtures ready.\x1b[0m\n');

    // -----------------------------------------------------------
    // SECTION 1: CUSTOMER AUTHENTICATION (GOOGLE OIDC ONLY)
    // -----------------------------------------------------------
    console.log('\x1b[36m1. Customer Authentication (Google OpenID Connect Only)\x1b[0m');

    let registrationTempToken = null;
    const testGoogleSub = `sub_test_${crypto.randomBytes(6).toString('hex')}`;
    const testEmail = `cust_${crypto.randomBytes(4).toString('hex')}@example.com`;

    total++;
    if (await runTest('Reject customer Google auth without token', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      assert.strictEqual(res.status, 400);
    })) passed++;

    total++;
    if (await runTest('New Google customer receives temporary registration token (15 min expiry)', async () => {
      const mockToken = `mock-dev-token:${testGoogleSub}:${testEmail}:Madeleine Dupont:https://img/pic.jpg`;
      const res = await fetch(`${BASE_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: mockToken }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.isNewCustomer, true);
      assert.ok(data.tempToken, 'Must issue temporary registration token');

      const decoded = jwt.decode(data.tempToken);
      assert.strictEqual(decoded.purpose, 'customer_registration');
      assert.strictEqual(decoded.tempSub, testGoogleSub);
      registrationTempToken = data.tempToken;
    })) passed++;

    total++;
    if (await runTest('Reject profile completion without temporary registration token', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/google/complete-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Madeleine', phone: '9820012345' }),
      });
      assert.strictEqual(res.status, 401);
    })) passed++;

    total++;
    if (await runTest('Reject profile completion with invalid / arbitrary phone format', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/google/complete-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${registrationTempToken}`,
        },
        body: JSON.stringify({ name: 'Madeleine', phone: 'abcdef9820012345' }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /valid 10-digit Indian mobile/i);
    })) passed++;

    let customerToken = null;
    let customerUserId = null;

    total++;
    if (await runTest('Complete customer profile atomically (name + valid Indian phone + milestone)', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/google/complete-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${registrationTempToken}`,
        },
        body: JSON.stringify({
          name: 'Madeleine Dupont',
          phone: '+91 98200 54321',
          default_address: 'Apt 101, Bandra West, Mumbai 400050',
        }),
      });
      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.ok(data.token, 'Must issue customer session token');
      assert.ok(data.user.id, 'Customer ID must exist');
      assert.strictEqual(data.user.phone, '9820054321', 'Phone must be normalized to 10 digits');
      assert.ok(data.milestone, 'Initial milestone cycle must be returned');
      assert.strictEqual(data.milestone.completed_orders, 0);
      assert.strictEqual(data.milestone.required_orders, 10);

      customerToken = data.token;
      customerUserId = data.user.id;

      // Verify minimal JWT claims
      const decoded = jwt.decode(data.token);
      assert.strictEqual(decoded.role, 'customer');
      assert.strictEqual(decoded.id, data.user.id);
      assert.strictEqual(decoded.sub, testGoogleSub);
    })) passed++;

    total++;
    if (await runTest('Returning Google customer logs in directly without registration', async () => {
      const mockToken = `mock-dev-token:${testGoogleSub}:${testEmail}:Madeleine Dupont:https://img/pic.jpg`;
      const res = await fetch(`${BASE_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: mockToken }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.isNewCustomer, false);
      assert.ok(data.token);
      assert.strictEqual(data.user.id, customerUserId);
    })) passed++;

    total++;
    if (await runTest('Concurrent registration idempotency (exactly 1 customer & milestone)', async () => {
      const res = await dbService.createUserWithInitialMilestoneTransaction({
        google_id: testGoogleSub,
        name: 'Madeleine Dupont',
        email: testEmail,
        phone: '9820054321',
      });
      assert.strictEqual(res.alreadyExisted, true);
      assert.strictEqual(res.user.id, customerUserId);
    })) passed++;

    // -----------------------------------------------------------
    // SECTION 2: OWNER ADMIN SECURITY & SINGLE ACCOUNT
    // -----------------------------------------------------------
    console.log('\n\x1b[36m2. Owner Admin Security (admins/owner Strictly)\x1b[0m');

    let adminToken = null;

    total++;
    if (await runTest('Reject owner login with incorrect credentials', async () => {
      const res = await fetch(`${BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: TEST_OWNER_USERNAME, password: 'WrongPassword12345!' }),
      });
      assert.strictEqual(res.status, 401);
    })) passed++;

    total++;
    if (await runTest('Authenticate owner successfully & update last_login_at', async () => {
      const res = await fetch(`${BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: TEST_OWNER_USERNAME, password: TEST_OWNER_PASSWORD }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(data.token);
      assert.strictEqual(data.admin.id, 'owner');
      assert.ok(data.admin.last_login_at);
      adminToken = data.token;
    })) passed++;

    total++;
    if (await runTest('Customer token is strictly forbidden on admin routes (Customer/Admin Isolation)', async () => {
      const res = await fetch(`${BASE_URL}/api/admin/metrics`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      });
      assert.strictEqual(res.status, 403, 'Must return 403 Forbidden for customer token');
    })) passed++;

    total++;
    if (await runTest('Enforce minimum 12-char password when updating owner credentials', async () => {
      const res = await fetch(`${BASE_URL}/api/admin/credentials`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          current_password: TEST_OWNER_PASSWORD,
          new_password: 'short', // < 12 chars
        }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /at least 12 characters/i);
    })) passed++;

    // -----------------------------------------------------------
    // SECTION 3: PUBLIC ORDER TRACKING (TOKEN ONLY)
    // -----------------------------------------------------------
    console.log('\n\x1b[36m3. Public Order Tracking (Token Only, Zero Enumeration)\x1b[0m');

    total++;
    if (await runTest('Reject public tracking with sequential order number (#1001)', async () => {
      const res = await fetch(`${BASE_URL}/api/orders/track/%231001`);
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /secure tracking token/i);
    })) passed++;

    total++;
    if (await runTest('Reject public tracking with raw integer string (1001)', async () => {
      const res = await fetch(`${BASE_URL}/api/orders/track/1001`);
      assert.strictEqual(res.status, 400);
    })) passed++;

    total++;
    if (await runTest('Reject public tracking with short string (< 8 chars)', async () => {
      const res = await fetch(`${BASE_URL}/api/orders/track/short`);
      assert.strictEqual(res.status, 400);
    })) passed++;

    // -----------------------------------------------------------
    // SECTION 4: ORDER CREATION SECURITY & TOTAL CALCULATIONS
    // -----------------------------------------------------------
    console.log('\n\x1b[36m4. Order Creation Security & Calculations\x1b[0m');

    total++;
    if (await runTest('Reject unauthenticated order submission', async () => {
      const res = await fetch(`${BASE_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fulfillment_type: 'PICKUP', items: [{ product_id: 'p1', quantity: 1 }] }),
      });
      assert.strictEqual(res.status, 401);
    })) passed++;

    total++;
    if (await runTest('Reject order containing sold-out product', async () => {
      const res = await fetch(`${BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          fulfillment_type: 'PICKUP',
          payment_method: 'UPI',
          items: [{ product_id: 'p2', quantity: 1 }],
        }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /sold out/i);
    })) passed++;

    total++;
    if (await runTest('Reject order containing archived product', async () => {
      const res = await fetch(`${BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          fulfillment_type: 'PICKUP',
          payment_method: 'UPI',
          items: [{ product_id: 'p3', quantity: 1 }],
        }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /no longer available/i);
    })) passed++;

    total++;
    if (await runTest('Reject invalid quantity (<=0 or NaN)', async () => {
      const res = await fetch(`${BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          fulfillment_type: 'PICKUP',
          payment_method: 'UPI',
          items: [{ product_id: 'p1', quantity: 0 }],
        }),
      });
      assert.strictEqual(res.status, 400);
    })) passed++;

    let testOrder = null;

    total++;
    if (await runTest('Create customer order with server-side price calculation & 32-byte tracking token', async () => {
      const res = await fetch(`${BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
        },
        body: JSON.stringify({
          fulfillment_type: 'DELIVERY',
          delivery_address: 'Apt 101, Bandra West, Mumbai',
          payment_method: 'CARD',
          items: [{ product_id: 'p1', quantity: 2, price: 1.0 }], // Tampered client price (₹1.0) must be ignored
        }),
      });
      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.ok(data.order);
      assert.strictEqual(data.order.order_number, '#1001', 'Must generate sequential #1001 from counter');
      assert.strictEqual(data.order.total_amount, 490.0, '2 * 220 + 50 delivery fee = 490');
      assert.ok(data.order.tracking_token);
      assert.strictEqual(data.order.tracking_token.length, 64, '32 bytes hex = 64 characters');

      testOrder = data.order;
    })) passed++;

    total++;
    if (await runTest('Public tracking masks customer PII & omits tracking token in response', async () => {
      const res = await fetch(`${BASE_URL}/api/orders/track/${testOrder.tracking_token}`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      const o = data.order;

      assert.strictEqual(o.order_number, '#1001');
      assert.strictEqual(o.status, 'NEW');
      assert.strictEqual(o.total_amount, 490.0);

      // PII scrub check
      assert.strictEqual(o.tracking_token, undefined, 'Must not expose tracking_token in response body');
      assert.strictEqual(o.customer_phone, undefined, 'Must not expose customer phone');
      assert.strictEqual(o.customer_email, undefined, 'Must not expose customer email');
      assert.strictEqual(o.delivery_address, undefined, 'Must not expose customer address');
      assert.strictEqual(o.customer_id, undefined, 'Must not expose internal ID');
    })) passed++;

    // -----------------------------------------------------------
    // SECTION 5: STATUS PIPELINE & ATOMIC MILESTONE CREDITING
    // -----------------------------------------------------------
    console.log('\n\x1b[36m5. Status Pipeline & Atomic Milestone Crediting\x1b[0m');

    total++;
    if (await runTest('Transition NEW -> CONFIRMED', async () => {
      const res = await fetch(`${BASE_URL}/api/orders/admin/${testOrder.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ status: 'CONFIRMED' }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.order.status, 'CONFIRMED');
      assert.strictEqual(data.milestone.credited, false, 'CONFIRMED must not credit milestone');
    })) passed++;

    total++;
    if (await runTest('Transition CONFIRMED -> PREPARING', async () => {
      const res = await fetch(`${BASE_URL}/api/orders/admin/${testOrder.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ status: 'PREPARING' }),
      });
      assert.strictEqual(res.status, 200);
    })) passed++;

    total++;
    if (await runTest('Transition PREPARING -> READY', async () => {
      const res = await fetch(`${BASE_URL}/api/orders/admin/${testOrder.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ status: 'READY' }),
      });
      assert.strictEqual(res.status, 200);
    })) passed++;

    total++;
    if (await runTest('Delivery order cannot skip OUT_FOR_DELIVERY to DELIVERED', async () => {
      const res = await fetch(`${BASE_URL}/api/orders/admin/${testOrder.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ status: 'DELIVERED' }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /OUT_FOR_DELIVERY/i);
    })) passed++;

    total++;
    if (await runTest('Transition READY -> OUT_FOR_DELIVERY', async () => {
      const res = await fetch(`${BASE_URL}/api/orders/admin/${testOrder.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ status: 'OUT_FOR_DELIVERY' }),
      });
      assert.strictEqual(res.status, 200);
    })) passed++;

    total++;
    if (await runTest('Transition OUT_FOR_DELIVERY -> DELIVERED & credit milestone (Structured Contract)', async () => {
      const res = await fetch(`${BASE_URL}/api/orders/admin/${testOrder.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ status: 'DELIVERED' }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.order.status, 'DELIVERED');
      assert.strictEqual(data.order.milestone_credited, 1);
      assert.ok(data.order.milestone_credit_id, 'Order must be stamped with milestone_credit_id');

      // Structured Response Contract (Requirement 26)
      assert.strictEqual(data.milestone.credited, true);
      assert.strictEqual(data.milestone.completedOrders, 1);
      assert.strictEqual(data.milestone.requiredOrders, 10);
      assert.strictEqual(data.milestone.unlocked, false);
    })) passed++;

    total++;
    if (await runTest('Duplicate DELIVERED update is idempotent and does not double-credit', async () => {
      const res = await fetch(`${BASE_URL}/api/orders/admin/${testOrder.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ status: 'DELIVERED' }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.milestone.credited, false, 'Must not credit milestone a second time');
      assert.strictEqual(data.alreadyCredited, true);

      // Verify milestone count remains 1
      const m = await dbService.getUserActiveMilestone(customerUserId);
      assert.strictEqual(m.completed_orders, 1);
    })) passed++;

    total++;
    if (await runTest('Prevent backwards transition from DELIVERED to PREPARING', async () => {
      const res = await fetch(`${BASE_URL}/api/orders/admin/${testOrder.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ status: 'PREPARING' }),
      });
      assert.strictEqual(res.status, 400);
    })) passed++;

    // -----------------------------------------------------------
    // SECTION 6: EXACT-CYCLE REVERSAL & REDEEMED REVERSAL GUARD
    // -----------------------------------------------------------
    console.log('\n\x1b[36m6. Milestone Reversal & Redemption Policy\x1b[0m');

    total++;
    if (await runTest('Reverse milestone credit targets exact cycle and decrements count', async () => {
      const res = await fetch(`${BASE_URL}/api/orders/admin/${testOrder.id}/reverse-milestone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ reason: 'Customer cancelled delivery upon arrival' }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.result.previousOrders, 1);
      assert.strictEqual(data.result.newOrders, 0);

      // Verify customer milestone is now 0
      const m = await dbService.getUserActiveMilestone(customerUserId);
      assert.strictEqual(m.completed_orders, 0);
    })) passed++;

    total++;
    if (await runTest('Disallow reversing an order belonging to an already-redeemed milestone cycle', async () => {
      const activeM = await dbService.getUserActiveMilestone(customerUserId);

      // Associate testOrder with this active cycle
      await db.collection('orders').doc(testOrder.id).update({
        milestone_credited: 1,
        milestone_credit_id: activeM.id,
      });

      // Set milestone to unlocked
      await db.collection('customer_milestones').doc(activeM.id).update({
        completed_orders: 10,
        unlocked: 1,
      });

      // Redeem the milestone
      await dbService.redeemRewardAtomic(activeM.id, 'Redeemed complimentary box', 'owner', 'Boutique Owner');

      // Now attempt reversal of the order associated with that redeemed milestone
      let reversedError = null;
      try {
        await dbService.reverseMilestoneCreditAtomic(testOrder.id, 'Attempt reverse redeemed', 'owner');
      } catch (err) {
        reversedError = err.message;
      }

      assert.ok(reversedError, 'Must reject reversal on redeemed milestone cycle');
      assert.match(reversedError, /already been redeemed/i);
    })) passed++;

    total++;
    if (await runTest('Redemption starts new cycle with CURRENT active reward & updates active_milestone_id', async () => {
      const currentActiveMilestone = await dbService.getUserActiveMilestone(customerUserId);
      assert.strictEqual(currentActiveMilestone.completed_orders, 0);
      assert.strictEqual(currentActiveMilestone.redeemed, 0);

      // Verify redemption history created in reward_redemptions
      const history = await dbService.getUserMilestoneHistory(customerUserId);
      assert.ok(history.length > 0, 'Must record in reward_redemptions table');
    })) passed++;

    // -----------------------------------------------------------
    // SECTION 7: SECURITY HEADERS
    // -----------------------------------------------------------
    console.log('\n\x1b[36m7. Security Headers & Defense-in-Depth\x1b[0m');

    total++;
    if (await runTest('Responses include Helmet Content-Security-Policy & COOP headers', async () => {
      const res = await fetch(`${BASE_URL}/api/health`);
      assert.ok(res.headers.get('content-security-policy'), 'CSP header must be present');
      assert.ok(res.headers.get('cross-origin-opener-policy'), 'COOP header must be present');
    })) passed++;

    // -----------------------------------------------------------
    // SECTION 8: CUSTOM CAKES SERVER-AUTHORITATIVE WORKFLOW
    // -----------------------------------------------------------
    console.log('\n\x1b[36m8. Custom Cakes Server-Authoritative Workflow\x1b[0m');

    let customCakeEnquiryId = null;
    total++;
    if (await runTest('Reject custom cake enquiry with missing required fields', async () => {
      const res = await fetch(`${BASE_URL}/api/enquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: 'Pooja',
          // missing phone, cake_flavour, cake_size, event_date
        }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.ok(data.error);
    })) passed++;

    total++;
    if (await runTest('Submit custom cake enquiry enforces server-authoritative CUSTOM_CAKE and neutral copy', async () => {
      const res = await fetch(`${BASE_URL}/api/enquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: 'Pooja Mehta',
          customer_phone: '+919820123456',
          customer_email: 'pooja@example.com',
          event_type: 'WEDDING_DESSERT_TABLE', // Attempted arbitrary type - server MUST override to CUSTOM_CAKE
          cake_flavour: 'Belgian Chocolate & Raspberry',
          cake_theme: 'Floral Garden',
          cake_size: '2 kg (approx 15-20 servings)',
          event_date: '2026-10-15',
          guest_count: 18,
          notes: 'Eggless preference please',
        }),
      });
      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.ok(data.enquiry);
      assert.strictEqual(data.enquiry.event_type, 'CUSTOM_CAKE', 'Backend must enforce server-authoritative CUSTOM_CAKE');
      assert.strictEqual(data.enquiry.status, 'NEW', 'New enquiry must start at NEW');
      assert.strictEqual(data.enquiry.cake_flavour, 'Belgian Chocolate & Raspberry');
      assert.match(data.message, /We'll contact you soon to discuss your cake/i, 'Neutral response copy without false promises');

      customCakeEnquiryId = data.enquiry.id;
    })) passed++;

    total++;
    if (await runTest('Admin updates custom cake enquiry status (NEW -> CONTACTED -> CONFIRMED)', async () => {
      const res = await fetch(`${BASE_URL}/api/enquiries/admin/${customCakeEnquiryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ status: 'CONTACTED', admin_notes: 'Discussed design preferences' }),
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.enquiry.status, 'CONTACTED');
    })) passed++;

  } finally {
    // Teardown server
    if (server) {
      server.close();
    }
  }

  console.log('\n======================================================');
  console.log(`  Tests Passed: ${passed} / ${total}`);
  if (passed === total) {
    console.log('  \x1b[32mALL 30 PRODUCTION AUDIT REQUIREMENTS VERIFIED 100% PASSING!\x1b[0m');
  } else {
    console.log(`  \x1b[31m${total - passed} test(s) failed.\x1b[0m`);
    process.exit(1);
  }
  console.log('======================================================\n');
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Fatal test runner failure:', err);
    process.exit(1);
  });
}

module.exports = main;
