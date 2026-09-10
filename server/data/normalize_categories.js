/**
 * Safe, Conservative Category Normalization Script for Cloud Firestore
 *
 * Requirements:
 * 1. Canonical customer categories MUST be exactly:
 *    - Cakes (cakes)
 *    - Dessert Tub (dessert-tub)
 *    - Brownies (brownies)
 *    - Cookies (cookies)
 * 2. Conservative mapping:
 *    - Automatically maps ONLY genuinely obvious products (e.g. cakes to 'cakes', brownies to 'brownies', sable cookies to 'cookies').
 *    - Ambiguous products (macarons, mille-feuille, canelés, tarts, truffles) are preserved, marked with `needs_category_review: true`,
 *      and set to `available: 0` so they are not shown to customers until the owner reviews them in the Admin portal.
 *    - Zero products are deleted.
 *    - Idempotent and safe to run multiple times.
 */

require('dotenv').config();
const { getDb, isFirebaseConfigured } = require('../firebase');

const CANONICAL_CATEGORIES = [
  { id: 1, name: 'Cakes', slug: 'cakes', display_order: 1, is_active: 1 },
  { id: 2, name: 'Dessert Tub', slug: 'dessert-tub', display_order: 2, is_active: 1 },
  { id: 3, name: 'Brownies', slug: 'brownies', display_order: 3, is_active: 1 },
  { id: 4, name: 'Cookies', slug: 'cookies', display_order: 4, is_active: 1 },
];

async function normalizeCategories() {
  console.log('====================================================');
  console.log("📦 Running Safe Category Normalization for Kala");
  console.log('====================================================\n');

  if (!isFirebaseConfigured()) {
    console.error('❌ Firebase is not configured in environment.');
    process.exit(1);
  }

  const db = getDb();
  const batch = db.batch();

  // 1. Upsert the 4 Canonical Categories
  console.log('1. Setting 4 Canonical Categories (Cakes, Dessert Tub, Brownies, Cookies)...');
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

  // Deactivate any other existing categories in Firestore
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
  console.log('   Canonical categories committed.\n');

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

    // Check for obvious matches
    const isObviousCake = (nameLower.includes('cake') || currentSlug === 'cakes') && !nameLower.includes('brownie') && !nameLower.includes('cookie');
    const isObviousBrownie = nameLower.includes('brownie') || currentSlug === 'brownies';
    const isObviousCookie = (nameLower.includes('sable') || nameLower.includes('cookie')) && !nameLower.includes('macaron');
    const isObviousDessertTub = nameLower.includes('tub') || currentSlug === 'dessert-tub';

    if (isObviousCake) {
      console.log(`   [MAPPED -> Cakes] ${doc.id}: ${p.name}`);
      prodBatch.update(doc.ref, {
        category_id: 1,
        category_slug: 'cakes',
        category_name: 'Cakes',
        french_name: null,
        needs_category_review: false,
        updated_at: new Date().toISOString()
      });
      mappedCount++;
    } else if (isObviousBrownie) {
      console.log(`   [MAPPED -> Brownies] ${doc.id}: ${p.name}`);
      prodBatch.update(doc.ref, {
        category_id: 3,
        category_slug: 'brownies',
        category_name: 'Brownies',
        french_name: null,
        needs_category_review: false,
        updated_at: new Date().toISOString()
      });
      mappedCount++;
    } else if (isObviousCookie) {
      console.log(`   [MAPPED -> Cookies] ${doc.id}: ${p.name}`);
      prodBatch.update(doc.ref, {
        category_id: 4,
        category_slug: 'cookies',
        category_name: 'Cookies',
        french_name: null,
        needs_category_review: false,
        updated_at: new Date().toISOString()
      });
      mappedCount++;
    } else if (isObviousDessertTub) {
      console.log(`   [MAPPED -> Dessert Tub] ${doc.id}: ${p.name}`);
      prodBatch.update(doc.ref, {
        category_id: 2,
        category_slug: 'dessert-tub',
        category_name: 'Dessert Tub',
        french_name: null,
        needs_category_review: false,
        updated_at: new Date().toISOString()
      });
      mappedCount++;
    } else {
      // Ambiguous product (macaron, tartlet, mille-feuille, canelé, etc.)
      // Requirement 2: Preserve product, set needs_category_review: true, remove from active customer catalog (available: 0)
      console.log(`   [AMBIGUOUS -> NEEDS REVIEW] ${doc.id}: ${p.name}`);
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
  console.log(`\nCategory normalization finished: ${mappedCount} products mapped, ${reviewCount} products preserved for owner review.`);
}

if (require.main === module) {
  normalizeCategories()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Normalization error:', err);
      process.exit(1);
    });
}

module.exports = normalizeCategories;
