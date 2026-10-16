import React, { useState, useEffect } from 'react';
import { api } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import SuccessModal from '../Common/SuccessModal';
import { Truck, Phone, Plus, Edit2, Trash2, X, AlertTriangle } from 'lucide-react';

const DriversView = () => {
  const { showToast } = useToast();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [driverToDelete, setDriverToDelete] = useState(null);
  const [successModalData, setSuccessModalData] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    license_no: '',
    vehicle_no: '',
    assigned_route: 'Karaikal - Pondicherry',
    status: 'active'
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadDrivers();
  }, []);

  const loadDrivers = async () => {
    setLoading(true);
    try {
      const res = await api.getDrivers();
      if (res.success && res.drivers) {
        setDrivers(res.drivers);
      }
    } catch (err) {
      console.error('Failed to load drivers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingDriver(null);
    setFormData({
      name: '',
      phone: '',
      license_no: '',
      vehicle_no: '',
      assigned_route: 'Karaikal - Pondicherry',
      status: 'active'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (driver) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name,
      phone: driver.phone,
      license_no: driver.license_no || '',
      vehicle_no: driver.vehicle_no,
      assigned_route: driver.assigned_route || 'Karaikal - Pondicherry',
      status: driver.status
    });
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!driverToDelete) return;
    setDeleting(true);
    try {
      const res = await api.deleteDriver(driverToDelete.id);
      showToast(res.message || 'Driver removed successfully!', 'success');
      setDriverToDelete(null);
      loadDrivers();
    } catch (err) {
      showToast(err.message || 'Cannot delete driver', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(formData.phone)) {
      showToast('Phone number must be exactly 10 digits.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      if (editingDriver) {
        await api.updateDriver(editingDriver.id, formData);
        showToast('Driver updated successfully!', 'success');
        setSuccessModalData({
          title: 'Driver Updated Successfully',
          message: `The records for driver ${formData.name} have been updated in the fleet.`,
          details: {
            'Driver Name': formData.name,
            'Vehicle Number': formData.vehicle_no,
            'Phone Number': formData.phone,
            'Assigned Route': formData.assigned_route,
            'Status': formData.status === 'active' ? 'Active / Available' : formData.status
          }
        });
      } else {
        await api.createDriver(formData);
        showToast('Assigned driver added successfully!', 'success');
        setSuccessModalData({
          title: 'Assigned Driver Added Successfully!',
          message: `Driver ${formData.name} is now registered with vehicle ${formData.vehicle_no} and ready for dispatch.`,
          details: {
            'Driver Name': formData.name,
            'Vehicle Registration': formData.vehicle_no,
            'Phone Number': formData.phone,
            'Assigned Route': formData.assigned_route,
            'Driving License': formData.license_no || 'Not Provided'
          }
        });
      }
      setIsModalOpen(false);
      loadDrivers();
    } catch (err) {
      showToast(err.message || 'Failed to save driver', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="table-card">
        <div className="table-header">
          <div>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--primary-dark)' }}>Assigned Drivers Directory</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Manage fleet drivers, vehicles, and assigned delivery routes
            </p>
          </div>
          <button className="btn btn-accent" onClick={handleOpenAdd}>
            <Plus size={18} />
            <span>Add Assigned Driver</span>
          </button>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Driver Name & DL</th>
                <th>Vehicle Registration</th>
                <th>Phone Number</th>
                <th>Assigned Route</th>
                <th>Duty Status</th>
                <th>Active Loads</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px' }}>Loading fleet drivers...</td>
                </tr>
              ) : drivers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No drivers found. Click "Add Assigned Driver" above to register a driver with vehicle details.
                  </td>
                </tr>
              ) : (
                drivers.map(d => {
                  const statusCls = d.status === 'on_duty' ? 'badge-on-duty' : (d.status === 'active' ? 'badge-active' : 'badge-inactive');
                  return (
                    <tr key={d.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--primary-dark)', fontSize: '0.95rem' }}>{d.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>DL: {d.license_no || 'N/A'}</div>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                          {d.vehicle_no}
                        </span>
                      </td>
                      <td>
                        <a href={`tel:${d.phone}`} style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Phone size={14} /> {d.phone}
                        </a>
                      </td>
                      <td>{d.assigned_route}</td>
                      <td>
                        <span className={`badge ${statusCls}`}>{d.status.replace('_', ' ').toUpperCase()}</span>
                      </td>
                      <td>
                        <strong>{d.active_deliveries_count || 0}</strong> active
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn btn-outline btn-sm" onClick={() => handleOpenEdit(d)} title="Edit Driver">
                            <Edit2 size={14} />
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => setDriverToDelete(d)} title="Delete Driver">
                            <Trash2 size={14} />
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

      {/* Driver Add/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingDriver ? 'Edit Driver Details' : 'Add Assigned Driver'}</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                <X size={22} />
              </button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Driver Full Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Antony / Kavitha"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number (10 Digits) *</label>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="e.g. 9842111234"
                    value={formData.phone}
                    maxLength={10}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Vehicle Registration Number *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. TN-49-BY-8470 or PY-02-V-6987"
                    value={formData.vehicle_no}
                    onChange={(e) => setFormData({ ...formData, vehicle_no: e.target.value.toUpperCase() })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Driving License Number</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. DL-PY-2020-00124"
                    value={formData.license_no}
                    onChange={(e) => setFormData({ ...formData, license_no: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Assigned Route / Corridor</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Pondy to Karaikal"
                    value={formData.assigned_route}
                    onChange={(e) => setFormData({ ...formData, assigned_route: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Duty Status</label>
                  <select
                    className="form-control"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="active">Active (Available)</option>
                    <option value="on_duty">On Duty (In Transit)</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="flex justify-between items-center" style={{ marginTop: '24px' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-accent" disabled={submitting}>
                    {submitting ? 'Saving...' : (editingDriver ? 'Save Changes' : 'Register Driver')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* In-UI Delete Confirmation Modal */}
      {driverToDelete && (
        <div className="modal-overlay" onClick={() => setDriverToDelete(null)}>
          <div className="modal-box" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ background: '#991b1b' }}>
              <div className="flex items-center gap-2">
                <AlertTriangle size={20} />
                <h3>Remove Driver</h3>
              </div>
              <button className="modal-close" onClick={() => setDriverToDelete(null)}>
                <X size={22} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: 12 }}>
                Are you sure you want to remove <strong>{driverToDelete.name}</strong> ({driverToDelete.vehicle_no})?
              </p>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: 20 }}>
                This action cannot be undone. Drivers with active in-progress orders cannot be removed.
              </p>
              <div className="flex justify-between items-center" style={{ gap: '12px', flexWrap: 'wrap' }}>
                <button className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setDriverToDelete(null)}>
                  Cancel
                </button>
                <button className="btn btn-danger" style={{ flex: 1, justifyContent: 'center' }} onClick={handleConfirmDelete} disabled={deleting}>
                  {deleting ? 'Removing...' : 'Yes, Remove Driver'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal in UI */}
      <SuccessModal
        isOpen={!!successModalData}
        onClose={() => setSuccessModalData(null)}
        title={successModalData?.title || 'Success'}
        message={successModalData?.message || 'Operation successful'}
        details={successModalData?.details}
        primaryButtonText="Done"
        secondaryButtonText="Add Another Driver"
        onSecondaryClick={() => {
          setSuccessModalData(null);
          handleOpenAdd();
        }}
      />
    </div>
  );
};

export default DriversView;
