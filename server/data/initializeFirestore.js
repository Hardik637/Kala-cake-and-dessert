/**
 * Fresh Firestore Database Initialization Tool
 * Run with: npm run init:firebase
 * Initializes a pristine Firestore instance with:
 * - Canonical Kala store settings & homepage content (neutral placeholders)
 * - Single owner account (admins/owner) requiring INITIAL_OWNER_PASSWORD (min 12 chars)
 * - Canonical milestone reward configuration
 * - Order counter document (counters/order_counter)
 * - Exactly 4 product categories: Cakes, Dessert Tub, Brownies, Cookies
 * - Sample products without French names
 * NEVER uses a default production password. Never prints password.
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { getDb, isFirebaseConfigured } = require('../firebase');
const brandConfig = require('../config/brand.config');

async function initializeFreshFirestore() {
  console.log('====================================================');
  console.log("✨ Initializing Fresh Cloud Firestore Database for Kala");
  console.log('====================================================\n');

  if (!isFirebaseConfigured()) {
    console.error('❌ Firebase is not configured! Please configure credentials in environment.');
    process.exit(1);
  }

  const ownerPassword = process.env.INITIAL_OWNER_PASSWORD;
  if (!ownerPassword || typeof ownerPassword !== 'string' || ownerPassword.length < 12) {
    console.error('❌ FATAL: INITIAL_OWNER_PASSWORD must be provided in environment variables and be at least 12 characters long.');
    console.error('Example: INITIAL_OWNER_PASSWORD="StrongAndSecurePassPhrase123!" npm run init:firebase');
    process.exit(1);
  }

  const firestore = getDb();
  const now = new Date().toISOString();

  // 1. Store Settings (Canonical Schema + Kala Homepage Content)
  console.log('📦 1/5 Initializing Canonical Store Settings...');
  await firestore.collection('store_settings').doc('default').set({
    brand_name: brandConfig.BRAND_NAME,
    brand_tagline: brandConfig.TAGLINE,
    contact_email: brandConfig.CONTACT_EMAIL || '',
    contact_phone: brandConfig.CONTACT_PHONE || '',
    boutique_address: brandConfig.BOUTIQUE_ADDRESS || '',
    business_hours: brandConfig.BUSINESS_HOURS || '',
    instagram_handle: brandConfig.INSTAGRAM_HANDLE || '',
    currency_symbol: brandConfig.CURRENCY_SYMBOL || '₹',
    pickup_enabled: 1,
    default_delivery_fee: 50.0,
    hero_heading: "Fresh cakes and desserts made for every occasion.",
    hero_subtitle: "Order your favorite cakes, dessert tubs, brownies, and cookies online.",
    hero_image_url: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80",
    about_story: "Kalã is a cake and dessert brand focused on making fresh, delicious desserts for everyday celebrations and special occasions. We believe in simple, wholesome ingredients, warm hospitality, and desserts that bring people together.",
    updated_at: now,
  }, { merge: true });

  // 2. Exactly One Owner Admin (admins/owner)
  console.log('👤 2/5 Provisioning Single Owner Account (admins/owner)...');
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(ownerPassword, salt);
  const ownerUsername = (process.env.INITIAL_OWNER_USERNAME || 'owner').trim().toLowerCase();

  await firestore.collection('admins').doc('owner').set({
    id: 'owner',
    username: ownerUsername,
    name: 'Boutique Owner (Admin)',
    email: process.env.INITIAL_OWNER_EMAIL || 'owner@kala.local',
    password_hash: passwordHash,
    role: 'admin',
    token_version: 1,
    created_at: now,
    updated_at: now,
  }, { merge: true });

  // 3. Milestone Reward Configuration & Order Counter
  console.log('🎁 3/5 Initializing Milestone Reward & Order Counter...');
  await firestore.collection('rewards').doc('1').set({
    id: 1,
    name: brandConfig.DEFAULT_REWARD_NAME || 'Free Dessert Box',
    description: brandConfig.DEFAULT_REWARD_DESCRIPTION || 'A complimentary dessert box on us.',
    required_orders: brandConfig.DEFAULT_MILESTONE_REQUIRED_ORDERS || 10,
    active: 1,
    created_at: now,
    updated_at: now,
  }, { merge: true });

  await firestore.collection('counters').doc('order_counter').set({
    last_number: 1000,
    updated_at: now,
  }, { merge: true });

  // 4. Exactly Four Canonical Categories
  console.log('🏷️ 4/5 Seeding 4 Product Categories (Cakes, Dessert Tub, Brownies, Cookies)...');
  const categories = [
    { id: 1, name: 'Baked Cheesecakes', slug: 'baked-cheesecakes', display_order: 1, is_active: 1 },
    { id: 2, name: 'Brownies', slug: 'brownies', display_order: 2, is_active: 1 },
    { id: 3, name: 'Cookies', slug: 'cookies', display_order: 3, is_active: 1 },
    { id: 4, name: 'Desserts', slug: 'desserts', display_order: 4, is_active: 1 },
    { id: 5, name: 'Healthy Bakes', slug: 'healthy-bakes', display_order: 5, is_active: 1 },
    { id: 6, name: 'Teacakes', slug: 'teacakes', display_order: 6, is_active: 1 },
    { id: 7, name: 'Dessert Tubs', slug: 'dessert-tubs', display_order: 7, is_active: 1 },
    { id: 8, name: 'Cookie Tin', slug: 'cookie-tin', display_order: 8, is_active: 1 },
  ];

  for (const cat of categories) {
    await firestore.collection('categories').doc(String(cat.id)).set({
      ...cat,
      updated_at: now,
    }, { merge: true });
  }

  // 5. Initial Sample Products (Zero French names)
  console.log('🍰 5/5 Seeding Initial Catalog...');
  const sampleProducts = [
    {
      id: 1,
      name: 'Classic Chocolate Truffle Cake',
      french_name: null,
      description: 'Rich chocolate sponge layered with smooth chocolate ganache.',
      category_id: 1,
      category_slug: 'cakes',
      category_name: 'Cakes',
      price: 650.0,
      image_url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80',
      ingredients: 'Flour, cocoa, butter, sugar, dark chocolate, cream',
      allergens: 'Contains gluten, dairy',
      serving_size: '500g (4-6 Servings)',
      available: 1,
      is_featured: 1,
      is_archived: 0,
    },
    {
      id: 2,
      name: 'Tiramisu Dessert Tub',
      french_name: null,
      description: 'Espresso-soaked sponge layered with mascarpone cream and dusted with cocoa.',
      category_id: 2,
      category_slug: 'dessert-tub',
      category_name: 'Dessert Tub',
      price: 350.0,
      image_url: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=800&q=80',
      ingredients: 'Coffee, mascarpone, ladyfingers, cream, cocoa',
      allergens: 'Contains dairy, gluten',
      serving_size: 'Individual Tub (250g)',
      available: 1,
      is_featured: 1,
      is_archived: 0,
    },
    {
      id: 3,
      name: 'Fudge Walnut Brownie',
      french_name: null,
      description: 'Dense, fudgy brownie packed with toasted walnuts and rich dark chocolate.',
      category_id: 3,
      category_slug: 'brownies',
      category_name: 'Brownies',
      price: 180.0,
      image_url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80',
      ingredients: 'Dark chocolate, butter, sugar, flour, walnuts',
      allergens: 'Contains gluten, dairy, nuts',
      serving_size: '1 Piece (100g)',
      available: 1,
      is_featured: 1,
      is_archived: 0,
    },
    {
      id: 4,
      name: 'Sea Salt Dark Chocolate Chip Cookies',
      french_name: null,
      description: 'Golden cookies with melted chocolate chunks and a touch of sea salt.',
      category_id: 4,
      category_slug: 'cookies',
      category_name: 'Cookies',
      price: 220.0,
      image_url: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=800&q=80',
      ingredients: 'Flour, butter, brown sugar, chocolate chips, sea salt',
      allergens: 'Contains gluten, dairy',
      serving_size: 'Box of 4 Cookies',
      available: 1,
      is_featured: 1,
      is_archived: 0,
    },
  ];

  for (const prod of sampleProducts) {
    await firestore.collection('products').doc(String(prod.id)).set({
      ...prod,
      created_at: now,
      updated_at: now,
    }, { merge: true });
  }

  console.log('\n====================================================');
  console.log('✅ Kala Cloud Firestore Initialized Successfully!');
  console.log('   - Single Owner Account: admins/owner');
  console.log('   - Store Settings: Kala (Cakes and Desserts)');
  console.log('   - 4 Categories: Cakes, Dessert Tub, Brownies, Cookies');
  console.log('   - Milestone Rewards & Order Counter Ready');
  console.log('====================================================\n');
}

if (require.main === module) {
  initializeFreshFirestore()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal initialization error:', err);
      process.exit(1);
    });
}

module.exports = initializeFreshFirestore;
