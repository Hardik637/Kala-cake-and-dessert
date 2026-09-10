const dbService = require('../services/dbService');
const brandConfig = require('../config/brand.config');

/**
 * Customer: Place Order
 * POST /api/orders
 * Strictly requires authenticated customer session (req.user).
 * Customer identity is derived from verified database profile (req.user).
 * Prices, subtotal, delivery fee, and totals are computed strictly server-side from product database and store settings.
 */
exports.placeOrder = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Please sign in to place your artisanal order.' });
    }

    const customer = await dbService.getUserById(req.user.id);
    if (!customer) {
      return res.status(401).json({ error: 'Customer profile not found. Please sign in again.' });
    }

    const {
      items,
      fulfillment_type,
      delivery_address,
      pickup_time,
      payment_method,
      payment_reference,
      notes,
    } = req.body;

    // Validate Items Cart
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Your shopping bag is empty.' });
    }

    if (items.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 items allowed per order.' });
    }

    // Validate Fulfillment Type
    if (!fulfillment_type || !['DELIVERY', 'PICKUP'].includes(fulfillment_type)) {
      return res.status(400).json({ error: 'Please select a valid fulfillment type (DELIVERY or PICKUP).' });
    }

    // Validate Delivery Address
    if (fulfillment_type === 'DELIVERY') {
      if (!delivery_address || typeof delivery_address !== 'string' || delivery_address.trim().length < 5) {
        return res.status(400).json({ error: 'Please provide a complete delivery address.' });
      }
      if (delivery_address.trim().length > 300) {
        return res.status(400).json({ error: 'Delivery address is too long (maximum 300 characters).' });
      }
    }

    // Validate Payment Method (UPI, CARD, COD) - No Apple Pay
    if (!payment_method || !['UPI', 'CARD', 'COD'].includes(payment_method)) {
      return res.status(400).json({ error: 'Please select a valid payment method (UPI, CARD, or COD).' });
    }

    // Separate Payment Status
    const payment_status = payment_method === 'COD' ? 'COD_PENDING' : 'PENDING';

    // Fetch delivery fee from store settings (Never uses hard-coded fallback for backend calculations)
    const settings = await dbService.getStoreSettings();
    const deliveryFee = fulfillment_type === 'DELIVERY' ? Number(settings.default_delivery_fee) : 0.0;

    // Recalculate Subtotal Strictly Server-Side from Product Database
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const productId = item.product_id || item.id;
      if (!productId) {
        return res.status(400).json({ error: 'Invalid product item in bag.' });
      }

      const product = await dbService.getProductById(productId);
      if (!product || product.is_archived === 1) {
        return res.status(400).json({ error: `Item "${item.name || 'Pastry'}" is no longer available in our boutique.` });
      }

      if (product.available === 0) {
        return res.status(400).json({ error: `"${product.name}" is currently sold out for today.` });
      }

      const quantity = parseInt(item.quantity, 10);
      if (isNaN(quantity) || quantity <= 0 || quantity > 50) {
        return res.status(400).json({ error: `Please enter a valid quantity (1-50) for "${product.name}".` });
      }

      // Server-authoritative unit price computation
      let unitPrice = Number(product.price);
      let variantName = null;
      let selectedTopping = item.selected_topping ? String(item.selected_topping).trim().slice(0, 50) : null;

      if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
        if (!item.selected_variant) {
          // If customer did not pass selected_variant, use first variant as baseline
          const defaultVariant = product.variants[0];
          unitPrice = Number(defaultVariant.price);
          variantName = defaultVariant.name;
        } else {
          // Match by id or name (case-insensitive)
          const candidate = String(item.selected_variant).trim().toLowerCase();
          const matchedVariant = product.variants.find(v => 
            String(v.id).toLowerCase() === candidate ||
            String(v.name).toLowerCase() === candidate
          );
          if (matchedVariant) {
            unitPrice = Number(matchedVariant.price);
            variantName = matchedVariant.name;
          } else {
            return res.status(400).json({ error: `Invalid option selected for "${product.name}".` });
          }
        }
      }

      const itemTotal = unitPrice * quantity;
      subtotal += itemTotal;

      // Historical item snapshot
      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        variant_name: variantName,
        selected_topping: selectedTopping,
        quantity,
        unit_price: unitPrice,
        total_price: itemTotal,
      });
    }

    const totalAmount = subtotal + deliveryFee;

    // Save/update customer default address if opted or missing
    const cleanAddress = delivery_address ? delivery_address.trim() : null;
    if (cleanAddress && !customer.default_address) {
      await dbService.updateUser(customer.id, { default_address: cleanAddress });
    }

    // Create Order with unique counter number and cryptographic tracking token
    const order = await dbService.createOrder({
      user_id: String(customer.id),
      fulfillment_type,
      subtotal,
      delivery_fee: deliveryFee,
      total_amount: totalAmount,
      delivery_address: fulfillment_type === 'DELIVERY' ? cleanAddress : null,
      pickup_time: fulfillment_type === 'PICKUP' ? (pickup_time ? String(pickup_time).trim().slice(0, 100) : 'Standard Boutique Hours') : null,
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone,
      notes: notes ? String(notes).trim().slice(0, 300) : null,
      payment_method,
      payment_status,
      payment_reference: payment_reference ? String(payment_reference).trim().slice(0, 100) : null,
      status: 'NEW',
      milestone_credited: 0,
      milestone_credit_id: null,
      items: orderItems,
    });

    return res.status(201).json({
      success: true,
      message: 'Your artisanal order has been successfully placed!',
      order: {
        id: order.id,
        order_number: order.order_number,
        tracking_token: order.tracking_token,
        total_amount: order.total_amount,
        status: order.status,
        fulfillment_type: order.fulfillment_type,
        created_at: order.created_at,
        items: order.items,
      },
    });
  } catch (err) {
    console.error('Order placement error:', err.message);
    return res.status(500).json({ error: 'Failed to place order: ' + err.message });
  }
};

/**
 * Public Order Tracking (Strictly by tracking_token)
 * GET /api/orders/track/:tracking_token
 * Does NOT allow public lookup by predictable order_number, phone, email, or customer ID.
 * Strips customer PII (phone, email, full address, private notes, tracking_token itself).
 */
exports.getOrderTracking = async (req, res) => {
  try {
    const trackingToken = req.params.tracking_token;
    if (!trackingToken || typeof trackingToken !== 'string') {
      return res.status(400).json({ error: 'A valid order tracking token is required.' });
    }

    const trimmed = trackingToken.trim();

    // Reject predictable order number or raw integer strings
    if (trimmed.startsWith('#') || /^\d+$/.test(trimmed)) {
      return res.status(400).json({ error: 'Public tracking requires the secure tracking token provided with your order confirmation.' });
    }

    if (trimmed.length < 8) {
      return res.status(400).json({ error: 'A valid order tracking token is required.' });
    }

    const order = await dbService.getOrderByTrackingToken(trimmed);
    if (!order) {
      return res.status(404).json({ error: 'Order not found. Please verify your tracking link.' });
    }

    // Sanitized Public Representation (Zero Customer PII, No tracking_token in response body)
    const sanitizedOrder = {
      order_number: order.order_number,
      status: order.status,
      fulfillment_type: order.fulfillment_type,
      created_at: order.created_at,
      pickup_time: order.fulfillment_type === 'PICKUP' ? (order.pickup_time || 'Standard Boutique Hours') : null,
      estimated_fulfillment: order.fulfillment_type === 'DELIVERY' ? 'Within 45-60 minutes' : 'Ready for collection during boutique hours',
      items: (order.items || []).map((i) => ({
        product_name: i.product_name || i.name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total_price: i.total_price,
      })),
      subtotal: order.subtotal,
      delivery_fee: order.delivery_fee,
      total_amount: order.total_amount,
    };

    return res.json({ order: sanitizedOrder });
  } catch (err) {
    console.error('Track order error:', err.message);
    return res.status(500).json({ error: 'Failed to track order.' });
  }
};

/**
 * Authenticated Customer: Lifetime Orders
 * GET /api/orders/my-orders
 */
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await dbService.getUserOrders(req.user.id);
    return res.json({ orders });
  } catch (err) {
    console.error('My orders fetch error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch your orders.' });
  }
};

// ---------------------------------------------------------------------------
// ADMIN PROTECTED CONTROLLERS
// ---------------------------------------------------------------------------
exports.getAllOrders = async (req, res) => {
  try {
    const { status, page, limit } = req.query;
    const orders = await dbService.getAllOrders(status || 'ALL', parseInt(page, 10) || 1, parseInt(limit, 10) || 50);
    return res.json({ orders });
  } catch (err) {
    console.error('Admin order list error:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve orders.' });
  }
};

exports.getOrderDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await dbService.getOrderById(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    return res.json({ order });
  } catch (err) {
    console.error('Order details error:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve order details.' });
  }
};

/**
 * Admin: Update Order Status with Pipeline Validation and Atomic Milestone Crediting
 * PATCH /api/orders/admin/:id/status
 * Synchronized pipeline: NEW, CONFIRMED, PREPARING, READY, OUT_FOR_DELIVERY, DELIVERED, CANCELLED
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ['NEW', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid order status. Allowed: ${allowedStatuses.join(', ')}` });
    }

    const adminId = req.admin ? req.admin.id : 'owner';
    const result = await dbService.updateOrderStatusWithMilestoneTransaction(id, status, adminId);

    return res.json({
      message: `Order status updated to ${status}.`,
      order: result.order,
      milestone: {
        credited: !!result.milestoneCredited,
        milestoneId: result.milestoneId || null,
        completedOrders: result.completedOrders !== undefined ? result.completedOrders : null,
        requiredOrders: result.requiredOrders !== undefined ? result.requiredOrders : null,
        unlocked: !!result.unlocked,
      },
      milestoneUpdated: !!result.milestoneCredited,
      alreadyCredited: !!result.alreadyCredited,
      milestoneEvent: result.milestoneCredited ? {
        newCount: result.completedOrders,
        required: result.requiredOrders,
        unlocked: !!result.unlocked,
      } : null,
    });
  } catch (err) {
    console.error('Update order status error:', err.message);
    return res.status(400).json({ error: err.message || 'Failed to update order status.' });
  }
};

/**
 * Admin: Explicit Milestone Credit Reversal (Targets Exact Credited Milestone Cycle)
 * POST /api/orders/admin/:id/reverse-milestone
 */
exports.reverseMilestoneCredit = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      return res.status(400).json({
        error: 'A clear audit reason (minimum 5 characters) is required to reverse a customer milestone credit.',
      });
    }

    const adminId = req.admin ? req.admin.id : 'owner';
    const result = await dbService.reverseMilestoneCreditAtomic(id, reason.trim(), adminId);

    return res.json({
      message: `Milestone credit for order #${result.orderNumber} successfully reversed on milestone cycle ${result.milestoneId}. Customer milestone count adjusted from ${result.previousOrders} to ${result.newOrders}.`,
      result,
    });
  } catch (err) {
    console.error('Reverse milestone error:', err.message);
    return res.status(400).json({ error: err.message || 'Failed to reverse milestone credit.' });
  }
};
