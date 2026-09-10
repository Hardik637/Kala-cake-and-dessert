// Central server-side brand configuration
// Note: Business calculations (delivery fee, active rewards, order totals) MUST come from Firestore,
// not these fallback presentation constants.

module.exports = {
  BRAND_NAME: "Kalã",
  TAGLINE: "Cakes and Desserts",
  CURRENCY_SYMBOL: "₹",
  CONTACT_EMAIL: "",
  CONTACT_PHONE: "",
  BOUTIQUE_ADDRESS: "",
  BUSINESS_HOURS: "",
  INSTAGRAM_HANDLE: "@kala_cakesanddesserts",
  INSTAGRAM_URL: "https://www.instagram.com/kala_cakesanddesserts/",
  DEFAULT_DELIVERY_FEE: 50.0,
  PICKUP_ENABLED: 1,
  DEFAULT_MILESTONE_REQUIRED_ORDERS: 10,
  DEFAULT_REWARD_NAME: "Free Dessert Box",
  DEFAULT_REWARD_DESCRIPTION: "A complimentary dessert box on us.",
  JWT_SECRET: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production'
    ? (() => { throw new Error('FATAL: In production, JWT_SECRET must be set in environment variables to a cryptographically strong secret of at least 32 characters.'); })()
    : 'dev_jwt_secret_change_in_production_key_49281'),
  PORT: parseInt(process.env.PORT, 10) || 5000,
};
