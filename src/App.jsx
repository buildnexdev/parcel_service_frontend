import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import WebsiteView from './components/WebsiteView';
import LoginModal from './components/LoginModal';
import PortalLayout from './components/Portal/PortalLayout';
import DashboardView from './components/Portal/DashboardView';
import OrdersView from './components/Portal/OrdersView';
import VehiclesView from './components/Portal/VehiclesView';
import DriversView from './components/Portal/DriversView';
import StaffView from './components/Portal/StaffView';
import ReportsView from './components/Portal/ReportsView';
import ProfileView from './components/Portal/ProfileView';

const VALID_PORTAL_TABS = ['dashboard', 'orders', 'vehicles', 'drivers', 'staff', 'reports', 'profile'];

function AppContent() {
  const { isAuthenticated } = useAuth();

  // Mode persistence: 'portal' or 'website'
  const [currentMode, setCurrentMode] = useState(() => {
    const savedMode = localStorage.getItem('es_current_mode');
    if (savedMode === 'website' || savedMode === 'portal') {
      return savedMode;
    }
    return isAuthenticated ? 'portal' : 'website';
  });

  // Tab persistence: reads from URL hash or localStorage so refresh stays on the same page
  const [portalTab, setPortalTabState] = useState(() => {
    const hash = window.location.hash.replace(/^#/, '').toLowerCase();
    if (VALID_PORTAL_TABS.includes(hash)) {
      return hash;
    }
    const savedTab = localStorage.getItem('es_active_tab');
    if (VALID_PORTAL_TABS.includes(savedTab)) {
      return savedTab;
    }
    return 'dashboard';
  });

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [newOrderTrigger, setNewOrderTrigger] = useState(0);

  // Tab change updates state, localStorage, and browser URL hash
  const setPortalTab = (tab) => {
    if (VALID_PORTAL_TABS.includes(tab)) {
      setPortalTabState(tab);
      localStorage.setItem('es_active_tab', tab);
      if (currentMode === 'portal') {
        window.location.hash = tab;
      }
    }
  };

  // Mode change
  const setMode = (mode) => {
    setCurrentMode(mode);
    localStorage.setItem('es_current_mode', mode);
    if (mode === 'portal') {
      window.location.hash = portalTab;
    }
  };

  // Switch to portal on login
  const handleLoginSuccess = () => {
    setMode('portal');
    const saved = localStorage.getItem('es_active_tab');
    setPortalTab(saved && VALID_PORTAL_TABS.includes(saved) ? saved : 'dashboard');
  };

  const handleOpenNewOrderModal = () => {
    setPortalTab('orders');
    setNewOrderTrigger(prev => prev + 1);
  };

  // Sync mode if authentication status changes
  useEffect(() => {
    if (isAuthenticated) {
      const savedMode = localStorage.getItem('es_current_mode');
      if (savedMode === 'website') {
        setCurrentMode('website');
      } else {
        setCurrentMode('portal');
        localStorage.setItem('es_current_mode', 'portal');
        const hash = window.location.hash.replace(/^#/, '').toLowerCase();
        if (VALID_PORTAL_TABS.includes(hash)) {
          setPortalTabState(hash);
        } else {
          window.location.hash = portalTab;
        }
      }
    } else {
      setCurrentMode('website');
      localStorage.setItem('es_current_mode', 'website');
    }
  }, [isAuthenticated]);

  // Listen to hash changes (back/forward navigation)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#/, '').toLowerCase();
      if (VALID_PORTAL_TABS.includes(hash)) {
        setPortalTabState(hash);
        localStorage.setItem('es_active_tab', hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return (
    <div>
      {currentMode === 'website' ? (
        <>
          <WebsiteView
            onOpenLogin={() => setIsLoginOpen(true)}
            onGoToPortal={() => setMode('portal')}
            isAuthenticated={isAuthenticated}
          />
          <LoginModal
            isOpen={isLoginOpen}
            onClose={() => setIsLoginOpen(false)}
            onLoginSuccess={handleLoginSuccess}
          />
        </>
      ) : (
        <PortalLayout
          activeTab={portalTab}
          onTabChange={setPortalTab}
          onOpenWebsite={() => setMode('website')}
          onOpenNewOrder={handleOpenNewOrderModal}
        >
          {portalTab === 'dashboard' && (
            <DashboardView
              onNavigate={(tab, options) => {
                setPortalTab(tab);
                if (options?.openNewModal) setNewOrderTrigger(prev => prev + 1);
              }}
            />
          )}

          {portalTab === 'orders' && (
            <OrdersView key={newOrderTrigger} defaultOpenNew={newOrderTrigger > 0} />
          )}

          {portalTab === 'vehicles' && (
            <VehiclesView />
          )}

          {portalTab === 'drivers' && (
            <DriversView />
          )}

          {portalTab === 'staff' && (
            <StaffView />
          )}

          {portalTab === 'reports' && (
            <ReportsView />
          )}

          {portalTab === 'profile' && (
            <ProfileView />
          )}
        </PortalLayout>
      )}
    </div>
  );
}

import { ToastProvider } from './context/ToastContext';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}
