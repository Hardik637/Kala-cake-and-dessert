const dbService = require('../services/dbService');

exports.getSettings = async (req, res) => {
  try {
    const settings = await dbService.getStoreSettings();
    return res.json({ settings });
  } catch (err) {
    console.error('Settings fetch error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch store settings: ' + err.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const {
      brand_name,
      brand_tagline,
      contact_email,
      contact_phone,
      boutique_address,
      business_hours,
      instagram_handle,
      currency_symbol,
      pickup_enabled,
      default_delivery_fee,
      hero_heading,
      hero_subtitle,
      hero_image_url,
      about_story,
    } = req.body;

    const deliveryFeeNum = default_delivery_fee !== undefined ? parseFloat(default_delivery_fee) : undefined;
    if (deliveryFeeNum !== undefined && (isNaN(deliveryFeeNum) || !isFinite(deliveryFeeNum) || deliveryFeeNum < 0 || deliveryFeeNum > 10000)) {
      return res.status(400).json({ error: 'Default delivery fee must be a valid positive number.' });
    }

    const updated = await dbService.updateStoreSettings({
      brand_name: brand_name ? String(brand_name).trim() : undefined,
      brand_tagline: brand_tagline !== undefined ? (brand_tagline ? String(brand_tagline).trim() : null) : undefined,
      contact_email: contact_email !== undefined ? (contact_email ? String(contact_email).trim().toLowerCase() : null) : undefined,
      contact_phone: contact_phone !== undefined ? (contact_phone ? String(contact_phone).trim() : null) : undefined,
      boutique_address: boutique_address !== undefined ? (boutique_address ? String(boutique_address).trim() : null) : undefined,
      business_hours: business_hours !== undefined ? (business_hours ? String(business_hours).trim() : null) : undefined,
      instagram_handle: instagram_handle !== undefined ? (instagram_handle ? String(instagram_handle).trim() : null) : undefined,
      currency_symbol: currency_symbol !== undefined ? (currency_symbol ? String(currency_symbol).trim() : '₹') : undefined,
      pickup_enabled: pickup_enabled !== undefined ? (pickup_enabled ? 1 : 0) : undefined,
      default_delivery_fee: deliveryFeeNum !== undefined ? Math.round(deliveryFeeNum * 100) / 100 : undefined,
      hero_heading: hero_heading !== undefined ? (hero_heading ? String(hero_heading).trim() : null) : undefined,
      hero_subtitle: hero_subtitle !== undefined ? (hero_subtitle ? String(hero_subtitle).trim() : null) : undefined,
      hero_image_url: hero_image_url !== undefined ? (hero_image_url ? String(hero_image_url).trim() : null) : undefined,
      about_story: about_story !== undefined ? (about_story ? String(about_story).trim() : null) : undefined,
    });

    return res.json({ message: 'Store settings updated successfully.', settings: updated });
  } catch (err) {
    console.error('Settings update error:', err.message);
    return res.status(500).json({ error: 'Failed to update store settings: ' + err.message });
  }
};
