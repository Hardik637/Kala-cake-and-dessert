import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, Check, X, Search, Eye, EyeOff, Sparkles, 
  Image as ImageIcon, LayoutGrid, List, AlertTriangle
} from 'lucide-react';
import { BRAND_CONFIG } from '../../config/brand';
import { api } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

// Curated cake and dessert photo presets for quick selection
const PHOTO_PRESETS = [
  { label: 'Chocolate Cake', url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80' },
  { label: 'Layer Celebration Cake', url: 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=800&q=80' },
  { label: 'Dessert Tub', url: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=800&q=80' },
  { label: 'Fudge Brownie', url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80' },
  { label: 'Chocolate Chip Cookies', url: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=800&q=80' },
  { label: 'Butter Cookies', url: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=800&q=80' },
];

const CANONICAL_CATEGORIES = [
  { id: 1, name: 'Baked Cheesecakes', slug: 'baked-cheesecakes' },
  { id: 2, name: 'Brownies', slug: 'brownies' },
  { id: 3, name: 'Cookies', slug: 'cookies' },
  { id: 4, name: 'Desserts', slug: 'desserts' },
  { id: 5, name: 'Healthy Bakes', slug: 'healthy-bakes' },
  { id: 6, name: 'Teacakes', slug: 'teacakes' },
  { id: 7, name: 'Dessert Tubs', slug: 'dessert-tubs' },
  { id: 8, name: 'Cookie Tin', slug: 'cookie-tin' },
];

export default function AdminProductsPage() {
  const { adminToken } = useAuth();
  const { addToast } = useToast();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(CANONICAL_CATEGORIES);
  const [loading, setLoading] = useState(true);

  // Filters & View State
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [editingId, setEditingId] = useState(null);

  // Delete confirmation modal state
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    category_id: 1,
    price: '',
    image_url: PHOTO_PRESETS[0].url,
    ingredients: '',
    allergens: '',
    serving_size: 'Individual Serving',
    available: 1,
    is_featured: 0,
  });

  const fetchProducts = () => {
    setLoading(true);
    api.getProducts()
      .then((res) => setProducts(res.products || []))
      .catch((err) => console.error('Failed to load menu products:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProducts();
    api.getCategories()
      .then((res) => {
        if (res.categories && res.categories.length > 0) {
          setCategories(res.categories);
        }
      })
      .catch((err) => console.error('Failed to load categories:', err));
  }, []);

  const handleOpenAdd = () => {
    setModalMode('add');
    setEditingId(null);
    setForm({
      name: '',
      description: '',
      category_id: categories[0]?.id || 1,
      price: '',
      image_url: PHOTO_PRESETS[0].url,
      ingredients: '',
      allergens: '',
      serving_size: 'Individual Serving',
      available: 1,
      is_featured: 0,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p) => {
    setModalMode('edit');
    setEditingId(p.id);
    setForm({
      name: p.name || '',
      description: p.description || '',
      category_id: p.category_id || categories[0]?.id || 1,
      price: p.price !== undefined ? String(p.price) : '',
      image_url: p.image_url || PHOTO_PRESETS[0].url,
      ingredients: p.ingredients || '',
      allergens: p.allergens || '',
      serving_size: p.serving_size || 'Individual Serving',
      available: p.available !== undefined ? p.available : 1,
      is_featured: p.is_featured || 0,
    });
    setIsModalOpen(true);
  };

  const handleToggleAvailability = async (p, e) => {
    e.stopPropagation();
    const newStatus = p.available === 1 ? 0 : 1;
    const effectiveToken = adminToken || localStorage.getItem('patisserie_admin_token');

    try {
      await api.updateProduct(p.id, { available: newStatus }, effectiveToken);
      setProducts((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, available: newStatus } : item))
      );
      addToast(
        `${p.name} is now ${newStatus === 1 ? 'Available' : 'Sold Out'}.`,
        'success'
      );
    } catch (err) {
      addToast(err.message || 'Failed to update availability.', 'error');
    }
  };

  const handleToggleFeatured = async (p, e) => {
    e.stopPropagation();
    const newStatus = p.is_featured === 1 ? 0 : 1;
    const effectiveToken = adminToken || localStorage.getItem('patisserie_admin_token');

    try {
      await api.updateProduct(p.id, { is_featured: newStatus }, effectiveToken);
      setProducts((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, is_featured: newStatus } : item))
      );
      addToast(
        `${p.name} ${newStatus === 1 ? 'marked as Popular' : 'removed from Popular'}.`,
        'success'
      );
    } catch (err) {
      addToast(err.message || 'Failed to update popular status.', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const effectiveToken = adminToken || localStorage.getItem('patisserie_admin_token');

    try {
      await api.deleteProduct(deleteTarget.id, effectiveToken);
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      addToast(`Archived ${deleteTarget.name} safely.`, 'success');
      setDeleteTarget(null);
    } catch (err) {
      addToast(err.message || 'Failed to archive product.', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const effectiveToken = adminToken || localStorage.getItem('patisserie_admin_token');

    const selectedCat = categories.find(c => String(c.id) === String(form.category_id)) || categories[0];

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      category_id: selectedCat?.id || 1,
      category_slug: selectedCat?.slug || 'cakes',
      category_name: selectedCat?.name || 'Cakes',
      price: parseFloat(form.price),
      image_url: form.image_url.trim(),
      ingredients: form.ingredients.trim() || null,
      allergens: form.allergens.trim() || null,
      serving_size: form.serving_size.trim() || 'Individual Serving',
      available: parseInt(form.available, 10),
      is_featured: parseInt(form.is_featured, 10),
      french_name: null, // Removed customer-facing french name
    };

    try {
      if (modalMode === 'add') {
        const res = await api.createProduct(payload, effectiveToken);
        addToast(`Created ${res.product.name} successfully.`, 'success');
      } else {
        await api.updateProduct(editingId, payload, effectiveToken);
        addToast(`Updated ${payload.name} successfully.`, 'success');
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (err) {
      addToast(err.message || 'Failed to save product.', 'error');
    }
  };

  // Filtered products list
  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      selectedCategory === 'all' ||
      (p.category_slug && p.category_slug.toLowerCase() === selectedCategory.toLowerCase()) ||
      (categories.find(c => c.slug === selectedCategory)?.id === p.category_id);

    const matchesSearch =
      !searchQuery ||
      (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  return (
    <div style={{ width: '100%', boxSizing: 'border-box' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '28px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <span className="section-eyebrow" style={{ marginBottom: '4px' }}>Menu Manager</span>
          <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>Menu Products</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '2px' }}>
            Manage cakes, dessert tubs, brownies, and cookies in your active catalog.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', minHeight: '44px' }}
        >
          <Plus size={18} />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Control Bar: Search, Category Filters, View Switcher */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid var(--color-border)',
          borderRadius: '16px',
          padding: '16px',
          marginBottom: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px',
          }}
        >
          {/* Search Box */}
          <div style={{ position: 'relative', flexGrow: 1, maxWidth: '400px', minWidth: '220px' }}>
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ width: '100%', paddingLeft: '38px', minHeight: '42px', fontSize: '15px' }}
            />
            <Search size={16} style={{ position: 'absolute', left: '13px', top: '13px', color: 'var(--color-text-light)' }} />
          </div>

          {/* View Mode Toggle */}
          <div style={{ display: 'flex', gap: '6px', background: 'var(--color-surface-warm)', padding: '4px', borderRadius: '8px' }}>
            <button
              onClick={() => setViewMode('cards')}
              style={{
                background: viewMode === 'cards' ? '#FFFFFF' : 'none',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.85rem',
                fontWeight: viewMode === 'cards' ? 600 : 400,
                color: viewMode === 'cards' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                boxShadow: viewMode === 'cards' ? 'var(--shadow-sm)' : 'none',
                minHeight: '36px',
              }}
              title="Grid Cards View"
            >
              <LayoutGrid size={16} />
              <span className="desktop-only">Cards</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              style={{
                background: viewMode === 'table' ? '#FFFFFF' : 'none',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.85rem',
                fontWeight: viewMode === 'table' ? 600 : 400,
                color: viewMode === 'table' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                boxShadow: viewMode === 'table' ? 'var(--shadow-sm)' : 'none',
                minHeight: '36px',
              }}
              title="Table View"
            >
              <List size={16} />
              <span className="desktop-only">Table</span>
            </button>
          </div>
        </div>

        {/* Category Pills Bar (4 Canonical Categories) */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          <button
            onClick={() => setSelectedCategory('all')}
            className={`filter-tab ${selectedCategory === 'all' ? 'active' : ''}`}
            style={{ padding: '6px 14px', minHeight: '36px', fontSize: '0.85rem' }}
          >
            All Products ({products.length})
          </button>
          {categories.map((c) => {
            const count = products.filter(
              (p) =>
                (p.category_slug && p.category_slug.toLowerCase() === c.slug.toLowerCase()) ||
                p.category_id === c.id
            ).length;
            return (
              <button
                key={c.id || c.slug}
                onClick={() => setSelectedCategory(c.slug)}
                className={`filter-tab ${selectedCategory === c.slug ? 'active' : ''}`}
                style={{ padding: '6px 14px', minHeight: '36px', fontSize: '0.85rem' }}
              >
                {c.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Product List Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 12px auto' }} />
          <p>Loading products...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div
          style={{
            background: '#FFFFFF',
            border: '1px dashed var(--color-border)',
            borderRadius: '16px',
            padding: '48px 24px',
            textAlign: 'center',
            color: 'var(--color-text-muted)',
          }}
        >
          <p style={{ fontSize: '1.05rem', marginBottom: '16px' }}>No products found matching your filter.</p>
          <button
            onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }}
            className="btn btn-secondary"
            style={{ minHeight: '40px' }}
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        /* CARDS GRID VIEW */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
            gap: '24px',
          }}
        >
          {filteredProducts.map((p) => {
            const isSoldOut = p.available === 0;
            return (
              <div
                key={p.id}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid var(--color-border)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: 'var(--shadow-sm)',
                  position: 'relative',
                }}
              >
                {/* Image */}
                <div style={{ position: 'relative', height: '190px', background: 'var(--color-surface-warm)' }}>
                  <img
                    src={p.image_url}
                    alt={p.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      filter: isSoldOut ? 'grayscale(40%) opacity(0.85)' : 'none',
                    }}
                  />
                  {isSoldOut && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '12px',
                        left: '12px',
                        background: '#991B1B',
                        color: '#FFFFFF',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-full)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}
                    >
                      Sold Out
                    </span>
                  )}
                  {p.is_featured === 1 && !isSoldOut && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '12px',
                        left: '12px',
                        background: 'var(--color-accent)',
                        color: '#FFFFFF',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-full)',
                      }}
                    >
                      Popular
                    </span>
                  )}
                </div>

                {/* Content */}
                <div style={{ padding: '18px 16px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-accent)', fontWeight: 600, marginBottom: '4px' }}>
                    {p.category_name || 'Dessert'}
                  </span>

                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '6px', color: 'var(--color-text-main)' }}>
                    {p.name}
                  </h3>

                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.5, marginBottom: '16px', flexGrow: 1 }}>
                    {p.description}
                  </p>

                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-text-main)', marginBottom: '16px' }}>
                    {BRAND_CONFIG.currency}{Number(p.price).toFixed(0)}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={(e) => handleToggleAvailability(p, e)}
                        className={`btn btn-sm ${p.available === 1 ? 'btn-secondary' : 'btn-primary'}`}
                        style={{ padding: '6px 10px', minHeight: '36px', fontSize: '0.78rem' }}
                        title={p.available === 1 ? 'Mark as Sold Out' : 'Mark as Available'}
                      >
                        {p.available === 1 ? <EyeOff size={14} /> : <Eye size={14} />}
                        <span>{p.available === 1 ? 'Mark Sold Out' : 'Make Available'}</span>
                      </button>

                      <button
                        onClick={(e) => handleToggleFeatured(p, e)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '6px 8px', minHeight: '36px' }}
                        title={p.is_featured === 1 ? 'Remove from Popular' : 'Mark as Popular'}
                      >
                        <Sparkles size={14} color={p.is_featured === 1 ? 'var(--color-gold)' : 'var(--color-text-light)'} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '6px 10px', minHeight: '36px' }}
                        title="Edit Product"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ id: p.id, name: p.name })}
                        className="btn btn-sm"
                        style={{ padding: '6px 10px', minHeight: '36px', background: '#FEE2E2', color: '#991B1B', border: 'none' }}
                        title="Archive Product"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="admin-table-card">
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Popular</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img
                          src={p.image_url}
                          alt={p.name}
                          style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover' }}
                        />
                        <div>
                          <strong style={{ display: 'block', fontSize: '0.95rem' }}>{p.name}</strong>
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{p.serving_size}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: 'var(--color-surface-warm)', color: 'var(--color-primary)' }}>
                        {p.category_name || 'Dessert'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      {BRAND_CONFIG.currency}{Number(p.price).toFixed(0)}
                    </td>
                    <td>
                      <span className={`badge ${p.available === 1 ? 'badge-confirmed' : 'badge-soldout'}`}>
                        {p.available === 1 ? 'Available' : 'Sold Out'}
                      </span>
                    </td>
                    <td>
                      {p.is_featured === 1 ? (
                        <span style={{ color: 'var(--color-accent)', fontWeight: 600, fontSize: '0.82rem' }}>Yes</span>
                      ) : (
                        <span style={{ color: 'var(--color-text-light)', fontSize: '0.82rem' }}>No</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '6px 10px', minHeight: '34px' }}
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ id: p.id, name: p.name })}
                          className="btn btn-sm"
                          style={{ padding: '6px 10px', minHeight: '34px', background: '#FEE2E2', color: '#991B1B', border: 'none' }}
                          title="Archive"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(28, 21, 18, 0.6)',
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '680px',
              maxHeight: '92vh',
              overflowY: 'auto',
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: 'clamp(24px, 4vw, 36px)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                {modalMode === 'add' ? 'Add New Product' : 'Edit Product'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Product Name */}
              <div>
                <label className="form-label">Product Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Classic Chocolate Truffle Cake"
                  className="form-input"
                  style={{ width: '100%', minHeight: '44px' }}
                />
              </div>

              {/* Category & Price */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '16px' }}>
                <div>
                  <label className="form-label">Category *</label>
                  <select
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                    className="form-input"
                    style={{ width: '100%', minHeight: '44px' }}
                  >
                    {categories.map((c) => (
                      <option key={c.id || c.slug} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Price ({BRAND_CONFIG.currency}) *</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="e.g. 650"
                    className="form-input"
                    style={{ width: '100%', minHeight: '44px' }}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="form-label">Description *</label>
                <textarea
                  required
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe your cake or dessert..."
                  className="form-input"
                  style={{ width: '100%', padding: '10px' }}
                />
              </div>

              {/* Photo Preset Selection & URL */}
              <div>
                <label className="form-label">Product Photo</label>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '8px' }}>
                  {PHOTO_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setForm({ ...form, image_url: preset.url })}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-full)',
                        border: '1px solid',
                        borderColor: form.image_url === preset.url ? 'var(--color-accent)' : 'var(--color-border)',
                        background: form.image_url === preset.url ? 'var(--color-surface-warm)' : '#FFFFFF',
                        color: form.image_url === preset.url ? 'var(--color-accent)' : 'var(--color-text-main)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <input
                  type="url"
                  required
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  placeholder="Paste image URL..."
                  className="form-input"
                  style={{ width: '100%', minHeight: '44px' }}
                />
              </div>

              {/* Ingredients & Allergens */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '16px' }}>
                <div>
                  <label className="form-label">Ingredients</label>
                  <input
                    type="text"
                    value={form.ingredients}
                    onChange={(e) => setForm({ ...form, ingredients: e.target.value })}
                    placeholder="e.g. Flour, butter, dark chocolate"
                    className="form-input"
                    style={{ width: '100%', minHeight: '44px' }}
                  />
                </div>

                <div>
                  <label className="form-label">Allergens</label>
                  <input
                    type="text"
                    value={form.allergens}
                    onChange={(e) => setForm({ ...form, allergens: e.target.value })}
                    placeholder="e.g. Contains dairy, nuts"
                    className="form-input"
                    style={{ width: '100%', minHeight: '44px' }}
                  />
                </div>
              </div>

              {/* Serving Size */}
              <div>
                <label className="form-label">Serving Size</label>
                <input
                  type="text"
                  value={form.serving_size}
                  onChange={(e) => setForm({ ...form, serving_size: e.target.value })}
                  placeholder="e.g. 500g (4-6 Servings)"
                  className="form-input"
                  style={{ width: '100%', minHeight: '44px' }}
                />
              </div>

              {/* Status Toggles */}
              <div style={{ display: 'flex', gap: '24px', paddingTop: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input
                    type="checkbox"
                    checked={form.available === 1}
                    onChange={(e) => setForm({ ...form, available: e.target.checked ? 1 : 0 })}
                  />
                  <span>Available for Order</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input
                    type="checkbox"
                    checked={form.is_featured === 1}
                    onChange={(e) => setForm({ ...form, is_featured: e.target.checked ? 1 : 0 })}
                  />
                  <span>Mark as Popular</span>
                </label>
              </div>

              {/* Modal Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ minHeight: '44px', padding: '10px 20px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ minHeight: '44px', padding: '10px 24px' }}
                >
                  {modalMode === 'add' ? 'Create Product' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete / Archive Confirmation Modal */}
      {deleteTarget && (
        <div
          className="modal-overlay"
          onClick={() => setDeleteTarget(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(28, 21, 18, 0.6)',
            zIndex: 1300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '440px',
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '28px 24px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: '#FEE2E2',
                color: '#991B1B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
              }}
            >
              <AlertTriangle size={26} />
            </div>

            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '8px' }}>
              Archive Product?
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '24px' }}>
              Are you sure you want to archive <strong>{deleteTarget.name}</strong>? It will be safely removed from the customer catalog while keeping historical orders intact.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setDeleteTarget(null)}
                className="btn btn-secondary"
                style={{ minHeight: '42px', flex: 1 }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="btn"
                style={{ minHeight: '42px', flex: 1, background: '#991B1B', color: '#FFFFFF', border: 'none' }}
              >
                Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
