const dbService = require('../services/dbService');

// Customer: Submit Custom Cake Enquiry (Server-Authoritative CUSTOM_CAKE only)
exports.submitEnquiry = async (req, res) => {
  try {
    const name = req.body.name || req.body.customer_name;
    const email = req.body.email || req.body.customer_email;
    const phone = req.body.phone || req.body.customer_phone;
    const preferred_date = req.body.preferred_date || req.body.event_date;
    const servings_quantity = req.body.servings_quantity || req.body.cake_size || (req.body.guest_count ? `${req.body.guest_count} guests` : null);
    const cake_flavour = req.body.cake_flavour;
    const cake_theme = req.body.cake_theme;
    const description = req.body.description || req.body.notes;

    if (!name || !phone || !preferred_date || (!description && !cake_flavour)) {
      return res.status(400).json({
        error: 'Please fill in your name, phone, cake date, and flavor/description.'
      });
    }

    // Always enforce event_type as CUSTOM_CAKE server-side
    const created = await dbService.createEnquiry({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      phone: String(phone).trim(),
      event_type: 'CUSTOM_CAKE',
      preferred_date: String(preferred_date).trim(),
      servings_quantity: servings_quantity ? String(servings_quantity).trim() : 'Unspecified',
      cake_flavour: cake_flavour ? String(cake_flavour).trim() : null,
      cake_theme: cake_theme ? String(cake_theme).trim() : null,
      description: String(description).trim(),
      inspiration_image_url: null,
    });

    return res.status(201).json({
      message: "We'll contact you soon to discuss your cake.",
      enquiry: created
    });
  } catch (err) {
    console.error('Custom cake enquiry submission error:', err.message);
    return res.status(500).json({ error: 'Failed to submit cake enquiry: ' + err.message });
  }
};

// Admin: Get all custom cake enquiries
exports.getAllEnquiries = async (req, res) => {
  try {
    const { status } = req.query;
    const enquiries = await dbService.getAllEnquiries(status || 'ALL');
    return res.json({ enquiries });
  } catch (err) {
    console.error('Get enquiries error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch custom enquiries: ' + err.message });
  }
};

// Admin: Update enquiry status and notes
exports.updateEnquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;

    const validStatuses = ['NEW', 'CONTACTED', 'CONFIRMED', 'COMPLETED', 'DECLINED'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid enquiry status.' });
    }

    const updated = await dbService.updateEnquiry(id, {
      status: status || undefined,
      admin_notes: admin_notes !== undefined ? admin_notes : undefined,
    });

    return res.json({ message: 'Enquiry updated successfully.', enquiry: updated });
  } catch (err) {
    console.error('Update enquiry error:', err.message);
    return res.status(500).json({ error: 'Failed to update enquiry: ' + err.message });
  }
};
