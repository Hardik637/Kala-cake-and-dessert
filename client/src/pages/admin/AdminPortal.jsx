import React, { useState } from 'react';
import { LayoutDashboard, ShoppingBag, UtensilsCrossed, Users, Award, MessageSquare, Settings, LogOut, Store } from 'lucide-react';
import { BRAND_CONFIG } from '../../config/brand';
import { useAuth } from '../../context/AuthContext';
import AdminDashboardPage from './AdminDashboardPage';
import AdminOrdersPage from './AdminOrdersPage';
import AdminProductsPage from './AdminProductsPage';
import AdminCustomersPage from './AdminCustomersPage';
import AdminRewardsPage from './AdminRewardsPage';
import AdminEnquiriesPage from './AdminEnquiriesPage';
import AdminSettingsPage from './AdminSettingsPage';

export default function AdminPortal({ onReturnToStore }) {
  const [adminView, setAdminView] = useState('dashboard');
  const { adminUser, logoutAdmin } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders Pipeline', icon: ShoppingBag },
    { id: 'products', label: 'Menu Products', icon: UtensilsCrossed },
    { id: 'customers', label: 'Customers CRM', icon: Users },
    { id: 'rewards', label: 'Rewards & Milestones', icon: Award },
    { id: 'enquiries', label: 'Custom Cakes', icon: MessageSquare },
    { id: 'settings', label: 'Store Settings', icon: Settings },
  ];

  return (
    <div className="admin-layout">
      {/* Left Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <span className="admin-brand-tag">Kala Admin</span>
          <h2 className="admin-brand-title">{BRAND_CONFIG.name}</h2>
          <span style={{ fontSize: '0.75rem', color: '#A89C91' }}>Owner Portal</span>
        </div>

        <nav className="admin-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = adminView === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setAdminView(item.id)}
                className={`admin-nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </div>
            );
          })}
        </nav>

        <div className="admin-sidebar-footer">
          <button
            onClick={onReturnToStore}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              color: '#EDE6DD',
              fontSize: '0.82rem',
              cursor: 'pointer',
              marginBottom: '10px',
              minHeight: '44px',
            }}
          >
            <Store size={15} color="var(--color-gold)" />
            <span>View Website</span>
          </button>

          <button
            onClick={logoutAdmin}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              background: 'none',
              border: 'none',
              color: '#FEB2B2',
              fontSize: '0.82rem',
              cursor: 'pointer',
              minHeight: '44px',
            }}
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="admin-main">
        {/* Topbar */}
        <header className="admin-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            <span>Store Management</span>
            <span>/</span>
            <strong style={{ color: 'var(--color-text-main)', textTransform: 'capitalize' }}>
              {adminView === 'settings' ? 'Store Settings' : adminView === 'enquiries' ? 'Custom Cakes' : adminView}
            </strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-main)', fontWeight: 600 }}>
              {adminUser?.username ? `Owner: @${adminUser.username}` : (adminUser?.name || 'Owner')}
            </span>
          </div>
        </header>

        {/* View Switcher */}
        <main className="admin-content">
          {adminView === 'dashboard' && <AdminDashboardPage setAdminView={setAdminView} />}
          {adminView === 'orders' && <AdminOrdersPage />}
          {adminView === 'products' && <AdminProductsPage />}
          {adminView === 'customers' && <AdminCustomersPage />}
          {adminView === 'rewards' && <AdminRewardsPage />}
          {adminView === 'enquiries' && <AdminEnquiriesPage />}
          {adminView === 'settings' && <AdminSettingsPage />}
        </main>
      </div>
    </div>
  );
}
