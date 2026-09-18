const crypto = require('crypto');
let Razorpay;
try {
  Razorpay = require('razorpay');
} catch {
  Razorpay = null;
}

const getKeyId = () => process.env.RAZORPAY_KEY_ID || '';
const getKeySecret = () => process.env.RAZORPAY_KEY_SECRET || '';

const isConfigured = () => {
  const keyId = getKeyId();
  const secret = getKeySecret();
  return Boolean(keyId && secret && !keyId.includes('your_') && !secret.includes('your_'));
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
 * Create an order in Razorpay (or mock order if in development without credentials)
 * @param {Object} options
 * @param {number} options.amount - In INR (rupees)
 * @param {string} options.receipt - Unique internal receipt/order identifier
 * @param {Object} [options.notes] - Additional metadata
 */
exports.createOrder = async ({ amount, receipt, notes = {} }) => {
  const rzp = getInstance();
  const amountInPaise = Math.round(Number(amount) * 100);

  if (rzp) {
    const rzpOrder = await rzp.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: String(receipt).slice(0, 40),
      notes,
    });

    return {
      success: true,
      mode: 'live_or_test',
      razorpay_order_id: rzpOrder.id,
      amount: rzpOrder.amount, // in paise
      currency: rzpOrder.currency,
      key_id: getKeyId(),
    };
  }

  // Graceful development fallback when keys are not yet configured in .env
  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEV_MOCK_GOOGLE === 'true') {
    const mockOrderId = `order_mock_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    return {
      success: true,
      mode: 'mock',
      razorpay_order_id: mockOrderId,
      amount: amountInPaise,
      currency: 'INR',
      key_id: getKeyId() || 'rzp_test_mock_mode',
      mock_note: 'Development mock order generated because RAZORPAY_KEY_ID is not configured in .env',
    };
  }

  throw new Error('Razorpay payment gateway is not configured on the server. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env.');
};

/**
 * Cryptographically verify the payment signature returned by Razorpay
 * @param {Object} params
 * @param {string} params.razorpay_order_id
 * @param {string} params.razorpay_payment_id
 * @param {string} params.razorpay_signature
 */
exports.verifyPaymentSignature = ({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return false;
  }

  if (isConfigured()) {
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', getKeySecret())
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
  }

  // Development mock verification
  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEV_MOCK_GOOGLE === 'true') {
    if (razorpay_order_id.startsWith('order_mock_') && razorpay_signature.startsWith('mock_sig_')) {
      return true;
    }
  }

  return false;
};

exports.isConfigured = isConfigured;
exports.getKeyId = getKeyId;
