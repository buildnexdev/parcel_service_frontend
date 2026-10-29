import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/api';

const AuthContext = createContext(null);

/**
 * Checks if a JWT token has expired or is invalid.
 * Validates the standard `exp` timestamp claim against current time.
 */
const isTokenExpired = (rawToken) => {
  if (!rawToken) return true;
  try {
    const parts = rawToken.split('.');
    if (parts.length !== 3) return true;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) return false;
    // Expire if current time exceeds token exp timestamp (in seconds)
    return Date.now() >= (payload.exp * 1000) - 5000;
  } catch {
    return true;
  }
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => {
    const saved = localStorage.getItem('es_token');
    if (!saved || isTokenExpired(saved)) {
      localStorage.removeItem('es_token');
      localStorage.removeItem('es_user');
      localStorage.removeItem('es_permissions');
      localStorage.removeItem('es_active_tab');
      localStorage.setItem('es_current_mode', 'website');
      return null;
    }
    return saved;
  });

  const [user, setUser] = useState(() => {
    const savedToken = localStorage.getItem('es_token');
    if (!savedToken || isTokenExpired(savedToken)) {
      return null;
    }
    const raw = localStorage.getItem('es_user');
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [permissions, setPermissions] = useState(() => {
    const savedToken = localStorage.getItem('es_token');
    if (!savedToken || isTokenExpired(savedToken)) {
      return {};
    }
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
    if (!activeToken || isTokenExpired(activeToken)) {
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
      localStorage.removeItem('es_token');
      localStorage.removeItem('es_user');
      localStorage.removeItem('es_permissions');
      localStorage.removeItem('es_active_tab');
      localStorage.setItem('es_current_mode', 'website');
    };

    window.addEventListener('auth_logout', handleLogout);

    if (token) {
      // If token is already expired, logout immediately
      if (isTokenExpired(token)) {
        handleLogout();
        setLoading(false);
        return () => window.removeEventListener('auth_logout', handleLogout);
      }

      // Schedule automated logout exactly when the 24-hour token expires
      let timeoutId;
      try {
        const parts = token.split('.');
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));
        if (payload.exp) {
          const remainingMs = (payload.exp * 1000) - Date.now();
          if (remainingMs > 0) {
            timeoutId = setTimeout(() => {
              handleLogout();
              window.dispatchEvent(new Event('auth_logout'));
            }, remainingMs);
          } else {
            handleLogout();
          }
        }
      } catch (err) {
        console.warn('Error reading token expiration schedule:', err);
      }

      refreshPermissions().finally(() => setLoading(false));

      return () => {
        if (timeoutId) clearTimeout(timeoutId);
        window.removeEventListener('auth_logout', handleLogout);
      };
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
    localStorage.removeItem('es_active_tab');
    localStorage.setItem('es_current_mode', 'website');
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
