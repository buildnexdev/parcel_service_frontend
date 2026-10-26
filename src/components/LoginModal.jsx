import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Lock, User, AlertCircle } from 'lucide-react';

const LoginModal = ({ isOpen, onClose, onLoginSuccess }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please provide your mobile number/username and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(username, password);
      onClose();
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <Lock size={20} />
            <h3>Staff & Portal Login</h3>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={22} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
            Access order bookings, driver assignments, in-place payment updates, and daily run sheets.
          </p>

          {error && (
            <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off">
            <div className="form-group">
              <label className="form-label">Mobile Number or Username</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-control"
                  style={{ paddingLeft: '38px' }}
                  placeholder="e.g. 9360427527"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="off"
                  required
                />
                <User size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  className="form-control"
                  style={{ paddingLeft: '38px' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-accent"
              style={{ width: '100%', padding: '12px', marginTop: '10px' }}
              disabled={loading}
            >
              {loading ? 'Authenticating...' : 'Login to Staff Portal'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
