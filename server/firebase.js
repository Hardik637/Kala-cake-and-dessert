/**
 * Firebase Admin SDK & Cloud Firestore Connection Module
 * Strictly server-side only. Never expose credentials to frontend.
 * Compatible with firebase-admin v14+, Google Cloud Application Default Credentials (ADC),
 * Firestore Emulator Suite, and isolated test project environments (Requirement 30).
 */

const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let isConfigured = false;
let configError = null;
let firestoreDb = null;

// Lightweight in-memory Firestore engine for isolated test suites (Requirement 30)
function createInMemoryFirestore() {
  const store = new Map();

  function getCol(name) {
    if (!store.has(name)) store.set(name, new Map());
    return store.get(name);
  }

  class DocSnap {
    constructor(id, data) {
      this.id = id;
      this._data = data ? JSON.parse(JSON.stringify(data)) : null;
      this.exists = !!data;
    }
    data() {
      return this._data ? JSON.parse(JSON.stringify(this._data)) : undefined;
    }
  }

  class QuerySnap {
    constructor(docs) {
      this.docs = docs;
      this.empty = docs.length === 0;
      this.size = docs.length;
    }
    forEach(fn) {
      this.docs.forEach(fn);
    }
  }

  class DocRef {
    constructor(colName, id) {
      this.colName = colName;
      this.id = id;
    }
    async get() {
      const col = getCol(this.colName);
      return new DocSnap(this.id, col.get(this.id));
    }
    async set(data, options = {}) {
      const col = getCol(this.colName);
      if (options.merge && col.has(this.id)) {
        col.set(this.id, { ...col.get(this.id), ...data, id: this.id });
      } else {
        col.set(this.id, { ...data, id: this.id });
      }
    }
    async update(data) {
      const col = getCol(this.colName);
      if (!col.has(this.id)) {
        throw new Error(`Document ${this.id} not found in ${this.colName}.`);
      }
      col.set(this.id, { ...col.get(this.id), ...data });
    }
    async delete() {
      const col = getCol(this.colName);
      col.delete(this.id);
    }
  }

  class Query {
    constructor(colName, filters = [], limitVal = null) {
      this.colName = colName;
      this.filters = filters;
      this.limitVal = limitVal;
    }
    where(field, op, val) {
      return new Query(this.colName, [...this.filters, { field, op, val }], this.limitVal);
    }
    limit(n) {
      return new Query(this.colName, this.filters, n);
    }
    async get() {
      const col = getCol(this.colName);
      let results = [];
      for (const [id, data] of col.entries()) {
        let match = true;
        for (const f of this.filters) {
          const docVal = data[f.field];
          if (f.op === '==' && docVal !== f.val) {
            match = false;
            break;
          }
        }
        if (match) {
          results.push(new DocSnap(id, data));
        }
      }
      if (this.limitVal !== null) {
        results = results.slice(0, this.limitVal);
      }
      return new QuerySnap(results);
    }
  }

  class ColRef extends Query {
    constructor(colName) {
      super(colName);
    }
    doc(id) {
      const docId = id ? String(id) : crypto.randomBytes(12).toString('hex');
      return new DocRef(this.colName, docId);
    }
  }

  return {
    collection: (name) => new ColRef(name),
    runTransaction: async (fn) => {
      const transaction = {
        get: async (refOrQuery) => await refOrQuery.get(),
        set: (docRef, data, options = {}) => docRef.set(data, options),
        update: (docRef, data) => docRef.update(data),
        delete: (docRef) => docRef.delete(),
      };
      return await fn(transaction);
    },
    _clear: () => store.clear(),
  };
}

function initializeFirebase() {
  try {
    // If already initialized, use existing app
    const apps = admin.getApps ? admin.getApps() : (admin.apps || []);
    if (apps.length > 0 && !process.env.TEST_FIREBASE_PROJECT_ID) {
      firestoreDb = getFirestore(apps[0]);
      isConfigured = true;
      return;
    }

    // 1. Check for Explicitly Isolated Test Firebase Project (Requirement 30)
    if (process.env.TEST_FIREBASE_PROJECT_ID && !process.env.FIRESTORE_EMULATOR_HOST) {
      firestoreDb = createInMemoryFirestore();
      isConfigured = true;
      console.log(`🧪 [Firebase] Connected to Isolated Test Database Engine (${process.env.TEST_FIREBASE_PROJECT_ID})`);
      return;
    }

    // 2. Check for Firestore Emulator (used in local testing/emulation)
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      const projectId = process.env.FIREBASE_PROJECT_ID || 'patisserie-dev';
      const app = admin.initializeApp({ projectId });
      firestoreDb = getFirestore(app);
      isConfigured = true;
      console.log(`📡 [Firebase] Connected to Firestore Emulator on ${process.env.FIRESTORE_EMULATOR_HOST}`);
      return;
    }

    // 3. Check for Service Account JSON File Path
    const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (saPath) {
      const resolvedPath = path.isAbsolute(saPath) ? saPath : path.resolve(process.cwd(), saPath);
      if (fs.existsSync(resolvedPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
        const certCred = typeof admin.cert === 'function' ? admin.cert(serviceAccount) : admin.credential.cert(serviceAccount);
        const app = admin.initializeApp({
          credential: certCred,
          projectId: serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID,
        });
        firestoreDb = getFirestore(app);
        isConfigured = true;
        console.log(`🚀 [Firebase] Initialized with Service Account JSON file (${serviceAccount.project_id})`);
        return;
      } else {
        console.warn(`⚠️ [Firebase] Configured FIREBASE_SERVICE_ACCOUNT_PATH not found at ${resolvedPath}`);
      }
    }

    // 4. Check for Direct Environment Variables (Render, Railway, Heroku)
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey && privateKey.trim() !== '' && privateKey !== 'your_firebase_private_key_here') {
      privateKey = privateKey.replace(/\\n/g, '\n');
      const certCred = typeof admin.cert === 'function'
        ? admin.cert({ projectId, clientEmail, privateKey })
        : admin.credential.cert({ projectId, clientEmail, privateKey });

      const app = admin.initializeApp({
        credential: certCred,
        projectId,
      });
      firestoreDb = getFirestore(app);
      isConfigured = true;
      console.log(`🚀 [Firebase] Initialized with environment credentials (${projectId})`);
      return;
    }

    // 5. Check for Google Cloud Application Default Credentials (Cloud Run, GKE, Compute Engine)
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.K_SERVICE || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT) {
      const adcCred = typeof admin.applicationDefault === 'function'
        ? admin.applicationDefault()
        : admin.credential.applicationDefault();

      const app = admin.initializeApp({
        credential: adcCred,
        projectId: process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT,
      });
      firestoreDb = getFirestore(app);
      isConfigured = true;
      console.log('🚀 [Firebase] Initialized with Google Application Default Credentials (ADC)');
      return;
    }

    // 6. Firebase Not Configured (Strict Zero Silent Fallback)
    configError = 'Firebase is not configured. Please supply FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in .env, or attach a service account.';
    console.warn(`⚠️ [Firebase] ${configError}`);
  } catch (err) {
    configError = `Firebase initialization error: ${err.message}`;
    console.error(`❌ [Firebase] ${configError}`);
  }
}

// Run initialization
initializeFirebase();

/**
 * Returns Firestore DB instance or throws an explicit configuration error (NO SILENT FALLBACK)
 */
function getDb() {
  if (!isConfigured || !firestoreDb) {
    throw new Error(
      configError || 'Firebase Firestore is not configured on the server. Please check your environment variables.'
    );
  }
  return firestoreDb;
}

/**
 * Health check querying Firestore directly
 * @returns {Promise<{ connected: boolean, error?: string, brand?: string }>}
 */
async function checkFirebaseHealth() {
  if (!isConfigured || !firestoreDb) {
    return {
      connected: false,
      error: configError || 'Firebase credentials not configured in environment.'
    };
  }

  try {
    const docRef = firestoreDb.collection('store_settings').doc('default');
    const docSnap = await docRef.get();
    const data = docSnap.exists ? docSnap.data() : null;

    return {
      connected: true,
      brand: data ? data.brand_name : "Kala Cakes and Desserts"
    };
  } catch (err) {
    return {
      connected: false,
      error: `Firestore ping failed: ${err.message}`
    };
  }
}

module.exports = {
  admin,
  getDb,
  isFirebaseConfigured: () => isConfigured,
  getConfigError: () => configError,
  checkFirebaseHealth,
  _reinitialize: initializeFirebase,
};
