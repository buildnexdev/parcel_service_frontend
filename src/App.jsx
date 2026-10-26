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
import DailyExpensesView from './components/Portal/DailyExpensesView';
import AttendanceView from './components/Portal/AttendanceView';
import PermissionsView from './components/Portal/PermissionsView';
import { ToastProvider, useToast } from './context/ToastContext';

const VALID_PORTAL_TABS = [
  'dashboard',
  'orders',
  'expenses',
  'attendance',
  'vehicles',
  'drivers',
  'reports',
  'staff',
  'permissions',
  'profile'
];

function AppContent() {
  const { isAuthenticated, user, hasPermission } = useAuth();
  const { showToast } = useToast();

  // Mode persistence:
  // If NOT authenticated -> ALWAYS 'website'
  // If authenticated -> 'portal' (or 'website' if explicitly toggled)
  const [currentMode, setCurrentMode] = useState(() => {
    if (!isAuthenticated) return 'website';
    const savedMode = localStorage.getItem('es_current_mode');
    return savedMode === 'website' ? 'website' : 'portal';
  });

  // Tab persistence: reads from URL hash or localStorage (latest checked page), defaults to 'dashboard'
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
      // Permission protection on tab switch
      if (tab === 'permissions' && user?.role !== 'admin') {
        showToast('Access restricted: Administrator privilege required for permissions.', 'error');
        return;
      }
      if (['orders', 'expenses', 'attendance', 'reports', 'vehicles', 'drivers'].includes(tab)) {
        if (!hasPermission(tab, 'view')) {
          showToast(`Access denied: You do not have view permissions for ${tab}.`, 'error');
          return;
        }
      }
      if (tab === 'staff' && (user?.role !== 'admin' || !hasPermission('staff', 'view'))) {
        showToast('Access denied: Only administrators can view staff directory.', 'error');
        return;
      }

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
      const latest = localStorage.getItem('es_active_tab');
      const target = (latest && VALID_PORTAL_TABS.includes(latest)) ? latest : portalTab;
      setPortalTabState(target);
      window.location.hash = target;
    } else {
      // Switching back to website: clean URL hash so website sections work smoothly
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  // Switch to portal on login: ALWAYS navigate directly to 'dashboard'
  const handleLoginSuccess = () => {
    localStorage.setItem('es_current_mode', 'portal');
    localStorage.setItem('es_active_tab', 'dashboard');
    setCurrentMode('portal');
    setPortalTabState('dashboard');
    window.location.hash = 'dashboard';
  };

  const handleOpenNewOrderModal = () => {
    if (!hasPermission('orders', 'add')) {
      showToast('You do not have permission to create new orders.', 'error');
      return;
    }
    setPortalTab('orders');
    setNewOrderTrigger(prev => prev + 1);
  };

  // Sync mode and tab when authentication status changes
  useEffect(() => {
    if (isAuthenticated) {
      const savedMode = localStorage.getItem('es_current_mode');
      if (savedMode === 'website') {
        setCurrentMode('website');
      } else {
        setCurrentMode('portal');
        localStorage.setItem('es_current_mode', 'portal');

        // Check hash or restore latest checked page
        const hash = window.location.hash.replace(/^#/, '').toLowerCase();
        if (VALID_PORTAL_TABS.includes(hash)) {
          setPortalTabState(hash);
          localStorage.setItem('es_active_tab', hash);
        } else {
          const latest = localStorage.getItem('es_active_tab');
          const target = (latest && VALID_PORTAL_TABS.includes(latest)) ? latest : 'dashboard';
          setPortalTabState(target);
          window.location.hash = target;
        }
      }
    } else {
      // Not logged in: website MUST always show first
      setCurrentMode('website');
      localStorage.setItem('es_current_mode', 'website');
      const hash = window.location.hash.replace(/^#/, '').toLowerCase();
      if (VALID_PORTAL_TABS.includes(hash)) {
        window.history.replaceState(null, '', window.location.pathname);
      }
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

          {portalTab === 'expenses' && (
            <DailyExpensesView />
          )}

          {portalTab === 'attendance' && (
            <AttendanceView />
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

          {portalTab === 'permissions' && (
            <PermissionsView />
          )}

          {portalTab === 'profile' && (
            <ProfileView />
          )}
        </PortalLayout>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}
