/**
 * LEGACY SQLite Seed Tool (for offline local development only)
 * Note: Production database is Google Cloud Firestore.
 * To seed Firestore, use: npm run init:firestore
 */

const bcrypt = require('bcryptjs');
const db = require('../db');
const brandConfig = require('../config/brand.config');

function seedDatabase() {
  console.log('[LEGACY] Seeding local SQLite database for development...');

  // 1. Seed Store Settings
  const existingSettings = db.prepare('SELECT id FROM store_settings WHERE id = 1').get();
  if (!existingSettings) {
    db.prepare(`
      INSERT INTO store_settings (
        id, brand_name, brand_tagline, contact_email, contact_phone, 
        boutique_address, currency_symbol, pickup_enabled, default_delivery_fee
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      brandConfig.BRAND_NAME,
      brandConfig.TAGLINE,
      brandConfig.CONTACT_EMAIL,
      brandConfig.CONTACT_PHONE,
      brandConfig.BOUTIQUE_ADDRESS,
      brandConfig.CURRENCY_SYMBOL,
      brandConfig.PICKUP_ENABLED,
      brandConfig.DEFAULT_DELIVERY_FEE
    );
    console.log('✅ Store settings seeded');
  }

  // 2. Seed Single Owner Admin
  const adminExists = db.prepare('SELECT id FROM admins WHERE username = ?').get('owner');
  if (!adminExists) {
    const salt = bcrypt.genSaltSync(10);
    const devPassword = process.env.INITIAL_OWNER_PASSWORD || 'DevSecretOwnerPass2026!';
    const hash = bcrypt.hashSync(devPassword, salt);
    db.prepare(`
      INSERT INTO admins (email, username, name, password_hash)
      VALUES (?, ?, ?, ?)
    `).run('owner@patisserie.com', 'owner', 'Chef Propriétaire (Admin)', hash);
    console.log('✅ Single owner admin created: owner@patisserie.com');
  }

  // 3. Seed Default Milestone Reward Config
  const rewardExists = db.prepare('SELECT id FROM rewards WHERE active = 1').get();
  let defaultRewardId;
  if (!rewardExists) {
    const res = db.prepare(`
      INSERT INTO rewards (name, description, required_orders, active)
      VALUES (?, ?, ?, 1)
    `).run(
      brandConfig.DEFAULT_REWARD_NAME,
      brandConfig.DEFAULT_REWARD_DESCRIPTION,
      brandConfig.DEFAULT_MILESTONE_REQUIRED_ORDERS
    );
    defaultRewardId = res.lastInsertRowid;
    console.log('✅ Default milestone reward seeded');
  } else {
    defaultRewardId = rewardExists.id;
  }

  // 4. Seed Sample Registered Customer
  const userExists = db.prepare('SELECT id FROM users WHERE email = ?').get('ananya@example.com');
  let sampleUserId;
  if (!userExists) {
    const res = db.prepare(`
      INSERT INTO users (google_id, name, email, phone, default_address)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      'sample_google_sub_ananya',
      'Ananya Sharma',
      'ananya@example.com',
      '+91 98201 54321',
      'Apartment 4B, Silver Arch Heights, Pali Hill, Bandra West, Mumbai 400050'
    );
    sampleUserId = res.lastInsertRowid;

    // Create initial milestone record for Ananya
    db.prepare(`
      INSERT INTO customer_milestones (
        user_id, reward_id, completed_orders, required_orders, unlocked, redeemed
      ) VALUES (?, ?, 7, 10, 0, 0)
    `).run(sampleUserId, defaultRewardId);

    console.log('✅ Sample customer seeded: ananya@example.com (Google OIDC)');
  } else {
    sampleUserId = userExists.id;
  }

  // 5. Seed Categories
  const categories = [
    { name: 'All', slug: 'all', order: 0 },
    { name: 'Cakes', slug: 'cakes', order: 1 },
    { name: 'Pastries', slug: 'pastries', order: 2 },
    { name: 'Tarts', slug: 'tarts', order: 3 },
    { name: 'Cookies', slug: 'cookies', order: 4 },
    { name: 'Brownies', slug: 'brownies', order: 5 },
    { name: 'Chocolates', slug: 'chocolates', order: 6 },
    { name: 'Seasonal', slug: 'seasonal', order: 7 }
  ];

  const catStmt = db.prepare(`
    INSERT OR IGNORE INTO categories (name, slug, display_order)
    VALUES (?, ?, ?)
  `);

  for (const cat of categories) {
    catStmt.run(cat.name, cat.slug, cat.order);
  }
  console.log('✅ Categories seeded');

  console.log('🎉 SQLite development seeding complete.');
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
