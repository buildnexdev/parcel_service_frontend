import React, { useState, useEffect } from 'react';
import { api } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import SuccessModal from '../Common/SuccessModal';
import { 
  Truck, Plus, Search, Edit2, Trash2, X, AlertTriangle, 
  Phone, CheckCircle2, Clock, Wrench, Shield, Navigation, User
} from 'lucide-react';

const VehiclesView = () => {
  const { showToast } = useToast();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [ownershipFilter, setOwnershipFilter] = useState('ALL');

  // Stats
  const [stats, setStats] = useState({
    total_vehicles: 0,
    active_count: 0,
    in_transit_count: 0,
    maintenance_count: 0,
    inactive_count: 0
  });

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [vehicleToDelete, setVehicleToDelete] = useState(null);
  const [successModalData, setSuccessModalData] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form State
  const initialForm = {
    vehicle_no: '',
    vehicle_type: 'Lorry',
    model_name: '',
    capacity: '2.5 Ton',
    driver_name: '',
    driver_phone: '',
    owner_name: 'ES Transporters',
    ownership_type: 'OWN',
    assigned_route: 'Karaikal - Pondicherry',
    rc_number: '',
    status: 'active'
  };
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    loadVehicles();
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      const res = await api.getBranches();
      if (res.success) setBranches(res.branches || []);
    } catch (err) {
      console.error('Failed to load branches:', err);
    }
  };

  const loadVehicles = async () => {
    setLoading(true);
    try {
      const res = await api.getVehicles({
        search,
        status: statusFilter,
        ownership_type: ownershipFilter
      });
      if (res.success && res.vehicles) {
        setVehicles(res.vehicles);
        if (res.stats) {
          setStats(res.stats);
        }
      }
    } catch (err) {
      console.error('Failed to load vehicles:', err);
      showToast(err.message || 'Failed to load fleet vehicles', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Debounced search / filter update
  useEffect(() => {
    const timer = setTimeout(() => {
      loadVehicles();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter, ownershipFilter]);

  const handleOpenAdd = () => {
    setFormData(initialForm);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      vehicle_no: vehicle.vehicle_no || '',
      vehicle_type: vehicle.vehicle_type || 'Lorry',
      model_name: vehicle.model_name || '',
      capacity: vehicle.capacity || '2.5 Ton',
      driver_name: vehicle.driver_name || '',
      driver_phone: vehicle.driver_phone || '',
      owner_name: vehicle.owner_name || 'ES Transporters',
      ownership_type: vehicle.ownership_type || 'OWN',
      assigned_route: vehicle.assigned_route || 'Karaikal - Pondicherry',
      rc_number: vehicle.rc_number || '',
      status: vehicle.status || 'active'
    });
    setIsEditModalOpen(true);
  };

  const handleCreateVehicle = async (e) => {
    e.preventDefault();
    if (!formData.vehicle_no.trim()) {
      showToast('Vehicle registration number is required.', 'error');
      return;
    }
    if (formData.driver_phone && !/^\d{10}$/.test(formData.driver_phone.trim())) {
      showToast('Driver phone number must be exactly 10 digits.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.createVehicle({
        ...formData,
        vehicle_no: formData.vehicle_no.trim().toUpperCase()
      });
      showToast(res.message || 'Vehicle added to fleet successfully!', 'success');
      setIsAddModalOpen(false);
      loadVehicles();

      setSuccessModalData({
        title: 'Vehicle Added to Fleet!',
        message: `Vehicle ${res.vehicle.vehicle_no} is now registered in the fleet directory.`,
        details: {
          'Vehicle Number': res.vehicle.vehicle_no,
          'Vehicle Type': res.vehicle.vehicle_type,
          'Load Capacity': res.vehicle.capacity || 'N/A',
          'Assigned Driver': res.vehicle.driver_name || 'Unassigned',
          'Assigned Route': res.vehicle.assigned_route,
          'Ownership': res.vehicle.ownership_type
        }
      });
    } catch (err) {
      showToast(err.message || 'Failed to add vehicle', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateVehicle = async (e) => {
    e.preventDefault();
    if (!editingVehicle) return;
    if (!formData.vehicle_no.trim()) {
      showToast('Vehicle registration number is required.', 'error');
      return;
    }
    if (formData.driver_phone && !/^\d{10}$/.test(formData.driver_phone.trim())) {
      showToast('Driver phone number must be exactly 10 digits.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.updateVehicle(editingVehicle.id, {
        ...formData,
        vehicle_no: formData.vehicle_no.trim().toUpperCase()
      });
      showToast(res.message || 'Vehicle details updated successfully!', 'success');
      setIsEditModalOpen(false);
      setEditingVehicle(null);
      loadVehicles();

      setSuccessModalData({
        title: 'Vehicle Updated Successfully',
        message: `Details for ${res.vehicle.vehicle_no} have been updated in the fleet.`,
        details: {
          'Vehicle Number': res.vehicle.vehicle_no,
          'Vehicle Type': res.vehicle.vehicle_type,
          'Load Capacity': res.vehicle.capacity || 'N/A',
          'Driver': res.vehicle.driver_name || 'Unassigned',
          'Status': res.vehicle.status.toUpperCase(),
          'Route': res.vehicle.assigned_route
        }
      });
    } catch (err) {
      showToast(err.message || 'Failed to update vehicle', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!vehicleToDelete) return;
    setDeleting(true);
    try {
      const res = await api.deleteVehicle(vehicleToDelete.id);
      showToast(res.message || 'Vehicle deleted successfully!', 'success');
      setVehicleToDelete(null);
      loadVehicles();
    } catch (err) {
      showToast(err.message || 'Cannot delete vehicle', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span className="badge badge-paid" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span className="badge-dot" style={{ background: '#059669' }}></span>
            <span>Active / Available</span>
          </span>
        );
      case 'in_transit':
        return (
          <span className="badge badge-in-transit" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span className="badge-dot" style={{ background: '#2563eb' }}></span>
            <span>In Transit</span>
          </span>
        );
      case 'maintenance':
        return (
          <span className="badge badge-cancelled" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span className="badge-dot" style={{ background: '#dc2626' }}></span>
            <span>Maintenance</span>
          </span>
        );
      default:
        return (
          <span className="badge" style={{ background: '#f1f5f9', color: '#64748b' }}>
            <span>Inactive</span>
          </span>
        );
    }
  };

  const getOwnershipBadge = (type) => {
    if (type === 'OWN') {
      return (
        <span style={{ fontSize: '0.725rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
          OWN
        </span>
      );
    }
    if (type === 'ATTACHED') {
      return (
        <span style={{ fontSize: '0.725rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
          ATTACHED
        </span>
      );
    }
    return (
      <span style={{ fontSize: '0.725rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#faf5ff', color: '#7e22ce', border: '1px solid #e9d5ff' }}>
        MARKET
      </span>
    );
  };

  return (
    <div>
      {/* Stat Overview Banner */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-card-info">
            <h4>Total Vehicles</h4>
            <div className="stat-val">{stats.total_vehicles || vehicles.length}</div>
          </div>
          <div className="stat-card-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <Truck size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-info">
            <h4>Active / Ready</h4>
            <div className="stat-val">{stats.active_count || 0}</div>
          </div>
          <div className="stat-card-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-info">
            <h4>On Road / In Transit</h4>
            <div className="stat-val">{stats.in_transit_count || 0}</div>
          </div>
          <div className="stat-card-icon" style={{ background: '#fffbeb', color: '#d97706' }}>
            <Clock size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-info">
            <h4>Under Maintenance</h4>
            <div className="stat-val">{stats.maintenance_count || 0}</div>
          </div>
          <div className="stat-card-icon" style={{ background: '#fef2f2', color: '#dc2626' }}>
            <Wrench size={22} />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="table-card">
        <div className="table-header">
          <div>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Truck size={22} style={{ color: 'var(--secondary)' }} />
              <span>Vehicles Directory</span>
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Manage delivery lorries, vehicle numbers, load capacities, and order assignments
            </p>
          </div>

          <button className="btn btn-accent" onClick={handleOpenAdd} style={{ whiteSpace: 'nowrap' }}>
            <Plus size={18} />
            <span>Add Vehicle</span>
          </button>
        </div>

        {/* Filters */}
        <div style={{ padding: '14px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 'min(100%, 260px)', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '36px' }}
              placeholder="Search by Vehicle No, Model, Driver, Route..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="form-control"
            style={{ width: 'auto', minWidth: '150px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="active">Active / Available</option>
            <option value="in_transit">In Transit</option>
            <option value="maintenance">Under Maintenance</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            className="form-control"
            style={{ width: 'auto', minWidth: '150px' }}
            value={ownershipFilter}
            onChange={(e) => setOwnershipFilter(e.target.value)}
          >
            <option value="ALL">All Ownership</option>
            <option value="OWN">Company Owned</option>
            <option value="ATTACHED">Attached Fleet</option>
            <option value="MARKET">Market Vehicle</option>
          </select>
        </div>

        {/* Table Content */}
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '160px' }}>Vehicle Plate</th>
                <th>Vehicle Type & Model</th>
                <th>Capacity</th>
                <th>Assigned Route</th>
                <th>Assigned Driver</th>
                <th>Ownership</th>
                <th>Status</th>
                <th>Active Orders</th>
                <th style={{ textAlign: 'center', width: '110px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                    Loading fleet vehicles...
                  </td>
                </tr>
              ) : vehicles.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No vehicles found. Click "+ Add Vehicle" to register a delivery vehicle.
                  </td>
                </tr>
              ) : (
                vehicles.map(v => (
                  <tr key={v.id}>
                    <td>
                      <div style={{
                        fontFamily: 'monospace',
                        fontWeight: 800,
                        fontSize: '0.925rem',
                        color: '#0f172a',
                        background: '#ffffff',
                        border: '1.5px solid #0f172a',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        letterSpacing: '0.04em'
                      }}>
                        <span style={{ fontSize: '0.65rem', background: '#0f172a', color: '#fff', padding: '1px 3px', borderRadius: '2px', fontWeight: 700 }}>IND</span>
                        <span>{v.vehicle_no}</span>
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.925rem' }}>
                        {v.vehicle_type}
                      </div>
                      {v.model_name && (
                        <div style={{ fontSize: '0.785rem', color: '#64748b', marginTop: 2 }}>
                          {v.model_name}
                        </div>
                      )}
                    </td>

                    <td>
                      <span style={{
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        color: '#1d4ed8',
                        background: '#eff6ff',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        border: '1px solid #bfdbfe'
                      }}>
                        {v.capacity || '2.5 Ton'}
                      </span>
                    </td>

                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f8fafc', border: '1px solid #e2e8f0', padding: '3px 9px', borderRadius: '6px', fontWeight: 600, fontSize: '0.825rem', color: '#1e293b' }}>
                        <Navigation size={13} style={{ color: '#2563eb' }} />
                        <span>{v.assigned_route}</span>
                      </div>
                    </td>

                    <td>
                      {v.driver_name ? (
                        <div>
                          <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <User size={13} style={{ color: '#64748b' }} />
                            <span>{v.driver_name}</span>
                          </div>
                          {v.driver_phone && (
                            <div style={{ fontSize: '0.775rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                              <Phone size={11} style={{ opacity: 0.7 }} />
                              <a href={`tel:${v.driver_phone}`} style={{ color: '#2563eb' }}>{v.driver_phone}</a>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>Unassigned</span>
                      )}
                    </td>

                    <td>{getOwnershipBadge(v.ownership_type)}</td>

                    <td>{getStatusBadge(v.status)}</td>

                    <td>
                      {v.active_deliveries_count > 0 ? (
                        <span style={{
                          fontWeight: 700,
                          fontSize: '0.775rem',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          background: '#eff6ff',
                          color: '#1d4ed8',
                          border: '1px solid #bfdbfe',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}>
                          <Truck size={12} />
                          <span>{v.active_deliveries_count} Active</span>
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>0 Active</span>
                      )}
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <button
                          className="btn btn-outline btn-xs"
                          onClick={() => handleOpenEdit(v)}
                          title="Edit vehicle details"
                          style={{ color: '#0284c7', borderColor: '#bae6fd', background: '#f0f9ff' }}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          className="btn btn-outline btn-xs"
                          onClick={() => setVehicleToDelete(v)}
                          title="Delete vehicle"
                          style={{ color: '#dc2626', borderColor: '#fecaca', background: '#fef2f2' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================= */}
      {/* ADD VEHICLE MODAL */}
      {/* ============================================================= */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-box" style={{ maxWidth: 880, width: 'min(95vw, 880px)' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Truck size={20} color="var(--secondary)" />
                <h3>Add New Vehicle</h3>
              </div>
              <button className="modal-close" onClick={() => setIsAddModalOpen(false)}>
                <X size={22} />
              </button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleCreateVehicle}>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Vehicle Registration Number *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. TN 49 AB 1234 or PY 02 C 5678"
                      value={formData.vehicle_no}
                      onChange={(e) => setFormData({ ...formData, vehicle_no: e.target.value.toUpperCase() })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Vehicle Type / Category *</label>
                    <select
                      className="form-control"
                      value={formData.vehicle_type}
                      onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                    >
                      <option value="Ashok Leyland Dost">Ashok Leyland Dost</option>
                      <option value="Tata 407 Lorry">Tata 407 Lorry</option>
                      <option value="Tata Ace">Tata Ace (Chhota Hathi)</option>
                      <option value="Eicher 14ft Container">Eicher 14ft Container</option>
                      <option value="Eicher 19ft Lorry">Eicher 19ft Lorry</option>
                      <option value="Mahindra Bolero Pickup">Mahindra Bolero Pickup</option>
                      <option value="Heavy Cargo Lorry">Heavy Cargo Lorry</option>
                      <option value="Delivery Van">Delivery Van</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Model / Variant Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Dost Strong / Pro 2049"
                      value={formData.model_name}
                      onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Carrying Capacity</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 2.5 Ton / 4.5 Ton / 1200 Kg"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Assigned Driver Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Agal or Mathavan"
                      value={formData.driver_name}
                      onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Driver Phone</label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="e.g. 9876543210"
                      maxLength={10}
                      value={formData.driver_phone}
                      onChange={(e) => setFormData({ ...formData, driver_phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Assigned Route</label>
                    <select
                      className="form-control"
                      value={formData.assigned_route}
                      onChange={(e) => setFormData({ ...formData, assigned_route: e.target.value })}
                    >
                      <option value="Karaikal - Pondicherry">Karaikal - Pondicherry (Main Line)</option>
                      <option value="Karaikal - Nagapattinam">Karaikal - Nagapattinam</option>
                      <option value="Pondicherry - Cuddalore">Pondicherry - Cuddalore</option>
                      <option value="Pondicherry - Chidambaram">Pondicherry - Chidambaram</option>
                      <option value="Karaikal - Mayiladuthurai">Karaikal - Mayiladuthurai</option>
                      <option value="Karaikal - Thiruvarur">Karaikal - Thiruvarur</option>
                      <option value="All Delta Branches">All Delta Branches (Flexible)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Ownership Type</label>
                    <select
                      className="form-control"
                      value={formData.ownership_type}
                      onChange={(e) => setFormData({ ...formData, ownership_type: e.target.value })}
                    >
                      <option value="OWN">Company Owned (ES Transporters)</option>
                      <option value="ATTACHED">Attached Fleet Partner</option>
                      <option value="MARKET">Market Trip Vehicle</option>
                    </select>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">RC / Registration Number</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. RC-4902384"
                      value={formData.rc_number}
                      onChange={(e) => setFormData({ ...formData, rc_number: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Vehicle Status</label>
                    <select
                      className="form-control"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="active">Active / Available</option>
                      <option value="in_transit">In Transit (On Road)</option>
                      <option value="maintenance">Under Maintenance</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-between items-center" style={{ marginTop: 24 }}>
                  <button type="button" className="btn btn-outline" onClick={() => setIsAddModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-accent" disabled={submitting}>
                    {submitting ? 'Registering...' : 'Save & Register Vehicle'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* EDIT VEHICLE MODAL */}
      {/* ============================================================= */}
      {isEditModalOpen && editingVehicle && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="modal-box" style={{ maxWidth: 880, width: 'min(95vw, 880px)' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Edit2 size={20} color="var(--info)" />
                <h3>Edit Vehicle: {editingVehicle.vehicle_no}</h3>
              </div>
              <button className="modal-close" onClick={() => setIsEditModalOpen(false)}>
                <X size={22} />
              </button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleUpdateVehicle}>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Vehicle Registration Number *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.vehicle_no}
                      onChange={(e) => setFormData({ ...formData, vehicle_no: e.target.value.toUpperCase() })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Vehicle Type / Category *</label>
                    <select
                      className="form-control"
                      value={formData.vehicle_type}
                      onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                    >
                      <option value="Ashok Leyland Dost">Ashok Leyland Dost</option>
                      <option value="Tata 407 Lorry">Tata 407 Lorry</option>
                      <option value="Tata Ace">Tata Ace (Chhota Hathi)</option>
                      <option value="Eicher 14ft Container">Eicher 14ft Container</option>
                      <option value="Eicher 19ft Lorry">Eicher 19ft Lorry</option>
                      <option value="Mahindra Bolero Pickup">Mahindra Bolero Pickup</option>
                      <option value="Heavy Cargo Lorry">Heavy Cargo Lorry</option>
                      <option value="Delivery Van">Delivery Van</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Model / Variant Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.model_name}
                      onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Carrying Capacity</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Assigned Driver Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.driver_name}
                      onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Driver Phone</label>
                    <input
                      type="tel"
                      className="form-control"
                      maxLength={10}
                      value={formData.driver_phone}
                      onChange={(e) => setFormData({ ...formData, driver_phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Assigned Route</label>
                    <select
                      className="form-control"
                      value={formData.assigned_route}
                      onChange={(e) => setFormData({ ...formData, assigned_route: e.target.value })}
                    >
                      <option value="Karaikal - Pondicherry">Karaikal - Pondicherry (Main Line)</option>
                      <option value="Karaikal - Nagapattinam">Karaikal - Nagapattinam</option>
                      <option value="Pondicherry - Cuddalore">Pondicherry - Cuddalore</option>
                      <option value="Pondicherry - Chidambaram">Pondicherry - Chidambaram</option>
                      <option value="Karaikal - Mayiladuthurai">Karaikal - Mayiladuthurai</option>
                      <option value="Karaikal - Thiruvarur">Karaikal - Thiruvarur</option>
                      <option value="All Delta Branches">All Delta Branches (Flexible)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Ownership Type</label>
                    <select
                      className="form-control"
                      value={formData.ownership_type}
                      onChange={(e) => setFormData({ ...formData, ownership_type: e.target.value })}
                    >
                      <option value="OWN">Company Owned (ES Transporters)</option>
                      <option value="ATTACHED">Attached Fleet Partner</option>
                      <option value="MARKET">Market Trip Vehicle</option>
                    </select>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">RC / Registration Number</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.rc_number}
                      onChange={(e) => setFormData({ ...formData, rc_number: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Vehicle Status</label>
                    <select
                      className="form-control"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="active">Active / Available</option>
                      <option value="in_transit">In Transit (On Road)</option>
                      <option value="maintenance">Under Maintenance</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-between items-center" style={{ marginTop: 24 }}>
                  <button type="button" className="btn btn-outline" onClick={() => setIsEditModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-accent" disabled={submitting}>
                    {submitting ? 'Updating...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* DELETE VEHICLE CONFIRMATION MODAL */}
      {/* ============================================================= */}
      {vehicleToDelete && (
        <div className="modal-overlay" onClick={() => setVehicleToDelete(null)}>
          <div className="modal-box" style={{ maxWidth: 440, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              width: 54,
              height: 54,
              borderRadius: '50%',
              background: '#fef2f2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <AlertTriangle size={28} />
            </div>

            <h3 style={{ fontSize: '1.25rem', marginBottom: 8, color: '#0f172a' }}>
              Remove Vehicle {vehicleToDelete.vehicle_no}?
            </h3>

            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: 20, lineHeight: 1.5 }}>
              Are you sure you want to remove <strong>{vehicleToDelete.vehicle_type} ({vehicleToDelete.vehicle_no})</strong> from the fleet? This action cannot be undone.
            </p>

            <div className="flex justify-between items-center" style={{ gap: 12 }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setVehicleToDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{ flex: 1, justifyContent: 'center', background: '#dc2626', color: '#fff' }}
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Removing...' : 'Delete Vehicle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* SUCCESS CONFIRMATION MODAL */}
      {/* ============================================================= */}
      <SuccessModal
        isOpen={!!successModalData}
        onClose={() => setSuccessModalData(null)}
        title={successModalData?.title || ''}
        message={successModalData?.message || ''}
        details={successModalData?.details}
      />
    </div>
  );
};

export default VehiclesView;
