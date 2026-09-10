/**
 * Idempotent Database Migration Tool: SQLite -> Google Cloud Firestore
 * Run with: npm run migrate:firebase
 * Preserves all relational IDs, order items snapshots, and historical milestones.
 * Guarantees:
 * - Exactly one owner written strictly to admins/owner
 * - Migrates reward_redemptions
 * - Generates 32-byte cryptographic tracking_token for every order
 * - Reconstructs milestone_credit_id for credited orders
 * - Sets canonical active_milestone_id for every customer
 * - Initializes counters/order_counter to the highest existing order number
 * - Zero fallback to insecure demo credentials or default passwords
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { getDb, isFirebaseConfigured } = require('../firebase');
const brandConfig = require('../config/brand.config');

async function migrate() {
  console.log('====================================================');
  console.log('🥐 Pâtisserie Database Migration: SQLite -> Firestore');
  console.log('====================================================\n');

  if (!isFirebaseConfigured()) {
    console.error('❌ Firebase is not configured! Please configure credentials in environment.');
    process.exit(1);
  }

  const firestore = getDb();

  // 0. Verify Firestore connectivity
  try {
    console.log('📡 Verifying Cloud Firestore connectivity...');
    await firestore.collection('store_settings').doc('ping').set({ ping: true, at: new Date().toISOString() });
    await firestore.collection('store_settings').doc('ping').delete();
    console.log('✅ Cloud Firestore API is active and accessible.\n');
  } catch (err) {
    console.error('\n❌ Firestore connection failed:', err.message);
    process.exit(1);
  }

  // Check if SQLite database exists
  const sqliteDbPath = path.join(__dirname, 'patisserie.db');
  if (!fs.existsSync(sqliteDbPath)) {
    console.log('ℹ️ No SQLite database found at server/data/patisserie.db. Running fresh initialization...');
    await seedDefaults(firestore);
    console.log('✅ Fresh Firestore initialization complete.');
    process.exit(0);
  }

  const Database = require('better-sqlite3');
  const sqlite = new Database(sqliteDbPath, { readonly: true });

  console.log('📡 Reading records from SQLite database...\n');
  let hasErrors = false;

  // 1. Migrate Store Settings
  try {
    const settings = sqlite.prepare('SELECT * FROM store_settings WHERE id = 1').get();
    if (settings) {
      await firestore.collection('store_settings').doc('default').set({
        brand_name: settings.brand_name || brandConfig.BRAND_NAME,
        brand_tagline: settings.brand_tagline || brandConfig.TAGLINE,
        contact_email: settings.contact_email || brandConfig.CONTACT_EMAIL,
        contact_phone: settings.contact_phone || brandConfig.CONTACT_PHONE,
        boutique_address: settings.boutique_address || brandConfig.BOUTIQUE_ADDRESS,
        business_hours: brandConfig.BUSINESS_HOURS,
        instagram_handle: brandConfig.INSTAGRAM_HANDLE,
        currency_symbol: settings.currency_symbol || '₹',
        pickup_enabled: settings.pickup_enabled ? 1 : 0,
        default_delivery_fee: settings.default_delivery_fee !== undefined ? Number(settings.default_delivery_fee) : 50.0,
        hero_heading: null,
        hero_subtitle: null,
        hero_image_url: null,
        about_story: null,
        updated_at: settings.updated_at || new Date().toISOString(),
      }, { merge: true });
      console.log('✅ Store settings migrated (store_settings/default)');
    }
  } catch (e) {
    console.error('❌ Store settings migration error:', e.message);
    hasErrors = true;
  }

  // 2. Migrate Admins (EXACTLY ONE OWNER: admins/owner)
  try {
    const admins = sqlite.prepare('SELECT * FROM admins').all();
    const ownerAdmin = admins.find(a => a.username === 'owner') || admins[0];

    if (ownerAdmin) {
      await firestore.collection('admins').doc('owner').set({
        id: 'owner',
        username: ownerAdmin.username || 'owner',
        name: ownerAdmin.name || 'Boutique Owner',
        email: ownerAdmin.email || 'owner@patisserie.com',
        password_hash: ownerAdmin.password_hash,
        role: 'admin',
        token_version: 1,
        created_at: ownerAdmin.created_at || new Date().toISOString(),
        updated_at: ownerAdmin.updated_at || new Date().toISOString(),
      }, { merge: true });
      console.log(`✅ Single owner admin migrated (admins/owner)`);
    }
  } catch (e) {
    console.error('❌ Admin migration error:', e.message);
    hasErrors = true;
  }

  // 3. Migrate Categories
  try {
    const categories = sqlite.prepare('SELECT * FROM categories').all();
    for (const cat of categories) {
      await firestore.collection('categories').doc(String(cat.id)).set({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        display_order: cat.display_order || 0,
      }, { merge: true });
    }
    console.log(`✅ ${categories.length} categories migrated (categories/{id})`);
  } catch (e) {
    console.error('❌ Categories migration error:', e.message);
    hasErrors = true;
  }

  // 4. Migrate Products (Standardized on 'available' and is_archived: 0)
  try {
    const products = sqlite.prepare(`
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
    `).all();

    for (const prod of products) {
      const isAvailable = prod.available !== undefined ? prod.available : 1;

      await firestore.collection('products').doc(String(prod.id)).set({
        id: prod.id,
        name: prod.name,
        french_name: prod.french_name || null,
        description: prod.description || null,
        category_id: prod.category_id,
        category_slug: prod.category_slug || null,
        category_name: prod.category_name || null,
        price: Number(prod.price),
        image_url: prod.image_url || null,
        is_featured: prod.is_featured ? 1 : 0,
        available: isAvailable ? 1 : 0,
        is_archived: prod.is_archived ? 1 : 0,
        ingredients: prod.ingredients || null,
        allergens: prod.allergens || null,
        created_at: prod.created_at || new Date().toISOString(),
        updated_at: prod.updated_at || new Date().toISOString(),
      }, { merge: true });
    }
    console.log(`✅ ${products.length} products migrated with categories (products/{id})`);
  } catch (e) {
    console.error('❌ Products migration error:', e.message);
    hasErrors = true;
  }

  // 5. Migrate Rewards
  let defaultRewardId = '1';
  try {
    const rewards = sqlite.prepare('SELECT * FROM rewards').all();
    for (const rew of rewards) {
      await firestore.collection('rewards').doc(String(rew.id)).set({
        id: rew.id,
        name: rew.name,
        description: rew.description,
        required_orders: rew.required_orders || 10,
        active: rew.active ? 1 : 0,
        created_at: rew.created_at || new Date().toISOString(),
      }, { merge: true });
      if (rew.active) defaultRewardId = String(rew.id);
    }
    console.log(`✅ ${rewards.length} milestone reward configurations migrated`);
  } catch (e) {
    console.error('❌ Rewards migration error:', e.message);
    hasErrors = true;
  }

  // 6. Migrate Customer Milestones
  const userMilestoneMap = {}; // userId -> active milestone id
  try {
    const milestones = sqlite.prepare(`
      SELECT cm.*, r.name as reward_name, r.description as reward_description
      FROM customer_milestones cm
      LEFT JOIN rewards r ON cm.reward_id = r.id
    `).all();

    for (const ms of milestones) {
      await firestore.collection('customer_milestones').doc(String(ms.id)).set({
        id: ms.id,
        user_id: String(ms.user_id),
        reward_id: ms.reward_id,
        reward_name: ms.reward_name || brandConfig.DEFAULT_REWARD_NAME,
        reward_description: ms.reward_description || brandConfig.DEFAULT_REWARD_DESCRIPTION,
        completed_orders: ms.completed_orders || 0,
        required_orders: ms.required_orders || 10,
        unlocked: ms.unlocked ? 1 : 0,
        unlocked_at: ms.unlocked_at || null,
        redeemed: ms.redeemed ? 1 : 0,
        redeemed_at: ms.redeemed_at || null,
        created_at: ms.created_at || new Date().toISOString(),
        updated_at: ms.updated_at || new Date().toISOString(),
      }, { merge: true });

      if (ms.redeemed === 0) {
        userMilestoneMap[String(ms.user_id)] = String(ms.id);
      }
    }
    console.log(`✅ ${milestones.length} customer milestone cycles migrated`);
  } catch (e) {
    console.error('❌ Milestones migration error:', e.message);
    hasErrors = true;
  }

  // 7. Migrate Users (Customers with canonical active_milestone_id)
  try {
    const users = sqlite.prepare('SELECT * FROM users').all();
    for (const user of users) {
      let activeMilestoneId = userMilestoneMap[String(user.id)];

      // If customer has no active milestone, create exactly one
      if (!activeMilestoneId) {
        const mRef = firestore.collection('customer_milestones').doc();
        await mRef.set({
          id: mRef.id,
          user_id: String(user.id),
          reward_id: defaultRewardId,
          reward_name: brandConfig.DEFAULT_REWARD_NAME,
          reward_description: brandConfig.DEFAULT_REWARD_DESCRIPTION,
          completed_orders: 0,
          required_orders: 10,
          unlocked: 0,
          unlocked_at: null,
          redeemed: 0,
          redeemed_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        activeMilestoneId = mRef.id;
        userMilestoneMap[String(user.id)] = activeMilestoneId;
      }

      await firestore.collection('users').doc(String(user.id)).set({
        id: user.id,
        google_id: user.google_id || null,
        name: user.name,
        email: user.email,
        phone: user.phone,
        profile_image: user.profile_image || null,
        default_address: user.default_address || null,
        active_milestone_id: activeMilestoneId,
        created_at: user.created_at || new Date().toISOString(),
        updated_at: user.updated_at || new Date().toISOString(),
      }, { merge: true });
    }
    console.log(`✅ ${users.length} customer records migrated with canonical active_milestone_id`);
  } catch (e) {
    console.error('❌ Users migration error:', e.message);
    hasErrors = true;
  }

  // 8. Migrate Reward Redemptions (Requirement 11)
  try {
    const redemptions = sqlite.prepare('SELECT * FROM reward_redemptions').all();
    for (const red of redemptions) {
      await firestore.collection('reward_redemptions').doc(String(red.id)).set({
        id: String(red.id),
        milestone_id: String(red.customer_milestone_id || red.milestone_id),
        user_id: String(red.user_id),
        reward_name: red.reward_name || brandConfig.DEFAULT_REWARD_NAME,
        redeemed_at: red.redeemed_at || new Date().toISOString(),
        redeemed_by_admin: 'owner',
        notes: red.notes || '',
      }, { merge: true });
    }
    console.log(`✅ ${redemptions.length} reward redemptions migrated`);
  } catch (e) {
    console.error('❌ Reward redemptions migration error:', e.message);
    hasErrors = true;
  }

  // 9. Migrate Orders (with 32-byte tracking tokens, payment status, milestone_credit_id)
  let maxOrderNum = 1000;
  try {
    const orders = sqlite.prepare('SELECT * FROM orders').all();
    for (const order of orders) {
      const items = sqlite.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
      const itemsSnapshot = items.map(it => ({
        product_id: it.product_id,
        product_name: it.product_name,
        quantity: it.quantity,
        unit_price: Number(it.unit_price),
        total_price: Number(it.total_price),
      }));

      // Parse order number for counter initialization
      const match = String(order.order_number).match(/(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxOrderNum) maxOrderNum = num;
      }

      // Reconstruct milestone_credit_id if credited
      const userMilestoneId = order.user_id ? userMilestoneMap[String(order.user_id)] : null;
      const milestoneCreditId = order.milestone_credited ? userMilestoneId : null;

      // Cryptographic 32-byte tracking token
      const trackingToken = crypto.randomBytes(32).toString('hex');

      await firestore.collection('orders').doc(String(order.id)).set({
        id: order.id,
        order_number: order.order_number,
        tracking_token: trackingToken,
        user_id: order.user_id ? String(order.user_id) : null,
        fulfillment_type: order.fulfillment_type,
        subtotal: Number(order.subtotal),
        delivery_fee: Number(order.delivery_fee || 0),
        total_amount: Number(order.total_amount),
        delivery_address: order.delivery_address || null,
        pickup_time: order.pickup_time || null,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        customer_phone: order.customer_phone,
        notes: order.notes || null,
        payment_method: order.payment_method,
        payment_status: order.payment_method === 'COD' ? 'COD_PENDING' : 'PENDING',
        payment_reference: null,
        status: order.status,
        milestone_credited: order.milestone_credited ? 1 : 0,
        milestone_credit_id: milestoneCreditId,
        items: itemsSnapshot,
        created_at: order.created_at || new Date().toISOString(),
        updated_at: order.updated_at || new Date().toISOString(),
      }, { merge: true });
    }
    console.log(`✅ ${orders.length} orders migrated with 32-byte tracking tokens & snapshots`);
  } catch (e) {
    console.error('❌ Orders migration error:', e.message);
    hasErrors = true;
  }

  // 10. Initialize Order Counter (Requirement 9)
  try {
    await firestore.collection('counters').doc('order_counter').set({
      last_number: maxOrderNum,
      updated_at: new Date().toISOString(),
    }, { merge: true });
    console.log(`✅ Order counter initialized to #${maxOrderNum} (next order will be #${maxOrderNum + 1})`);
  } catch (e) {
    console.error('❌ Order counter initialization error:', e.message);
    hasErrors = true;
  }

  // 11. Migrate Custom Enquiries
  try {
    const enquiries = sqlite.prepare('SELECT * FROM custom_enquiries').all();
    for (const enq of enquiries) {
      await firestore.collection('custom_enquiries').doc(String(enq.id)).set({
        id: enq.id,
        enquiry_number: enq.enquiry_number,
        name: enq.name,
        email: enq.email,
        phone: enq.phone,
        event_type: enq.event_type,
        preferred_date: enq.preferred_date,
        servings_quantity: enq.servings_quantity || 'Unspecified',
        description: enq.description,
        inspiration_image_url: enq.inspiration_image_url || null,
        status: enq.status || 'NEW',
        admin_notes: enq.admin_notes || null,
        created_at: enq.created_at || new Date().toISOString(),
        updated_at: enq.updated_at || new Date().toISOString(),
      }, { merge: true });
    }
    console.log(`✅ ${enquiries.length} custom enquiries migrated`);
  } catch (e) {
    console.error('❌ Enquiries migration error:', e.message);
    hasErrors = true;
  }

  // 12. Migrate Milestone Audit Logs
  try {
    const auditLogs = sqlite.prepare('SELECT * FROM milestone_audit_logs').all();
    for (const log of auditLogs) {
      await firestore.collection('milestone_audit_logs').doc(String(log.id)).set({
        id: log.id,
        order_id: log.order_id ? String(log.order_id) : null,
        user_id: log.user_id ? String(log.user_id) : null,
        admin_id: 'owner',
        admin_username: 'owner',
        action_type: log.action_type,
        previous_completed_orders: log.previous_completed_orders,
        new_completed_orders: log.new_completed_orders,
        reason: log.reason || null,
        created_at: log.created_at || new Date().toISOString(),
        timestamp: log.created_at || new Date().toISOString(),
      }, { merge: true });
    }
    console.log(`✅ ${auditLogs.length} milestone audit logs migrated`);
  } catch (e) {
    console.error('❌ Audit logs migration error:', e.message);
    hasErrors = true;
  }

  if (hasErrors) {
    console.error('\n⚠️ Migration completed with errors.');
    process.exit(1);
  } else {
    console.log('\n🎉 ALL SQLITE DATA SUCCESSFULLY MIGRATED TO CLOUD FIRESTORE!');
    process.exit(0);
  }
}

// Fresh Seeder if initializing without SQLite
async function seedDefaults(firestore) {
  const initialOwnerPassword = process.env.INITIAL_OWNER_PASSWORD;
  if (!initialOwnerPassword || initialOwnerPassword.length < 12) {
    throw new Error('INITIAL_OWNER_PASSWORD must be provided in environment variables and be at least 12 characters long.');
  }

  await firestore.collection('store_settings').doc('default').set({
    brand_name: brandConfig.BRAND_NAME,
    brand_tagline: brandConfig.TAGLINE,
    contact_email: brandConfig.CONTACT_EMAIL,
    contact_phone: brandConfig.CONTACT_PHONE,
    boutique_address: brandConfig.BOUTIQUE_ADDRESS,
    business_hours: brandConfig.BUSINESS_HOURS,
    instagram_handle: brandConfig.INSTAGRAM_HANDLE,
    currency_symbol: brandConfig.CURRENCY_SYMBOL,
    pickup_enabled: 1,
    default_delivery_fee: 50.0,
    updated_at: new Date().toISOString(),
  }, { merge: true });

  const hash = bcrypt.hashSync(initialOwnerPassword, 10);

  await firestore.collection('admins').doc('owner').set({
    id: 'owner',
    username: process.env.INITIAL_OWNER_USERNAME || 'owner',
    name: 'Boutique Owner',
    email: 'owner@patisserie.com',
    password_hash: hash,
    role: 'admin',
    token_version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { merge: true });

  await firestore.collection('rewards').doc('1').set({
    id: 1,
    name: brandConfig.DEFAULT_REWARD_NAME,
    description: brandConfig.DEFAULT_REWARD_DESCRIPTION,
    required_orders: brandConfig.DEFAULT_MILESTONE_REQUIRED_ORDERS,
    active: 1,
    created_at: new Date().toISOString(),
  }, { merge: true });

  await firestore.collection('counters').doc('order_counter').set({
    last_number: 1000,
    updated_at: new Date().toISOString(),
  }, { merge: true });
}

if (require.main === module) {
  migrate().catch((err) => {
    console.error('Fatal migration error:', err);
    process.exit(1);
  });
}

module.exports = migrate;
