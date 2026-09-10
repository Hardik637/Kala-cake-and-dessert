const dbService = require('../services/dbService');

// Get all products with optional filtering by category, search term, or featured flag
exports.getProducts = async (req, res) => {
  try {
    const { category, search, featuredOnly } = req.query;
    const isAll = !category || category === 'all' || category === '1';
    const categoryFilter = isAll ? null : category.trim();

    let products = await dbService.getProducts(categoryFilter, false, false);

    if (featuredOnly === 'true') {
      products = products.filter(p => p.featured === 1 || p.is_featured === 1);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      products = products.filter(p =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.category_name && p.category_name.toLowerCase().includes(q)) ||
        (p.category_slug && p.category_slug.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))
      );
    }

    return res.json({ products });
  } catch (err) {
    console.error('Products fetch error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch products: ' + err.message });
  }
};

// Get all product categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await dbService.getCategories();
    return res.json({ categories });
  } catch (err) {
    console.error('Categories fetch error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch categories: ' + err.message });
  }
};

// Get a single product by ID
exports.getProductById = async (req, res) => {
  try {
    const product = await dbService.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    return res.json({ product });
  } catch (err) {
    console.error('Product fetch error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch product details: ' + err.message });
  }
};

// Validation Helper
function validateProductPayload(data, isUpdate = false) {
  const errors = [];
  const clean = {};

  if (!isUpdate || data.name !== undefined) {
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2 || data.name.trim().length > 120) {
      errors.push('Product name must be between 2 and 120 characters.');
    } else {
      clean.name = data.name.trim();
    }
  }

  if (!isUpdate || data.price !== undefined) {
    const numPrice = Number(data.price);
    if (isNaN(numPrice) || !isFinite(numPrice) || numPrice < 0 || numPrice > 100000) {
      errors.push('Product price must be a valid positive number up to 100,000.');
    } else {
      clean.price = Math.round(numPrice * 100) / 100;
    }
  }

  // French names are no longer used
  clean.french_name = null;

  if (data.description !== undefined) {
    clean.description = data.description ? String(data.description).trim().slice(0, 1000) : null;
  }

  if (data.category_id !== undefined) {
    clean.category_id = Number(data.category_id) || 1;
  }

  if (data.category_slug !== undefined) {
    clean.category_slug = data.category_slug ? String(data.category_slug).trim() : null;
  }

  if (data.category_name !== undefined) {
    clean.category_name = data.category_name ? String(data.category_name).trim() : null;
  }

  if (data.image_url !== undefined) {
    const url = data.image_url ? String(data.image_url).trim() : '';
    if (url && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/')) {
      errors.push('Image URL must be a valid HTTP/HTTPS link or local asset path.');
    } else {
      clean.image_url = url || null;
    }
  }

  if (data.is_featured !== undefined) {
    clean.is_featured = data.is_featured ? 1 : 0;
  }

  // Standardize strictly on available (0 or 1)
  if (data.available !== undefined) {
    clean.available = data.available ? 1 : 0;
  }

  if (data.ingredients !== undefined) {
    clean.ingredients = data.ingredients ? String(data.ingredients).trim().slice(0, 500) : null;
  }

  if (data.allergens !== undefined) {
    clean.allergens = data.allergens ? String(data.allergens).trim().slice(0, 500) : null;
  }

  return { errors, clean };
}

// Admin: Create product
exports.createProduct = async (req, res) => {
  try {
    const { errors, clean } = validateProductPayload(req.body, false);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(' ') });
    }

    const newProduct = await dbService.createProduct(clean);
    return res.status(201).json({ message: 'Product created successfully.', product: newProduct });
  } catch (err) {
    console.error('Product create error:', err.message);
    return res.status(500).json({ error: 'Failed to create product: ' + err.message });
  }
};

// Admin: Update product
exports.updateProduct = async (req, res) => {
  try {
    const existing = await dbService.getProductById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const { errors, clean } = validateProductPayload(req.body, true);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(' ') });
    }

    const updated = await dbService.updateProduct(req.params.id, clean);
    return res.json({ message: 'Product updated successfully.', product: updated });
  } catch (err) {
    console.error('Product update error:', err.message);
    return res.status(500).json({ error: 'Failed to update product: ' + err.message });
  }
};

// Admin: Toggle availability
exports.toggleAvailability = async (req, res) => {
  try {
    const result = await dbService.toggleProductAvailability(req.params.id);
    if (!result) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    return res.json({
      message: `${result.name} is now marked as ${result.available === 1 ? 'Available' : 'Sold Out'}.`,
      available: result.available
    });
  } catch (err) {
    console.error('Toggle availability error:', err.message);
    return res.status(500).json({ error: 'Failed to update product availability: ' + err.message });
  }
};

// Admin: Soft delete / Archive product (Preserves past order snapshots)
exports.deleteProduct = async (req, res) => {
  try {
    const success = await dbService.deleteProduct(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    return res.json({ message: 'Product successfully archived from boutique showcase.' });
  } catch (err) {
    console.error('Delete product error:', err.message);
    return res.status(500).json({ error: 'Failed to delete product: ' + err.message });
  }
};
