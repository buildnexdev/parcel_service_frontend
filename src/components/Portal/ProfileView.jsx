import React, { useState } from 'react';
import { api } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { User, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

const ProfileView = () => {
  const { user, updateUser } = useAuth();

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    branch: user?.branch || 'Karaikal'
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordErr, setPasswordErr] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg('');
    setProfileErr('');

    try {
      const res = await api.updateProfile(profileData);
      setProfileMsg(res.message || 'Profile updated successfully!');
      if (res.user) updateUser(res.user);
    } catch (err) {
      setProfileErr(err.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordMsg('');
    setPasswordErr('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordErr('New password and confirmation do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordErr('New password must be at least 6 characters long');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await api.changePassword(passwordData.currentPassword, passwordData.newPassword);
      setPasswordMsg(res.message || 'Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPasswordErr(err.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '20px' }}>
      {/* Profile Details Form */}
      <div style={{ background: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', padding: 'clamp(18px, 4vw, 28px)' }}>
        <div className="flex items-center gap-2" style={{ marginBottom: '20px' }}>
          <User size={20} color="var(--primary)" />
          <h3 style={{ fontSize: '1.25rem', color: 'var(--primary-dark)' }}>Staff Profile Details</h3>
        </div>

        {profileMsg && (
          <div style={{ background: '#ecfdf5', color: '#065f46', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={16} />
            <span>{profileMsg}</span>
          </div>
        )}

        {profileErr && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertCircle size={16} />
            <span>{profileErr}</span>
          </div>
        )}

        <form onSubmit={handleProfileSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-control"
              value={profileData.name}
              onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-control"
              value={user?.username || ''}
              disabled
              style={{ background: '#f1f5f9' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              value={user?.email || ''}
              disabled
              style={{ background: '#f1f5f9' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number (10 Digits)</label>
            <input
              type="tel"
              className="form-control"
              placeholder="e.g. 9442485296"
              value={profileData.phone}
              maxLength={10}
              onChange={(e) => setProfileData({ ...profileData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Assigned Branch</label>
            <input
              type="text"
              className="form-control"
              value={profileData.branch}
              onChange={(e) => setProfileData({ ...profileData, branch: e.target.value })}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={savingProfile}>
            {savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
          </button>
        </form>
      </div>

      {/* Change Password Form */}
      <div style={{ background: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', padding: 'clamp(18px, 4vw, 28px)' }}>
        <div className="flex items-center gap-2" style={{ marginBottom: '20px' }}>
          <Lock size={20} color="var(--secondary)" />
          <h3 style={{ fontSize: '1.25rem', color: 'var(--primary-dark)' }}>Change Password</h3>
        </div>

        {passwordMsg && (
          <div style={{ background: '#ecfdf5', color: '#065f46', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={16} />
            <span>{passwordMsg}</span>
          </div>
        )}

        {passwordErr && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertCircle size={16} />
            <span>{passwordErr}</span>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit}>
          <div className="form-group">
            <label className="form-label">Current Password *</label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">New Password *</label>
            <input
              type="password"
              className="form-control"
              placeholder="Min 6 characters"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Confirm New Password *</label>
            <input
              type="password"
              className="form-control"
              placeholder="Re-enter new password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              required
            />
          </div>

          <button type="submit" className="btn btn-accent" style={{ width: '100%' }} disabled={savingPassword}>
            {savingPassword ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileView;
