import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('es_token'));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('es_user');
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [permissions, setPermissions] = useState(() => {
    const raw = localStorage.getItem('es_permissions');
    try {
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [loading, setLoading] = useState(true);

  // Fetch active user permissions
  const refreshPermissions = useCallback(async () => {
    const activeToken = localStorage.getItem('es_token');
    if (!activeToken) {
      setPermissions({});
      localStorage.removeItem('es_permissions');
      return;
    }
    try {
      const res = await api.getMyPermissions();
      if (res.success && res.permissions) {
        setPermissions(res.permissions);
        localStorage.setItem('es_permissions', JSON.stringify(res.permissions));
      }
    } catch (err) {
      console.warn('Failed to fetch user permissions:', err.message);
    }
  }, []);

  useEffect(() => {
    const handleLogout = () => {
      setToken(null);
      setUser(null);
      setPermissions({});
      localStorage.removeItem('es_permissions');
    };

    window.addEventListener('auth_logout', handleLogout);

    if (token) {
      refreshPermissions().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    return () => window.removeEventListener('auth_logout', handleLogout);
  }, [token, refreshPermissions]);

  const login = async (username, password) => {
    const res = await api.login(username, password);
    if (res.success && res.token) {
      localStorage.setItem('es_token', res.token);
      localStorage.setItem('es_user', JSON.stringify(res.user));
      setToken(res.token);
      setUser(res.user);

      // Refresh permissions immediately after login
      try {
        const pRes = await api.getMyPermissions();
        if (pRes.success && pRes.permissions) {
          setPermissions(pRes.permissions);
          localStorage.setItem('es_permissions', JSON.stringify(pRes.permissions));
        }
      } catch (pErr) {
        console.warn('Initial permissions fetch warning:', pErr);
      }

      return res;
    }
    throw new Error(res.message || 'Login failed');
  };

  const logout = () => {
    localStorage.removeItem('es_token');
    localStorage.removeItem('es_user');
    localStorage.removeItem('es_permissions');
    setToken(null);
    setUser(null);
    setPermissions({});
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('es_user', JSON.stringify(updatedUser));
  };

  /**
   * Check if the logged in user has permission for a specific module and action.
   * Admin always has full access.
   * @param {string} moduleName - 'orders', 'reports', 'expenses', 'attendance', 'vehicles', 'drivers', 'staff', 'permissions'
   * @param {'view'|'add'|'edit'|'delete'|'export'} action - 'view', 'add', 'edit', 'delete'
   * @returns {boolean}
   */
  const hasPermission = (moduleName, action = 'view') => {
    if (!user) return false;
    // Admin role has unrestricted access to everything
    if (user.role === 'admin') return true;

    // Permission Access page is strictly Admin only
    if (moduleName === 'permissions') return false;

    // Staff access depends on configured permissions
    const mod = permissions[moduleName];
    if (!mod) {
      // Sensible initial fallbacks if not yet explicitly saved
      if (action === 'view' && ['orders', 'vehicles', 'drivers', 'expenses', 'attendance'].includes(moduleName)) {
        return true;
      }
      if (action === 'add' && moduleName === 'orders') {
        return true;
      }
      return false;
    }

    const checkKey = action === 'export' ? 'export' : action;
    return Boolean(mod[checkKey] ?? mod[action]);
  };

  return (
    <AuthContext.Provider value={{
      token,
      user,
      permissions,
      isAuthenticated: !!token,
      loading,
      login,
      logout,
      updateUser,
      refreshPermissions,
      hasPermission
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
