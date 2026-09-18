const crypto = require('crypto');
let Razorpay;
try {
  Razorpay = require('razorpay');
} catch {
  Razorpay = null;
}

const getKeyId = () => process.env.RAZORPAY_KEY_ID || '';
const getKeySecret = () => process.env.RAZORPAY_KEY_SECRET || '';
const getWebhookSecret = () => process.env.RAZORPAY_WEBHOOK_SECRET || '';

const isConfigured = () => {
  const keyId = getKeyId();
  const secret = getKeySecret();
  return Boolean(
    keyId &&
    secret &&
    !keyId.includes('your_') &&
    !secret.includes('your_') &&
    keyId.trim().length > 5 &&
    secret.trim().length > 5
  );
};

let instance = null;
const getInstance = () => {
  if (!isConfigured() || !Razorpay) return null;
  if (!instance) {
    instance = new Razorpay({
      key_id: getKeyId(),
      key_secret: getKeySecret(),
    });
  }
  return instance;
};

/**
 * Create an order in Razorpay
 * @param {Object} options
 * @param {number} options.amount - In INR (rupees)
 * @param {string} options.receipt - Unique internal receipt/order identifier
 * @param {Object} [options.notes] - Additional metadata
 */
exports.createOrder = async ({ amount, receipt, notes = {} }) => {
  const rzp = getInstance();
  const amountInPaise = Math.round(Number(amount) * 100);

  if (!rzp) {
    throw new Error('Razorpay payment gateway is not configured on the server. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env.');
  }

  const rzpOrder = await rzp.orders.create({
    amount: amountInPaise,
    currency: 'INR',
    receipt: String(receipt).slice(0, 40),
    notes,
  });

  return {
    success: true,
    razorpay_order_id: rzpOrder.id,
    amount: rzpOrder.amount, // in paise
    currency: rzpOrder.currency,
    key_id: getKeyId(),
  };
};

/**
 * Cryptographically verify the payment signature returned by Razorpay
 * @param {Object} params
 * @param {string} params.razorpay_order_id
 * @param {string} params.razorpay_payment_id
 * @param {string} params.razorpay_signature
 * @param {string} [params.secretOverride] - Optional secret for test validation
 */
exports.verifyPaymentSignature = ({ razorpay_order_id, razorpay_payment_id, razorpay_signature, secretOverride }) => {
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return false;
  }

  const secret = secretOverride || getKeySecret();
  if (!secret) return false;

  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf8'),
      Buffer.from(razorpay_signature, 'utf8')
    );
  } catch {
    return false;
  }
};

/**
 * Cryptographically verify Razorpay Webhook signature
 * @param {Object} params
 * @param {Buffer|string} params.rawBody
 * @param {string} params.signature - From 'x-razorpay-signature' header
 * @param {string} [params.secretOverride]
 */
exports.verifyWebhookSignature = ({ rawBody, signature, secretOverride }) => {
  const secret = secretOverride || getWebhookSecret();
  if (!secret || !rawBody || !signature) {
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf8'),
      Buffer.from(signature, 'utf8')
    );
  } catch {
    return false;
  }
};

/**
 * Fetch a payment by ID from Razorpay to verify status and amount
 * @param {string} paymentId
 */
exports.fetchPayment = async (paymentId) => {
  const rzp = getInstance();
  if (!rzp || !paymentId) return null;
  try {
    return await rzp.payments.fetch(paymentId);
  } catch (err) {
    console.error('Razorpay fetch payment error:', err.message);
    return null;
  }
};

exports.isConfigured = isConfigured;
exports.getKeyId = getKeyId;
exports.getKeySecret = getKeySecret;
exports.getWebhookSecret = getWebhookSecret;
