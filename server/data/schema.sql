-- Relational Database Schema for Boutique Pâtisserie
PRAGMA foreign_keys = ON;

-- Store Settings (Easily configurable brand name, pickup toggle, fees)
CREATE TABLE IF NOT EXISTS store_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  brand_name TEXT NOT NULL,
  brand_tagline TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  boutique_address TEXT,
  currency_symbol TEXT DEFAULT '₹',
  pickup_enabled INTEGER DEFAULT 1,
  default_delivery_fee REAL DEFAULT 50.00,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Store Administrators
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Registered Customers
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  google_id TEXT UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  profile_image TEXT,
  default_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Product Categories (Cakes, Pastries, Tarts, Cookies, Brownies, Chocolates, Seasonal)
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  display_order INTEGER DEFAULT 0
);

-- Products Catalog
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  french_name TEXT,
  description TEXT NOT NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  price REAL NOT NULL,
  image_url TEXT NOT NULL,
  ingredients TEXT,
  allergens TEXT,
  serving_size TEXT,
  available INTEGER DEFAULT 1,
  is_featured INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Customer Orders
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  fulfillment_type TEXT NOT NULL CHECK(fulfillment_type IN ('DELIVERY', 'PICKUP')),
  subtotal REAL NOT NULL,
  delivery_fee REAL DEFAULT 0.00,
  total_amount REAL NOT NULL,
  delivery_address TEXT,
  pickup_time TEXT,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  notes TEXT,
  payment_method TEXT NOT NULL CHECK(payment_method IN ('UPI', 'CARD', 'COD')),
  status TEXT NOT NULL DEFAULT 'NEW' CHECK(status IN ('NEW', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED')),
  milestone_credited INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Items within an Order
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  total_price REAL NOT NULL
);

-- Milestone Reward Configurations (Owner-controlled required orders & reward)
CREATE TABLE IF NOT EXISTS rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  required_orders INTEGER NOT NULL DEFAULT 10,
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Customer Active and Historical Milestone Cycles
CREATE TABLE IF NOT EXISTS customer_milestones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  reward_id INTEGER REFERENCES rewards(id) ON DELETE SET NULL,
  completed_orders INTEGER DEFAULT 0,
  required_orders INTEGER DEFAULT 10,
  unlocked INTEGER DEFAULT 0,
  unlocked_at DATETIME,
  redeemed INTEGER DEFAULT 0,
  redeemed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Milestone Reward Redemptions (Audit history of rewards redeemed by admin)
CREATE TABLE IF NOT EXISTS reward_redemptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_milestone_id INTEGER REFERENCES customer_milestones(id),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  reward_name TEXT NOT NULL,
  admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  redeemed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

-- Milestone Audit Logs (Strict accountability for credits and admin reversals)
CREATE TABLE IF NOT EXISTS milestone_audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK(action_type IN ('AUTO_CREDIT', 'ADMIN_REVERSAL', 'MANUAL_ADJUSTMENT')),
  previous_completed_orders INTEGER NOT NULL,
  new_completed_orders INTEGER NOT NULL,
  reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Custom Orders & Event Enquiries
CREATE TABLE IF NOT EXISTS custom_enquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  enquiry_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  event_type TEXT NOT NULL,
  preferred_date TEXT NOT NULL,
  servings_quantity TEXT NOT NULL,
  description TEXT NOT NULL,
  inspiration_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'NEW' CHECK(status IN ('NEW', 'CONTACTED', 'CONFIRMED', 'COMPLETED', 'DECLINED')),
  admin_notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
