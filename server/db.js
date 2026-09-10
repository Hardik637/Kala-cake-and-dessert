const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'patisserie.db');
const db = new Database(dbPath, { verbose: null });

// Optimization pragmas
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize base schema if tables don't exist
const schemaPath = path.join(dbDir, 'schema.sql');
if (fs.existsSync(schemaPath)) {
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);
}

// ---------------------------------------------------------------------------
// Safe Idempotent Schema Migrations (Google Auth & Single Owner Hardening)
// ---------------------------------------------------------------------------
try {
  // 1. Migrate `users` table for Google OAuth
  const userCols = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);

  if (!userCols.includes('google_id')) {
    db.exec('ALTER TABLE users ADD COLUMN google_id TEXT');
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)');
  }
  if (!userCols.includes('profile_image')) {
    db.exec('ALTER TABLE users ADD COLUMN profile_image TEXT');
  }
  if (!userCols.includes('updated_at')) {
    db.exec('ALTER TABLE users ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP');
  }
  // Remove deprecated customer password_hash if present
  if (userCols.includes('password_hash')) {
    db.exec('ALTER TABLE users DROP COLUMN password_hash');
  }

  // 2. Migrate `admins` table for Single Owner
  const adminCols = db.prepare('PRAGMA table_info(admins)').all().map(c => c.name);

  if (!adminCols.includes('username')) {
    db.exec('ALTER TABLE admins ADD COLUMN username TEXT');
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_admins_username ON admins(username)');
  }
  if (!adminCols.includes('updated_at')) {
    db.exec('ALTER TABLE admins ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP');
  }

  // Ensure single owner has a default username if null
  db.prepare("UPDATE admins SET username = 'owner' WHERE username IS NULL").run();

} catch (migrationErr) {
  console.error('Database migration note:', migrationErr.message);
}

module.exports = db;
