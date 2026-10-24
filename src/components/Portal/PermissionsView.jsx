import React, { useState, useEffect } from 'react';
import { api } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  ShieldCheck, ShieldAlert, Check, X, Eye, Plus, Edit2, Trash2,
  Lock, Unlock, Users, Package, FileBarChart, Wallet, CalendarCheck,
  Truck, AlertCircle, RefreshCw, Star, Sparkles, CheckSquare, Square
} from 'lucide-react';

const MODULE_DEFINITIONS = [
  {
    id: 'orders',
    name: 'Orders & Tracking (LR)',
    important: true,
    description: 'Booking consignments, waybills, LR generation, tracking checkpoints, payment collection, and status updates.',
    icon: Package,
    color: '#2563eb',
    actions: ['view', 'add', 'edit', 'delete']
  },
  {
    id: 'reports',
    name: 'Daily & Financial Reports',
    important: true,
    description: 'Revenue totals, station billing summaries, payment breakdown, run sheet generation, and printouts.',
    icon: FileBarChart,
    color: '#059669',
    actions: ['view', 'edit'] // View and Export/Print
  },
  {
    id: 'expenses',
    name: 'Daily Expenses',
    important: false,
    description: 'Diesel/fuel charges, driver batta, loading/coolie, vehicle maintenance, tolls, and miscellaneous petty cash.',
    icon: Wallet,
    color: '#d97706',
    actions: ['view', 'add', 'edit', 'delete']
  },
  {
    id: 'attendance',
    name: 'Staff Attendance',
    important: false,
    description: 'Daily attendance marking, working hours, check-in/out times, overtime, and monthly attendance registers.',
    icon: CalendarCheck,
    color: '#7c3aed',
    actions: ['view', 'add', 'edit', 'delete']
  },
  {
    id: 'vehicles',
    name: 'Vehicles & Fleet',
    important: false,
    description: 'Fleet vehicle registration, lorry types, capacity, ownership details, RC and insurance validity.',
    icon: Truck,
    color: '#0891b2',
    actions: ['view', 'add', 'edit', 'delete']
  },
  {
    id: 'drivers',
    name: 'Assigned Drivers',
    important: false,
    description: 'Driver profiles, phone numbers, assigned routes, and vehicle pairing.',
    icon: Users,
    color: '#475569',
    actions: ['view', 'add', 'edit', 'delete']
  },
  {
    id: 'staff',
    name: 'Staff & Team Directory',
    important: false,
    description: 'Staff member directory, designation, branch office assignments, and account status.',
    icon: ShieldCheck,
    color: '#dc2626',
    actions: ['view', 'add', 'edit', 'delete']
  }
];

const PermissionsView = () => {
  const { user, refreshPermissions } = useAuth();
  const { showToast } = useToast();

  const [staffUsers, setStaffUsers] = useState([]);
  const [staffSearch, setStaffSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [permissionsState, setPermissionsState] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const filteredStaffUsers = staffUsers.filter(u => {
    if (!staffSearch.trim()) return true;
    const term = staffSearch.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(term)) ||
      (u.username && u.username.toLowerCase().includes(term)) ||
      (u.designation && u.designation.toLowerCase().includes(term)) ||
      (u.branch && u.branch.toLowerCase().includes(term))
    );
  });

  // Security guard: Only Admin can access
  if (user?.role !== 'admin') {
    return (
      <div className="card" style={{ padding: '60px 20px', textAlign: 'center', maxWidth: '600px', margin: '40px auto' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <ShieldAlert size={36} />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
          Access Restricted: Admin Privileges Required
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.6 }}>
          The Permission Access management portal is strictly reserved for Administrators (Proprietor &amp; Partners). Staff accounts cannot view or modify system permissions.
        </p>
      </div>
    );
  }

  useEffect(() => {
    fetchStaffAndPermissions();
  }, []);

  const fetchStaffAndPermissions = async () => {
    setLoading(true);
    try {
      const res = await api.getAllStaffPermissions();
      if (res.success && res.users) {
        setStaffUsers(res.users);

        // Pre-select first staff member (preferably non-admin first, or first user)
        const staffList = res.users.filter(u => u.role !== 'admin');
        const defaultUser = staffList.length > 0 ? staffList[0] : res.users[0];

        if (defaultUser) {
          setSelectedUserId(defaultUser.id);
          setPermissionsState(defaultUser.permissions || {});
        }
      }
    } catch (err) {
      console.error('Fetch permissions error:', err);
      showToast(err.message || 'Failed to load staff permissions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (u) => {
    if (isDirty) {
      if (!window.confirm('You have unsaved permission changes for the current user. Discard and switch?')) {
        return;
      }
    }
    setSelectedUserId(u.id);
    setPermissionsState(u.permissions || {});
    setIsDirty(false);
  };

  // Toggle single action permission
  const handleToggle = (moduleId, action) => {
    const colKey = `can_${action}`;
    setPermissionsState(prev => {
      const currentMod = prev[moduleId] || { can_view: false, can_add: false, can_edit: false, can_delete: false };
      const nextVal = !currentMod[colKey];

      const updatedMod = { ...currentMod, [colKey]: nextVal };

      // If granting add, edit, or delete, auto-grant view
      if (nextVal && ['can_add', 'can_edit', 'can_delete'].includes(colKey)) {
        updatedMod.can_view = true;
      }

      // If revoking view, auto-revoke add, edit, and delete
      if (!nextVal && colKey === 'can_view') {
        updatedMod.can_add = false;
        updatedMod.can_edit = false;
        updatedMod.can_delete = false;
      }

      return {
        ...prev,
        [moduleId]: updatedMod
      };
    });
    setIsDirty(true);
  };

  // Preset: Grant Full Access to All
  const handlePresetFullAccess = () => {
    const next = {};
    MODULE_DEFINITIONS.forEach(m => {
      next[m.id] = { can_view: true, can_add: true, can_edit: true, can_delete: true };
    });
    setPermissionsState(next);
    setIsDirty(true);
    showToast('Applied Preset: Full CRUD Access to All Modules', 'info');
  };

  // Preset: Standard Operations (Orders + Fleet + Expenses)
  const handlePresetOperations = () => {
    const next = {};
    MODULE_DEFINITIONS.forEach(m => {
      if (m.id === 'orders') {
        next[m.id] = { can_view: true, can_add: true, can_edit: true, can_delete: false };
      } else if (['vehicles', 'drivers'].includes(m.id)) {
        next[m.id] = { can_view: true, can_add: true, can_edit: true, can_delete: false };
      } else if (m.id === 'expenses') {
        next[m.id] = { can_view: true, can_add: true, can_edit: false, can_delete: false };
      } else if (m.id === 'attendance') {
        next[m.id] = { can_view: true, can_add: true, can_edit: false, can_delete: false };
      } else {
        next[m.id] = { can_view: false, can_add: false, can_edit: false, can_delete: false };
      }
    });
    setPermissionsState(next);
    setIsDirty(true);
    showToast('Applied Preset: Standard Operations (Orders & Fleet)', 'info');
  };

  // Preset: Billing & Booking Only
  const handlePresetBillingOnly = () => {
    const next = {};
    MODULE_DEFINITIONS.forEach(m => {
      if (m.id === 'orders') {
        next[m.id] = { can_view: true, can_add: true, can_edit: false, can_delete: false };
      } else if (['vehicles', 'drivers'].includes(m.id)) {
        next[m.id] = { can_view: true, can_add: false, can_edit: false, can_delete: false };
      } else {
        next[m.id] = { can_view: false, can_add: false, can_edit: false, can_delete: false };
      }
    });
    setPermissionsState(next);
    setIsDirty(true);
    showToast('Applied Preset: Booking & Billing Only', 'info');
  };

  // Preset: View Only
  const handlePresetViewOnly = () => {
    const next = {};
    MODULE_DEFINITIONS.forEach(m => {
      next[m.id] = { can_view: true, can_add: false, can_edit: false, can_delete: false };
    });
    setPermissionsState(next);
    setIsDirty(true);
    showToast('Applied Preset: View Only (Read-Only)', 'info');
  };

  // Preset: Revoke All
  const handlePresetRevokeAll = () => {
    const next = {};
    MODULE_DEFINITIONS.forEach(m => {
      next[m.id] = { can_view: false, can_add: false, can_edit: false, can_delete: false };
    });
    setPermissionsState(next);
    setIsDirty(true);
    showToast('All permissions revoked for this user', 'info');
  };

  // Save Permissions
  const handleSavePermissions = async () => {
    if (!selectedUserId) return;
    setSaving(true);
    try {
      await api.updateUserPermissions(selectedUserId, permissionsState);

      // Update in local staff users list
      setStaffUsers(prev => prev.map(u => {
        if (u.id === selectedUserId) {
          return { ...u, permissions: permissionsState };
        }
        return u;
      }));

      setIsDirty(false);
      showToast('Permissions saved successfully!', 'success');

      // If updating current user's own permissions, refresh
      if (selectedUserId === user.id) {
        refreshPermissions();
      }
    } catch (err) {
      console.error('Save permissions error:', err);
      showToast(err.message || 'Failed to save permissions', 'error');
    } finally {
      setSaving(false);
    }
  };

  const selectedUser = staffUsers.find(u => u.id === selectedUserId);
  const isSelectedUserAdmin = selectedUser?.role === 'admin';

  return (
    <div className="permissions-page-container" style={{ height: 'calc(100vh - 90px)', display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden' }}>
      {/* Top Banner Notice (Compact & Sleek) */}
      <div
        className="card"
        style={{
          padding: '10px 16px',
          background: 'linear-gradient(135deg, #1e293b, #0f172a)',
          color: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #334155',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(37, 99, 235, 0.25)', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>Staff Permission Access Control</span>
              <span className="badge" style={{ background: '#2563eb', color: '#fff', fontSize: '0.625rem', padding: '1px 6px' }}>ADMIN ONLY</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Administrators have full system CRUD access. Staff accounts can only perform operations explicitly authorized below.
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout with Dual Independent Scrolls */}
      <div className="permissions-split-grid" style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(280px, 320px) 1fr', gap: '16px', overflow: 'hidden' }}>
        {/* Left Column: Staff Users Directory (SEPARATE INDEPENDENT SCROLL) */}
        <div
          className="card"
          style={{
            padding: 0,
            height: '100%',
            minHeight: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid #e2e8f0',
            background: '#ffffff'
          }}
        >
          {/* Pinned search header (does not scroll) */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #e2e8f0', background: '#fafbfc', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={16} color="#2563eb" />
                <span style={{ fontWeight: 800, fontSize: '0.875rem', color: '#0f172a' }}>Select Staff</span>
              </div>
              <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '1px 7px', borderRadius: '10px', border: '1px solid #dbeafe' }}>
                {filteredStaffUsers.length} Users
              </span>
            </div>
            <input
              type="text"
              placeholder="Search staff name..."
              className="form-control"
              style={{ fontSize: '0.775rem', padding: '5px 10px', height: '30px', background: '#ffffff', borderRadius: '6px' }}
              value={staffSearch}
              onChange={(e) => setStaffSearch(e.target.value)}
            />
          </div>

          {/* Separate dedicated scroll container for staff list */}
          <div
            className="staff-list-scroll custom-scroll"
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'scroll',
              overscrollBehavior: 'contain',
              background: '#ffffff'
            }}
          >
            {loading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                <RefreshCw size={16} className="spin" style={{ margin: '0 auto 6px' }} />
                <span style={{ fontSize: '0.8rem' }}>Loading staff...</span>
              </div>
            ) : filteredStaffUsers.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                No staff found.
              </div>
            ) : (
              filteredStaffUsers.map(u => {
                const isSelected = u.id === selectedUserId;
                const isAdmin = u.role === 'admin';
                return (
                  <div
                    key={u.id}
                    onClick={() => handleSelectUser(u)}
                    style={{
                      padding: '11px 14px',
                      borderBottom: '1px solid #f1f5f9',
                      background: isSelected ? '#eff6ff' : '#ffffff',
                      borderLeft: isSelected ? '4px solid #2563eb' : '4px solid transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      transition: 'background 0.12s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: isAdmin ? '#1e293b' : '#3b82f6',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        flexShrink: 0
                      }}>
                        {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: isSelected ? 800 : 700, color: isSelected ? '#1d4ed8' : '#0f172a', fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {u.name}
                        </div>
                        <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
                          {u.designation || 'Staff'} • {u.branch || 'Karaikal'}
                        </div>
                      </div>
                    </div>

                    <span style={{
                      fontSize: '0.625rem',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: isAdmin ? '#fef3c7' : '#f1f5f9',
                      color: isAdmin ? '#92400e' : '#475569',
                      flexShrink: 0
                    }}>
                      {u.role.toUpperCase()}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer of staff list showing separate scroll notice */}
          <div style={{ padding: '8px 12px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', fontSize: '0.72rem', color: '#64748b', textAlign: 'center', flexShrink: 0, fontWeight: 600 }}>
            ↕ Scroll to browse staff ({filteredStaffUsers.length} total)
          </div>
        </div>

        {/* Right Column: Permission Matrix (SEPARATE INDEPENDENT SCROLL FOR ACCESS SIDE) */}
        <div
          className="permissions-matrix-scroll custom-scroll"
          style={{
            height: '100%',
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            overscrollBehavior: 'contain',
            paddingRight: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}
        >
          {selectedUser ? (
            <>
              {/* Selected Staff Header Card */}
              <div className="card" style={{ padding: '18px 20px', background: '#ffffff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                        {selectedUser.name}
                      </span>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: isSelectedUserAdmin ? '#fef3c7' : '#dbeafe',
                        color: isSelectedUserAdmin ? '#92400e' : '#1e40af'
                      }}>
                        {selectedUser.role.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '2px' }}>
                      Username: <strong>@{selectedUser.username}</strong> • Designation: <strong>{selectedUser.designation || 'Staff'}</strong> • Branch: <strong>{selectedUser.branch || 'Karaikal'}</strong>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      onClick={handleSavePermissions}
                      disabled={saving || isSelectedUserAdmin}
                      className="btn btn-accent btn-sm"
                      style={{ padding: '8px 18px', fontWeight: 800 }}
                    >
                      {saving ? (
                        <>
                          <RefreshCw size={15} className="spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Check size={16} />
                          <span>Save Permissions</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Notice if user is admin */}
                {isSelectedUserAdmin ? (
                  <div style={{ marginTop: '14px', background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={18} color="#d97706" style={{ flexShrink: 0 }} />
                    <span>
                      This user is an <strong>Administrator</strong>. Administrators inherently possess full CRUD permissions across all system modules. To restrict permissions, change their role to Staff in the Staff Directory.
                    </span>
                  </div>
                ) : (
                  /* Quick Preset Pills */
                  <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginRight: '4px' }}>Quick Presets:</span>
                    <button
                      type="button"
                      onClick={handlePresetFullAccess}
                      className="btn btn-xs"
                      style={{ background: '#dbeafe', color: '#1e40af', border: '1px solid #bfdbfe', fontWeight: 700 }}
                    >
                      <Sparkles size={11} style={{ marginRight: 3 }} /> Full Access
                    </button>
                    <button
                      type="button"
                      onClick={handlePresetOperations}
                      className="btn btn-xs"
                      style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', fontWeight: 600 }}
                    >
                      Operations (Orders &amp; Fleet)
                    </button>
                    <button
                      type="button"
                      onClick={handlePresetBillingOnly}
                      className="btn btn-xs"
                      style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', fontWeight: 600 }}
                    >
                      Booking &amp; Billing Only
                    </button>
                    <button
                      type="button"
                      onClick={handlePresetViewOnly}
                      className="btn btn-xs"
                      style={{ background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', fontWeight: 600 }}
                    >
                      View Only
                    </button>
                    <button
                      type="button"
                      onClick={handlePresetRevokeAll}
                      className="btn btn-xs"
                      style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontWeight: 600 }}
                    >
                      Revoke All
                    </button>
                  </div>
                )}
              </div>

              {/* Module Cards Matrix */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {MODULE_DEFINITIONS.map(mod => {
                  const Icon = mod.icon;
                  const modPerms = permissionsState[mod.id] || { can_view: false, can_add: false, can_edit: false, can_delete: false };
                  const isViewAllowed = isSelectedUserAdmin || Boolean(modPerms.can_view);

                  return (
                    <div
                      key={mod.id}
                      className="card"
                      style={{
                        padding: '16px 20px',
                        background: '#ffffff',
                        border: mod.important ? '1.5px solid #93c5fd' : '1px solid #e2e8f0',
                        borderRadius: '12px',
                        boxShadow: mod.important ? '0 4px 12px rgba(37, 99, 235, 0.06)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: 38,
                            height: 38,
                            borderRadius: '8px',
                            background: `${mod.color}15`,
                            color: mod.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <Icon size={20} />
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
                                {mod.name}
                              </span>
                              {mod.important && (
                                <span style={{
                                  fontSize: '0.65rem',
                                  fontWeight: 800,
                                  background: '#dbeafe',
                                  color: '#1d4ed8',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '2px'
                                }}>
                                  <Star size={10} fill="#1d4ed8" /> CRITICAL
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                              {mod.description}
                            </div>
                          </div>
                        </div>

                        {/* Module status chip */}
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: isViewAllowed ? '#dcfce7' : '#fee2e2',
                          color: isViewAllowed ? '#166534' : '#991b1b'
                        }}>
                          {isViewAllowed ? 'Access Granted' : 'Restricted'}
                        </span>
                      </div>

                      {/* Action Toggles Row: View, Add, Edit, Delete */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                        gap: '10px',
                        padding: '12px',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0'
                      }}>
                        {/* 1. VIEW ACCESS */}
                        <div
                          onClick={() => !isSelectedUserAdmin && handleToggle(mod.id, 'view')}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            background: '#ffffff',
                            border: (isSelectedUserAdmin || modPerms.can_view) ? '1.5px solid #10b981' : '1px solid #cbd5e1',
                            cursor: isSelectedUserAdmin ? 'default' : 'pointer',
                            userSelect: 'none'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Eye size={15} color={(isSelectedUserAdmin || modPerms.can_view) ? '#10b981' : '#64748b'} />
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>View</span>
                          </div>
                          {(isSelectedUserAdmin || modPerms.can_view) ? (
                            <CheckSquare size={18} color="#10b981" />
                          ) : (
                            <Square size={18} color="#94a3b8" />
                          )}
                        </div>

                        {/* 2. ADD / CREATE ACCESS */}
                        {mod.actions.includes('add') && (
                          <div
                            onClick={() => !isSelectedUserAdmin && handleToggle(mod.id, 'add')}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              borderRadius: '6px',
                              background: '#ffffff',
                              border: (isSelectedUserAdmin || modPerms.can_add) ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                              cursor: isSelectedUserAdmin ? 'default' : 'pointer',
                              userSelect: 'none'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Plus size={15} color={(isSelectedUserAdmin || modPerms.can_add) ? '#2563eb' : '#64748b'} />
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Create / Add</span>
                            </div>
                            {(isSelectedUserAdmin || modPerms.can_add) ? (
                              <CheckSquare size={18} color="#2563eb" />
                            ) : (
                              <Square size={18} color="#94a3b8" />
                            )}
                          </div>
                        )}

                        {/* 3. EDIT / UPDATE / EXPORT ACCESS */}
                        {mod.actions.includes('edit') && (
                          <div
                            onClick={() => !isSelectedUserAdmin && handleToggle(mod.id, 'edit')}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              borderRadius: '6px',
                              background: '#ffffff',
                              border: (isSelectedUserAdmin || modPerms.can_edit) ? '1.5px solid #d97706' : '1px solid #cbd5e1',
                              cursor: isSelectedUserAdmin ? 'default' : 'pointer',
                              userSelect: 'none'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Edit2 size={15} color={(isSelectedUserAdmin || modPerms.can_edit) ? '#d97706' : '#64748b'} />
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                                {mod.id === 'reports' ? 'Export / Print' : 'Edit / Update'}
                              </span>
                            </div>
                            {(isSelectedUserAdmin || modPerms.can_edit) ? (
                              <CheckSquare size={18} color="#d97706" />
                            ) : (
                              <Square size={18} color="#94a3b8" />
                            )}
                          </div>
                        )}

                        {/* 4. DELETE ACCESS */}
                        {mod.actions.includes('delete') && (
                          <div
                            onClick={() => !isSelectedUserAdmin && handleToggle(mod.id, 'delete')}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              borderRadius: '6px',
                              background: '#ffffff',
                              border: (isSelectedUserAdmin || modPerms.can_delete) ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                              cursor: isSelectedUserAdmin ? 'default' : 'pointer',
                              userSelect: 'none'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Trash2 size={15} color={(isSelectedUserAdmin || modPerms.can_delete) ? '#dc2626' : '#64748b'} />
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>Delete</span>
                            </div>
                            {(isSelectedUserAdmin || modPerms.can_delete) ? (
                              <CheckSquare size={18} color="#dc2626" />
                            ) : (
                              <Square size={18} color="#94a3b8" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Sticky Save Bar */}
              <div className="card" style={{ padding: '14px 20px', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <span style={{ fontSize: '0.85rem', color: isDirty ? '#d97706' : '#64748b', fontWeight: isDirty ? 700 : 500 }}>
                  {isDirty ? '⚠️ You have unsaved permission modifications.' : 'All changes saved.'}
                </span>
                <button
                  onClick={handleSavePermissions}
                  disabled={saving || isSelectedUserAdmin}
                  className="btn btn-accent btn-sm"
                  style={{ padding: '8px 24px', fontWeight: 800 }}
                >
                  {saving ? 'Saving...' : 'Save Permissions'}
                </button>
              </div>
            </>
          ) : (
            <div className="card" style={{ padding: '50px', textAlign: 'center', color: '#94a3b8' }}>
              Select a staff member from the left panel to configure permissions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PermissionsView;
