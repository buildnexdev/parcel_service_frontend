import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import WebsiteView from './components/WebsiteView';
import LoginModal from './components/LoginModal';
import PortalLayout from './components/Portal/PortalLayout';
import DashboardView from './components/Portal/DashboardView';
import OrdersView from './components/Portal/OrdersView';
import VehiclesView from './components/Portal/VehiclesView';
import DriversView from './components/Portal/DriversView';
import ReportsView from './components/Portal/ReportsView';
import ProfileView from './components/Portal/ProfileView';

function AppContent() {
  const { isAuthenticated } = useAuth();
  const [currentMode, setCurrentMode] = useState(isAuthenticated ? 'portal' : 'website');
  const [portalTab, setPortalTab] = useState('dashboard');
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [newOrderTrigger, setNewOrderTrigger] = useState(0);

  // Switch to portal on login
  const handleLoginSuccess = () => {
    setCurrentMode('portal');
    setPortalTab('dashboard');
  };

  const handleOpenNewOrderModal = () => {
    setPortalTab('orders');
    setNewOrderTrigger(prev => prev + 1);
  };

  return (
    <div>
      {currentMode === 'website' ? (
        <>
          <WebsiteView
            onOpenLogin={() => setIsLoginOpen(true)}
            onGoToPortal={() => setCurrentMode('portal')}
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
          onOpenWebsite={() => setCurrentMode('website')}
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
