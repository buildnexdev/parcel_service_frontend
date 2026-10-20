import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import SuccessModal from '../Common/SuccessModal';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Phone, 
  Mail, 
  MapPin, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Edit2, 
  Trash2, 
  KeyRound, 
  Building2, 
  X, 
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';

const BRANCH_LIST = [
  'Karaikal',
  'Pondicherry',
  'Cuddalore',
  'Chidambaram',
  'Sirkali',
  'Mayiladuthurai',
  'Nagore',
  'Nagapattinam',
  'Thiruvarur',
  'Thiruthuraipoondi',
  'Vedaranyam',
  'Parangipettai'
];

const DESIGNATION_OPTIONS = [
  'Branch Incharge',
  'Staff',
  'Depot Manager',
  'Operations Incharge',
  'Booking Clerk',
  'Delivery Coordinator',
  'Accountant',
  'Administrator'
];

const StaffView = () => {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [staffList, setStaffList] = useState([]);
  const [stats, setStats] = useState({
    total_staff: 0,
    active_staff: 0,
    branch_incharges: 0,
    admins: 0,
    unique_branches: 0
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [selectedDesignation, setSelectedDesignation] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [staffToDelete, setStaffToDelete] = useState(null);
  const [passwordResetStaff, setPasswordResetStaff] = useState(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [successModalData, setSuccessModalData] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    role: 'staff',
    designation: 'Staff',
    branch: 'Karaikal',
    status: 'active'
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  useEffect(() => {
    loadStaffData();
  }, []);

  const loadStaffData = async () => {
    setLoading(true);
    try {
      const res = await api.getStaff();
      if (res.success && res.staff) {
        setStaffList(res.staff);
        if (res.stats) {
          setStats(res.stats);
        }
      }
    } catch (err) {
      console.error('Failed to load staff directory:', err);
      showToast(err.message || 'Failed to load staff directory', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingStaff(null);
    setFormData({
      name: '',
      username: '',
      email: '',
      phone: '',
      password: '',
      role: 'staff',
      designation: 'Staff',
      branch: 'Karaikal',
      status: 'active'
    });
    setShowPassword(false);
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (staff) => {
    setEditingStaff(staff);
    setFormData({
      name: staff.name || '',
      username: staff.username || '',
      email: staff.email || '',
      phone: staff.phone || '',
      password: '', // blank unless changing
      role: staff.role || 'staff',
      designation: staff.designation || 'Staff',
      branch: staff.branch || 'Karaikal',
      status: staff.status || 'active'
    });
    setShowPassword(false);
    setIsFormModalOpen(true);
  };

  // Open Password Reset Modal
  const handleOpenPasswordReset = (staff) => {
    setPasswordResetStaff(staff);
    setNewPasswordValue('');
    setShowPassword(false);
  };

  // Auto-generate username & email when name changes in Add mode
  const handleNameChange = (e) => {
    const newName = e.target.value;
    if (!editingStaff) {
      const suggestedUsername = newName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 20);
      setFormData(prev => ({
        ...prev,
        name: newName,
        username: prev.username ? prev.username : suggestedUsername,
        email: prev.email ? prev.email : (suggestedUsername ? `${suggestedUsername}@estransporters.com` : '')
      }));
    } else {
      setFormData(prev => ({ ...prev, name: newName }));
    }
  };

  // Submit Add or Edit
  const handleSubmitForm = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast('Staff member name is required.', 'error');
      return;
    }
    if (!formData.username.trim()) {
      showToast('Login username is required.', 'error');
      return;
    }
    if (formData.phone && !/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      showToast('Phone number must be exactly 10 digits.', 'error');
      return;
    }

    if (!editingStaff && (!formData.password || formData.password.length < 6)) {
      showToast('Initial password must be at least 6 characters.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (editingStaff) {
        const payload = { ...formData };
        if (!payload.password || !payload.password.trim()) {
          delete payload.password;
        }
        const res = await api.updateStaff(editingStaff.id, payload);
        showToast(res.message || 'Staff member updated successfully!', 'success');
        setSuccessModalData({
          title: 'Staff Member Updated',
          message: `The records and access privileges for ${formData.name} have been updated.`,
          details: {
            'Staff Name': formData.name,
            'Username': formData.username,
            'Designation': formData.designation,
            'Branch': formData.branch,
            'System Role': formData.role.toUpperCase(),
            'Status': formData.status.toUpperCase()
          }
        });
      } else {
        const res = await api.createStaff(formData);
        showToast(res.message || 'New staff member added successfully!', 'success');
        setSuccessModalData({
          title: 'Staff Member Registered!',
          message: `${formData.name} is now registered in the staff directory with login username: ${formData.username}.`,
          details: {
            'Staff Name': formData.name,
            'Username': formData.username,
            'Designation': formData.designation,
            'Branch': formData.branch,
            'Contact Phone': formData.phone || 'N/A',
            'Temporary Password': formData.password
          }
        });
      }
      setIsFormModalOpen(false);
      loadStaffData();
    } catch (err) {
      showToast(err.message || 'Failed to save staff member', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Password Reset
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!newPasswordValue || newPasswordValue.length < 6) {
      showToast('Password must be at least 6 characters long.', 'error');
      return;
    }

    setResettingPassword(true);
    try {
      const res = await api.resetStaffPassword(passwordResetStaff.id, newPasswordValue);
      showToast(res.message || 'Password reset successfully!', 'success');
      setSuccessModalData({
        title: 'Password Reset Successful',
        message: `The login password for ${passwordResetStaff.name} has been updated.`,
        details: {
          'Staff Name': passwordResetStaff.name,
          'Username': passwordResetStaff.username,
          'New Password': newPasswordValue
        }
      });
      setPasswordResetStaff(null);
    } catch (err) {
      showToast(err.message || 'Failed to reset password', 'error');
    } finally {
      setResettingPassword(false);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!staffToDelete) return;
    setDeleting(true);
    try {
      const res = await api.deleteStaff(staffToDelete.id);
      showToast(res.message || 'Staff member removed successfully!', 'success');
      setStaffToDelete(null);
      loadStaffData();
    } catch (err) {
      showToast(err.message || 'Cannot delete staff member', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Filter staff list
  const filteredStaff = useMemo(() => {
    return staffList.filter(s => {
      // Branch filter
      if (selectedBranch !== 'ALL' && s.branch !== selectedBranch) return false;

      // Designation filter
      if (selectedDesignation !== 'ALL' && s.designation !== selectedDesignation) return false;

      // Status filter
      if (selectedStatus !== 'ALL' && s.status !== selectedStatus) return false;

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = s.name?.toLowerCase().includes(term);
        const matchUsername = s.username?.toLowerCase().includes(term);
        const matchPhone = s.phone?.includes(term);
        const matchEmail = s.email?.toLowerCase().includes(term);
        const matchBranch = s.branch?.toLowerCase().includes(term);
        const matchDesignation = s.designation?.toLowerCase().includes(term);
        return matchName || matchUsername || matchPhone || matchEmail || matchBranch || matchDesignation;
      }

      return true;
    });
  }, [staffList, selectedBranch, selectedDesignation, selectedStatus, searchTerm]);

  // Generate color palette for staff avatar initials
  const getAvatarGradient = (role, designation) => {
    if (role === 'admin') {
      return 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)';
    }
    if (designation === 'Branch Incharge') {
      return 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)';
    }
    return 'linear-gradient(135deg, #059669 0%, #047857 100%)';
  };

  const getInitials = (name) => {
    if (!name) return 'ST';
    const parts = name.trim().split(/[\s.]+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  return (
    <div>
      {/* Top Stat Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div className="stat-card-info">
            <h4 style={{ color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Staff</h4>
            <div className="stat-value" style={{ color: '#1e293b', fontSize: '1.85rem', fontWeight: 800 }}>
              {stats.total_staff || staffList.length}
            </div>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>Registered system accounts</p>
          </div>
          <div className="stat-card-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb' }}>
            <Users size={24} />
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #0284c7' }}>
          <div className="stat-card-info">
            <h4 style={{ color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Branch Incharges</h4>
            <div className="stat-value" style={{ color: '#0369a1', fontSize: '1.85rem', fontWeight: 800 }}>
              {stats.branch_incharges || staffList.filter(s => s.designation === 'Branch Incharge').length}
            </div>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>Depot & branch supervisors</p>
          </div>
          <div className="stat-card-icon" style={{ background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7' }}>
            <ShieldCheck size={24} />
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div className="stat-card-info">
            <h4 style={{ color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Accounts</h4>
            <div className="stat-value" style={{ color: '#059669', fontSize: '1.85rem', fontWeight: 800 }}>
              {stats.active_staff || staffList.filter(s => s.status === 'active').length}
            </div>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>Ready for login & operations</p>
          </div>
          <div className="stat-card-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <CheckCircle2 size={24} />
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <div className="stat-card-info">
            <h4 style={{ color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Station Network</h4>
            <div className="stat-value" style={{ color: '#7c3aed', fontSize: '1.85rem', fontWeight: 800 }}>
              {stats.unique_branches || new Set(staffList.map(s => s.branch)).size}
            </div>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>Covered branch locations</p>
          </div>
          <div className="stat-card-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
            <MapPin size={24} />
          </div>
        </div>
      </div>

      {/* Main Staff Table Card */}
      <div className="table-card">
        {/* Table Header & Action */}
        <div className="table-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.3rem', color: 'var(--primary-dark)', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Staff & Team Directory</span>
              <span className="badge badge-active" style={{ fontSize: '0.75rem' }}>{filteredStaff.length} members</span>
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Manage office incharges, booking staff, branch assignments, and system access
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button 
              className="btn btn-outline btn-sm" 
              onClick={loadStaffData} 
              title="Refresh Directory"
              style={{ padding: '8px 12px' }}
            >
              <RefreshCw size={15} />
              <span className="desktop-only">Refresh</span>
            </button>

            <button className="btn btn-accent" onClick={handleOpenAdd} style={{ padding: '8px 16px', fontWeight: 700 }}>
              <UserPlus size={18} />
              <span>Add New Staff</span>
            </button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div style={{ 
          padding: '16px 20px', 
          background: '#f8fafc', 
          borderBottom: '1px solid #e2e8f0', 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 12, 
          alignItems: 'center' 
        }}>
          {/* Live Search */}
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '220px' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by name, phone, branch, username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                background: '#ffffff',
                outline: 'none'
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Branch Filter */}
          <div style={{ minWidth: '150px' }}>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                background: '#ffffff',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Branches ({BRANCH_LIST.length})</option>
              {BRANCH_LIST.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Designation Filter */}
          <div style={{ minWidth: '160px' }}>
            <select
              value={selectedDesignation}
              onChange={(e) => setSelectedDesignation(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                background: '#ffffff',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Designations</option>
              <option value="Branch Incharge">Branch Incharge</option>
              <option value="Staff">Staff</option>
              <option value="Administrator">Administrator</option>
              <option value="Depot Manager">Depot Manager</option>
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ minWidth: '130px' }}>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                background: '#ffffff',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          {/* Reset Filters button if any active */}
          {(searchTerm || selectedBranch !== 'ALL' || selectedDesignation !== 'ALL' || selectedStatus !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedBranch('ALL');
                setSelectedDesignation('ALL');
                setSelectedStatus('ALL');
              }}
              className="btn btn-outline btn-sm"
              style={{ padding: '8px 12px', color: '#64748b' }}
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Staff Table */}
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ minWidth: '220px' }}>Staff Member</th>
                <th style={{ minWidth: '160px' }}>Designation & Role</th>
                <th style={{ minWidth: '150px' }}>Branch Station</th>
                <th style={{ minWidth: '160px' }}>Contact Phone</th>
                <th style={{ minWidth: '180px' }}>System Email</th>
                <th style={{ minWidth: '100px' }}>Status</th>
                <th style={{ minWidth: '120px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                      <RefreshCw size={20} className="spinning" />
                      <span>Loading staff directory...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                    <div style={{ maxWidth: '360px', margin: '0 auto' }}>
                      <Users size={40} style={{ color: '#cbd5e1', marginBottom: 12 }} />
                      <div style={{ fontWeight: 700, color: '#334155', fontSize: '1.05rem', marginBottom: 4 }}>
                        No staff members found
                      </div>
                      <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 16 }}>
                        No team members match your active filters or search terms.
                      </p>
                      <button className="btn btn-outline btn-sm" onClick={handleOpenAdd}>
                        <UserPlus size={15} />
                        <span>Add New Staff</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => {
                  const isCurrentAdmin = staff.username === 'admin';
                  const isSelf = currentUser && (currentUser.id === staff.id || currentUser.username === staff.username);
                  const isIncharge = staff.designation === 'Branch Incharge';

                  return (
                    <tr key={staff.id} style={{ transition: 'background 0.15s ease' }}>
                      {/* Name & Username */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div 
                            style={{ 
                              width: 38, 
                              height: 38, 
                              borderRadius: '50%', 
                              background: getAvatarGradient(staff.role, staff.designation), 
                              color: '#ffffff', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              fontWeight: 800, 
                              fontSize: '0.85rem',
                              flexShrink: 0,
                              boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                            }}
                          >
                            {getInitials(staff.name)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: 'var(--primary-dark)', fontSize: '0.95rem', lineHeight: 1.2 }}>
                              {staff.name}
                              {isSelf && (
                                <span style={{ marginLeft: 6, fontSize: '0.7rem', color: '#2563eb', background: '#eff6ff', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                  You
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2, fontFamily: 'monospace' }}>
                              @{staff.username}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Designation & Role */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                          <span 
                            style={{ 
                              fontSize: '0.75rem', 
                              fontWeight: 700, 
                              padding: '3px 8px', 
                              borderRadius: '6px',
                              background: isIncharge ? 'rgba(2, 132, 199, 0.12)' : (staff.designation === 'Administrator' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(100, 116, 139, 0.12)'),
                              color: isIncharge ? '#0369a1' : (staff.designation === 'Administrator' ? '#4f46e5' : '#475569'),
                              border: isIncharge ? '1px solid rgba(2, 132, 199, 0.25)' : '1px solid rgba(100, 116, 139, 0.2)'
                            }}
                          >
                            {staff.designation || 'Staff'}
                          </span>

                          <span style={{ fontSize: '0.7rem', color: staff.role === 'admin' ? '#7c3aed' : '#64748b', fontWeight: 600 }}>
                            {staff.role === 'admin' ? '🛡️ Administrator' : '👤 Standard Staff'}
                          </span>
                        </div>
                      </td>

                      {/* Branch Station */}
                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#1e293b', fontWeight: 600, fontSize: '0.9rem' }}>
                          <MapPin size={14} style={{ color: '#0284c7' }} />
                          <span>{staff.branch || 'Karaikal'}</span>
                        </div>
                      </td>

                      {/* Phone */}
                      <td>
                        {staff.phone ? (
                          <a 
                            href={`tel:${staff.phone}`} 
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: 6, 
                              fontWeight: 700, 
                              color: '#1d4ed8', 
                              textDecoration: 'none', 
                              fontSize: '0.875rem' 
                            }}
                            title="Call staff"
                          >
                            <Phone size={14} style={{ color: '#2563eb' }} />
                            <span>{staff.phone}</span>
                          </a>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>No phone</span>
                        )}
                      </td>

                      {/* Email */}
                      <td>
                        {staff.email ? (
                          <a 
                            href={`mailto:${staff.email}`} 
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: 6, 
                              color: '#475569', 
                              fontSize: '0.825rem', 
                              textDecoration: 'none' 
                            }}
                          >
                            <Mail size={13} style={{ color: '#94a3b8' }} />
                            <span>{staff.email}</span>
                          </a>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td>
                        <span 
                          className={`badge ${staff.status === 'active' ? 'badge-active' : 'badge-inactive'}`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <span 
                            style={{ 
                              width: 6, 
                              height: 6, 
                              borderRadius: '50%', 
                              background: staff.status === 'active' ? '#10b981' : '#ef4444' 
                            }} 
                          />
                          <span>{staff.status === 'active' ? 'Active' : 'Inactive'}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          {/* Edit button */}
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => handleOpenEdit(staff)}
                            title="Edit Staff Member"
                            style={{ padding: '6px 8px' }}
                          >
                            <Edit2 size={13} />
                          </button>

                          {/* Reset Password button */}
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => handleOpenPasswordReset(staff)}
                            title="Reset Staff Password"
                            style={{ padding: '6px 8px', color: '#d97706', borderColor: '#fde68a' }}
                          >
                            <KeyRound size={13} />
                          </button>

                          {/* Delete button (disabled for primary admin or self) */}
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => setStaffToDelete(staff)}
                            disabled={isCurrentAdmin || isSelf}
                            title={isCurrentAdmin ? 'Primary super-admin cannot be deleted' : (isSelf ? 'Cannot delete currently logged-in account' : 'Delete Staff Member')}
                            style={{ 
                              padding: '6px 8px', 
                              opacity: (isCurrentAdmin || isSelf) ? 0.35 : 1, 
                              cursor: (isCurrentAdmin || isSelf) ? 'not-allowed' : 'pointer' 
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Staff Modal */}
      {isFormModalOpen && (
        <div className="modal-overlay" onClick={() => setIsFormModalOpen(false)}>
          <div 
            className="modal-box" 
            style={{ maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>
                    {editingStaff ? `Edit Staff Member (${editingStaff.name})` : 'Add New Staff Member'}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {editingStaff ? 'Update branch location, role, or contact information' : 'Create login credentials and register staff to branch'}
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                className="btn btn-outline btn-sm" 
                onClick={() => setIsFormModalOpen(false)}
                style={{ padding: '6px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} style={{ padding: '20px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Full Name */}
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Staff Full Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AZHAGANANDHAM or S. RAMAN"
                    value={formData.name}
                    onChange={handleNameChange}
                    className="form-input"
                  />
                </div>

                {/* Username */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Login Username <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. azhaganandham"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '') }))}
                    className="form-input"
                    disabled={editingStaff && editingStaff.username === 'admin'}
                  />
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Used to log into the staff portal</span>
                </div>

                {/* Phone */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Contact Phone (10 Digits)
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 9442485296"
                    maxLength={10}
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))}
                    className="form-input"
                  />
                </div>

                {/* Branch */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Assigned Branch Station <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={formData.branch}
                    onChange={(e) => setFormData(prev => ({ ...prev, branch: e.target.value }))}
                    className="form-input"
                  >
                    {BRANCH_LIST.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                {/* Designation */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Designation / Title <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={formData.designation}
                    onChange={(e) => setFormData(prev => ({ ...prev, designation: e.target.value }))}
                    className="form-input"
                  >
                    {DESIGNATION_OPTIONS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* System Role */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    System Role <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                    className="form-input"
                    disabled={editingStaff && editingStaff.username === 'admin'}
                  >
                    <option value="staff">Staff (Booking & Delivery Access)</option>
                    <option value="admin">Admin (Full Administrative Access)</option>
                  </select>
                </div>

                {/* Status */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Account Status <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="form-input"
                    disabled={editingStaff && editingStaff.username === 'admin'}
                  >
                    <option value="active">Active (Can Log In)</option>
                    <option value="inactive">Inactive (Access Suspended)</option>
                  </select>
                </div>

                {/* Email */}
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Official Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. staff@estransporters.com"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="form-input"
                  />
                </div>

                {/* Password field */}
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    {editingStaff ? 'New Password (Optional)' : 'Initial Login Password *'}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={editingStaff ? 'Leave empty to keep existing password' : 'Enter at least 6 characters (e.g. staff123)'}
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      className="form-input"
                      style={{ paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer'
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    {editingStaff 
                      ? 'Only fill this if you want to update or change the user\'s password.' 
                      : 'Initial password that the staff member will use to sign in.'}
                  </span>
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsFormModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-accent"
                  disabled={submitting}
                  style={{ minWidth: '130px', fontWeight: 700 }}
                >
                  {submitting ? 'Saving...' : (editingStaff ? 'Update Staff' : 'Create Staff Member')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {passwordResetStaff && (
        <div className="modal-overlay" onClick={() => setPasswordResetStaff(null)}>
          <div 
            className="modal-box" 
            style={{ maxWidth: '440px' }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(217, 119, 6, 0.1)', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <KeyRound size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)' }}>
                    Reset Password
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Set new password for {passwordResetStaff.name} (@{passwordResetStaff.username})
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                className="btn btn-outline btn-sm" 
                onClick={() => setPasswordResetStaff(null)}
                style={{ padding: '6px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} style={{ padding: '20px 24px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  New Password <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter at least 6 characters"
                    value={newPasswordValue}
                    onChange={(e) => setNewPasswordValue(e.target.value)}
                    className="form-input"
                    style={{ paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer'
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setPasswordResetStaff(null)}
                  disabled={resettingPassword}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-accent"
                  disabled={resettingPassword}
                  style={{ fontWeight: 700 }}
                >
                  {resettingPassword ? 'Updating...' : 'Set New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Staff Confirmation Modal */}
      {staffToDelete && (
        <div className="modal-overlay" onClick={() => setStaffToDelete(null)}>
          <div 
            className="modal-box" 
            style={{ 
              maxWidth: '430px', 
              textAlign: 'center', 
              background: '#1e293b', 
              borderRadius: '16px', 
              padding: '28px 24px', 
              border: '1px solid #334155' 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <AlertTriangle size={30} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', marginBottom: 8 }}>
              Remove Staff Member?
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#cbd5e1', marginBottom: 20, lineHeight: 1.5 }}>
              Are you sure you want to remove <strong style={{ color: '#ffffff' }}>{staffToDelete.name}</strong> (@{staffToDelete.username}) from the staff directory? This will permanently delete their login credentials.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                type="button"
                className="btn" 
                style={{ flex: 1, justifyContent: 'center', background: '#334155', color: '#ffffff', border: '1px solid #475569' }}
                onClick={() => setStaffToDelete(null)}
                disabled={deleting}
              >
                Keep Staff
              </button>
              <button 
                type="button"
                className="btn btn-danger" 
                style={{ flex: 1, justifyContent: 'center', background: '#dc2626', color: '#ffffff' }}
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Removing...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification Modal */}
      <SuccessModal
        isOpen={!!successModalData}
        onClose={() => setSuccessModalData(null)}
        title={successModalData?.title}
        message={successModalData?.message}
        details={successModalData?.details}
      />
    </div>
  );
};

export default StaffView;
