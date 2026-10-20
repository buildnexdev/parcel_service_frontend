import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, Package, Truck, Users, UserCheck, FileBarChart, User, LogOut, Globe, Plus, AlertTriangle, X, Menu } from 'lucide-react';

const PortalLayout = ({ activeTab, onTabChange, onOpenWebsite, children, onOpenNewOrder }) => {
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders & Tracking', icon: Package },
    { id: 'vehicles', label: 'Vehicles', icon: Truck },
    { id: 'drivers', label: 'Assigned Drivers', icon: Users },
    ...(user?.role === 'admin' ? [{ id: 'staff', label: 'Staff & Team', icon: UserCheck }] : []),
    { id: 'reports', label: 'Daily Reports', icon: FileBarChart },
    { id: 'profile', label: 'Profile & Password', icon: User }
  ];

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
    onOpenWebsite();
  };

  return (
    <div className="portal-container">
      {/* Mobile Drawer Backdrop */}
      {mobileNavOpen && (
        <div 
          className="portal-backdrop" 
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={`portal-sidebar ${mobileNavOpen ? 'open' : ''}`}>
        <div style={{ padding: '20px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, background: 'linear-gradient(135deg, var(--primary), var(--accent))', color: '#fff', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
              ES
            </div>
            <div>
              <div style={{ fontWeight: 800, fontFamily: 'Outfit', color: '#fff', fontSize: '1.05rem', lineHeight: 1.1 }}>ES TRANSPORTERS</div>
              <div style={{ fontSize: '0.7rem', color: '#fbd38d', fontWeight: 700 }}>STAFF PORTAL</div>
            </div>
          </div>

          {/* Close drawer button on mobile */}
          <button
            type="button"
            className="mobile-only btn btn-xs"
            onClick={() => setMobileNavOpen(false)}
            style={{ color: '#94a3b8', background: 'rgba(255,255,255,0.08)', border: 'none', padding: '6px', cursor: 'pointer' }}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <nav style={{ padding: '20px 12px', flex: 1, overflowY: 'auto' }}>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <div
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  setMobileNavOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  color: isActive ? '#ffffff' : '#94a3b8',
                  background: isActive ? 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)' : 'transparent',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.925rem',
                  marginBottom: 6,
                  cursor: 'pointer',
                  boxShadow: isActive ? '0 4px 16px rgba(37, 99, 235, 0.35)' : 'none',
                  transition: 'all 0.18s ease'
                }}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} style={{ color: isActive ? '#fff' : '#64748b' }} />
                <span>{item.label}</span>
              </div>
            );
          })}
        </nav>

        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.2)' }}>
          <button
            onClick={() => {
              setMobileNavOpen(false);
              onOpenWebsite();
            }}
            className="btn btn-outline btn-sm"
            style={{ width: '100%', marginBottom: 12, color: '#cbd5e1', background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)', justifyContent: 'center' }}
          >
            <Globe size={14} />
            <span>View Public Website</span>
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.875rem' }}>{user?.name || user?.username}</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{user?.branch || 'Karaikal'}</div>
            </div>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="btn btn-outline btn-sm"
              style={{ color: '#f87171', background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(248,113,113,0.3)' }}
              title="Logout"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="portal-main">
        {/* Top Header */}
        <header className="portal-header">
          <div className="flex items-center gap-2" style={{ flex: 1, minWidth: 0 }}>
            {/* Mobile Hamburger Button */}
            <button
              type="button"
              className="mobile-only btn btn-outline btn-sm"
              onClick={() => setMobileNavOpen(true)}
              style={{ padding: '6px 10px', marginRight: 4 }}
              aria-label="Toggle menu"
            >
              <Menu size={18} />
            </button>

            <h2 style={{ fontSize: 'clamp(1.05rem, 2.5vw, 1.35rem)', color: 'var(--text-main)', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {activeTab === 'dashboard' ? 'Dashboard Overview' : (activeTab === 'orders' ? 'Orders & Tracking' : (activeTab === 'vehicles' ? 'Vehicles Directory' : (activeTab === 'drivers' ? 'Assigned Drivers' : (activeTab === 'staff' ? 'Staff & Team Directory' : (activeTab === 'reports' ? 'Daily Reports' : 'Staff Profile')))))}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button className="btn btn-accent btn-sm" onClick={onOpenNewOrder} style={{ padding: '6px 12px' }}>
              <Plus size={16} />
              <span>New Order</span>
            </button>

            <div className="flex items-center gap-2" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '6px 10px', borderRadius: 'var(--radius-md)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', flexShrink: 0, boxShadow: '0 0 0 2px #d1fae5' }}></div>
              <span className="desktop-only" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{user?.branch || 'Karaikal'}</span>
              <span className="badge badge-active" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>{user?.role?.toUpperCase() || 'ADMIN'}</span>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="portal-content">
          {children}
        </div>
      </main>

      {/* In-UI Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
          <div 
            className="modal-box" 
            style={{ 
              maxWidth: '420px', 
              textAlign: 'center', 
              background: '#1e293b', 
              borderRadius: '16px', 
              padding: '28px 24px', 
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', 
              border: '1px solid #334155' 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <AlertTriangle size={30} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', marginBottom: 8 }}>
              Confirm Staff Sign Out
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#ffffff', marginBottom: 24, lineHeight: 1.5 }}>
              Are you sure you want to end your current session? You will be redirected to the public website.
            </p>
            <div className="flex justify-between items-center" style={{ gap: 12 }}>
              <button 
                type="button"
                className="btn" 
                style={{ flex: 1, justifyContent: 'center', background: '#334155', color: '#ffffff', border: '1px solid #475569' }}
                onClick={() => setShowLogoutConfirm(false)}
              >
                Stay Logged In
              </button>
              <button 
                type="button"
                className="btn btn-danger" 
                style={{ flex: 1, justifyContent: 'center', background: '#dc2626', color: '#ffffff' }}
                onClick={handleConfirmLogout}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortalLayout;
