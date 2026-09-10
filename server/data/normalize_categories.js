/**
 * Safe, Conservative Category Normalization Script for Cloud Firestore
 *
 * Requirements:
 * 1. Canonical customer categories MUST be exactly:
 *    - Baked Cheesecakes (baked-cheesecakes)
 *    - Brownies (brownies)
 *    - Cookies (cookies)
 *    - Desserts (desserts)
 *    - Healthy Bakes (healthy-bakes)
 *    - Teacakes (teacakes)
 *    - Dessert Tubs (dessert-tubs)
 *    - Cookie Tin (cookie-tin)
 * 2. Conservative mapping:
 *    - Automatically maps ONLY genuinely obvious products.
 *    - Ambiguous products are preserved with needs_category_review: true, available: 0.
 *    - Zero products deleted.
 *    - Zero historical orders modified.
 *    - Idempotent.
 */

require('dotenv').config();
const { getDb, isFirebaseConfigured } = require('../firebase');

const CANONICAL_CATEGORIES = [
  { id: 1, name: 'Baked Cheesecakes', slug: 'baked-cheesecakes', display_order: 1, is_active: 1 },
  { id: 2, name: 'Brownies', slug: 'brownies', display_order: 2, is_active: 1 },
  { id: 3, name: 'Cookies', slug: 'cookies', display_order: 3, is_active: 1 },
  { id: 4, name: 'Desserts', slug: 'desserts', display_order: 4, is_active: 1 },
  { id: 5, name: 'Healthy Bakes', slug: 'healthy-bakes', display_order: 5, is_active: 1 },
  { id: 6, name: 'Teacakes', slug: 'teacakes', display_order: 6, is_active: 1 },
  { id: 7, name: 'Dessert Tubs', slug: 'dessert-tubs', display_order: 7, is_active: 1 },
  { id: 8, name: 'Cookie Tin', slug: 'cookie-tin', display_order: 8, is_active: 1 },
];

async function normalizeCategories() {
  console.log('====================================================');
  console.log("📦 Running Safe Category Normalization for Kalã");
  console.log('====================================================\n');

  if (!isFirebaseConfigured()) {
    console.error('❌ Firebase is not configured in environment.');
    process.exit(1);
  }

  const db = getDb();
  const batch = db.batch();

  // 1. Upsert the 8 Canonical Categories
  console.log('1. Setting 8 Canonical Categories...');
  for (const cat of CANONICAL_CATEGORIES) {
    const docRef = db.collection('categories').doc(String(cat.id));
    batch.set(docRef, {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      display_order: cat.display_order,
      is_active: 1,
      updated_at: new Date().toISOString()
    }, { merge: true });
  }

  // Deactivate any retired non-canonical categories
  const allCatSnap = await db.collection('categories').get();
  for (const doc of allCatSnap.docs) {
    const data = doc.data();
    const isCanonical = CANONICAL_CATEGORIES.some(c => String(c.id) === doc.id || c.slug === data.slug);
    if (!isCanonical) {
      console.log(`   Retiring non-canonical category: ${doc.id} (${data.name || data.slug})`);
      batch.update(doc.ref, {
        is_active: 0,
        is_archived: 1,
        updated_at: new Date().toISOString()
      });
    }
  }

  await batch.commit();
  console.log('   Canonical 8 categories committed.\n');

  // 2. Conservatively Normalize Products
  console.log('2. Inspecting and Conservatively Normalizing Products...');
  const prodSnap = await db.collection('products').get();
  const prodBatch = db.batch();
  let mappedCount = 0;
  let reviewCount = 0;

  for (const doc of prodSnap.docs) {
    const p = doc.data();
    const nameLower = (p.name || '').toLowerCase();
    const descLower = (p.description || '').toLowerCase();
    const currentSlug = (p.category_slug || '').toLowerCase();

    // Matching criteria
    const isCheesecake = nameLower.includes('cheesecake') || descLower.includes('cheesecake');
    const isBrownie = nameLower.includes('brownie') || currentSlug === 'brownies';
    const isCookieTin = nameLower.includes('cookie tin') || (nameLower.includes('tin') && nameLower.includes('cookie'));
    const isCookie = (nameLower.includes('cookie') || nameLower.includes('sable')) && !isCookieTin;
    const isHealthy = nameLower.includes('healthy') || nameLower.includes('gluten-free') || nameLower.includes('keto') || nameLower.includes('vegan');
    const isTeacake = nameLower.includes('teacake') || nameLower.includes('tea cake') || nameLower.includes('loaf');
    const isDessertTub = nameLower.includes('tub') || currentSlug === 'dessert-tub' || currentSlug === 'dessert-tubs';
    const isGeneralDessert = nameLower.includes('tiramisu') || nameLower.includes('mousse') || nameLower.includes('tart') || nameLower.includes('pudding');

    if (isCheesecake) {
      console.log(`   [MAPPED -> Baked Cheesecakes] ${doc.id}: ${p.name}`);
      prodBatch.update(doc.ref, {
        category_id: 1,
        category_slug: 'baked-cheesecakes',
        category_name: 'Baked Cheesecakes',
        french_name: null,
        needs_category_review: false,
        updated_at: new Date().toISOString()
      });
      mappedCount++;
    } else if (isBrownie) {
      console.log(`   [MAPPED -> Brownies] ${doc.id}: ${p.name}`);
      prodBatch.update(doc.ref, {
        category_id: 2,
        category_slug: 'brownies',
        category_name: 'Brownies',
        french_name: null,
        needs_category_review: false,
        updated_at: new Date().toISOString()
      });
      mappedCount++;
    } else if (isCookieTin) {
      console.log(`   [MAPPED -> Cookie Tin] ${doc.id}: ${p.name}`);
      prodBatch.update(doc.ref, {
        category_id: 8,
        category_slug: 'cookie-tin',
        category_name: 'Cookie Tin',
        french_name: null,
        needs_category_review: false,
        updated_at: new Date().toISOString()
      });
      mappedCount++;
    } else if (isCookie) {
      console.log(`   [MAPPED -> Cookies] ${doc.id}: ${p.name}`);
      prodBatch.update(doc.ref, {
        category_id: 3,
        category_slug: 'cookies',
        category_name: 'Cookies',
        french_name: null,
        needs_category_review: false,
        updated_at: new Date().toISOString()
      });
      mappedCount++;
    } else if (isHealthy) {
      console.log(`   [MAPPED -> Healthy Bakes] ${doc.id}: ${p.name}`);
      prodBatch.update(doc.ref, {
        category_id: 5,
        category_slug: 'healthy-bakes',
        category_name: 'Healthy Bakes',
        french_name: null,
        needs_category_review: false,
        updated_at: new Date().toISOString()
      });
      mappedCount++;
    } else if (isTeacake) {
      console.log(`   [MAPPED -> Teacakes] ${doc.id}: ${p.name}`);
      prodBatch.update(doc.ref, {
        category_id: 6,
        category_slug: 'teacakes',
        category_name: 'Teacakes',
        french_name: null,
        needs_category_review: false,
        updated_at: new Date().toISOString()
      });
      mappedCount++;
    } else if (isDessertTub) {
      console.log(`   [MAPPED -> Dessert Tubs] ${doc.id}: ${p.name}`);
      prodBatch.update(doc.ref, {
        category_id: 7,
        category_slug: 'dessert-tubs',
        category_name: 'Dessert Tubs',
        french_name: null,
        needs_category_review: false,
        updated_at: new Date().toISOString()
      });
      mappedCount++;
    } else if (isGeneralDessert) {
      console.log(`   [MAPPED -> Desserts] ${doc.id}: ${p.name}`);
      prodBatch.update(doc.ref, {
        category_id: 4,
        category_slug: 'desserts',
        category_name: 'Desserts',
        french_name: null,
        needs_category_review: false,
        updated_at: new Date().toISOString()
      });
      mappedCount++;
    } else {
      // Ambiguous item: preserve, flag for owner review, do not display to customers
      console.log(`   ⚠️ [AMBIGUOUS -> Preserved, flagged for review] ${doc.id}: ${p.name}`);
      prodBatch.update(doc.ref, {
        needs_category_review: true,
        available: 0,
        french_name: null,
        updated_at: new Date().toISOString()
      });
      reviewCount++;
    }
  }

  await prodBatch.commit();
  console.log(`\n✅ Normalization Summary:`);
  console.log(`   - ${mappedCount} products clearly mapped to 8 canonical categories`);
  console.log(`   - ${reviewCount} ambiguous products safely preserved with needs_category_review: true`);
  console.log(`   - 0 products or orders were deleted.\n`);
}

if (require.main === module) {
  normalizeCategories()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Normalization failed:', err);
      process.exit(1);
    });
}

module.exports = normalizeCategories;
