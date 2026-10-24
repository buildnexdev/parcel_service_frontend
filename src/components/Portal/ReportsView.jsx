import React, { useState, useEffect } from 'react';
import { api } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Filter, Printer, Download, RefreshCw, Calendar, DollarSign, Package, ShieldAlert } from 'lucide-react';

const ReportsView = () => {
  const { hasPermission } = useAuth();
  const { showToast } = useToast();
  const [branches, setBranches] = useState([]);
  const [drivers, setDrivers] = useState([]);

  // Filter States
  const [singleDate, setSingleDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('ALL');
  const [deliveryStatus, setDeliveryStatus] = useState('ALL');
  const [fromStation, setFromStation] = useState('ALL');
  const [toStation, setToStation] = useState('ALL');
  const [driverId, setDriverId] = useState('ALL');

  // Report Data State
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMetadata();
    runReport();
  }, []);

  const loadMetadata = async () => {
    try {
      const [bRes, dRes] = await Promise.all([
        api.getBranches(),
        api.getDrivers()
      ]);
      if (bRes.success) setBranches(bRes.branches || []);
      if (dRes.success) setDrivers(dRes.drivers || []);
    } catch (err) {
      console.error('Failed to load branches/drivers metadata:', err);
    }
  };

  const runReport = async () => {
    setLoading(true);
    try {
      const res = await api.getDailyReport({
        date: startDate && endDate ? undefined : singleDate,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        payment_status: paymentStatus,
        delivery_status: deliveryStatus,
        from_station: fromStation,
        to_station: toStation,
        driver_id: driverId
      });
      if (res.success) {
        setReportData(res);
      }
    } catch (err) {
      console.error('Failed to run report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSingleDate('');
    setStartDate('');
    setEndDate('');
    setPaymentStatus('ALL');
    setDeliveryStatus('ALL');
    setFromStation('ALL');
    setToStation('ALL');
    setDriverId('ALL');
  };

  // Print Delivery Run Sheet / Orders Table
  const handlePrintRunSheet = () => {
    if (!hasPermission('reports', 'edit')) {
      showToast('You do not have permission to print or export reports.', 'error');
      return;
    }
    if (!reportData || !reportData.orders || reportData.orders.length === 0) {
      showToast('Please run the report and ensure there are orders to print on the run sheet.', 'error');
      return;
    }
    window.print();
    showToast('🖨️ Delivery Run Sheet & Orders table sent to printer!', 'success');
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!hasPermission('reports', 'edit')) {
      showToast('You do not have permission to export reports.', 'error');
      return;
    }
    if (!reportData || !reportData.orders || reportData.orders.length === 0) {
      showToast('No report data available to export.', 'error');
      return;
    }

    const headers = ['LR Number', 'Booking Date', 'Sender', 'Receiver', 'From', 'To', 'Pieces', 'Weight_KG', 'Delivery_Status', 'Payment_Mode', 'Payment_Status', 'Total_Amount', 'Driver'];
    const rows = reportData.orders.map(o => [
      o.lr_number,
      o.booking_date,
      `"${(o.sender_name || '').replace(/"/g, '""')}"`,
      `"${(o.receiver_name || '').replace(/"/g, '""')}"`,
      o.from_station,
      o.to_station,
      o.pieces,
      o.weight_kg,
      o.delivery_status,
      o.payment_mode,
      o.payment_status,
      o.total_amount,
      `"${(o.driver_name || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ES_Transporters_Daily_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!hasPermission('reports', 'view')) {
    return (
      <div className="card" style={{ padding: '60px 20px', textAlign: 'center', maxWidth: '600px', margin: '40px auto' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <ShieldAlert size={36} />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
          Access Denied: Financial & Daily Reports
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.6 }}>
          You do not have permission to view daily reports and revenue analytics. Please contact an administrator to request access.
        </p>
      </div>
    );
  }

  const s = reportData?.summary || { totalBills: 0, totalPieces: 0, totalAmount: 0, totalPaid: 0, totalToPay: 0, totalCredit: 0 };
  const orders = reportData?.orders || [];

  return (
    <div>
      {/* Filter Card */}
      <div className="no-print" style={{ background: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', padding: 'clamp(16px, 3vw, 24px)', marginBottom: '24px' }}>
        <div className="flex items-center gap-2" style={{ marginBottom: '16px' }}>
          <Filter size={18} color="var(--primary)" />
          <h3 style={{ fontSize: '1.15rem', color: 'var(--primary-dark)' }}>Daily Reports & Multi-Filters</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))', gap: '14px', marginBottom: '18px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Single Date</label>
            <input
              type="date"
              className="form-control"
              value={singleDate}
              onChange={(e) => {
                setSingleDate(e.target.value);
                setStartDate('');
                setEndDate('');
              }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">From Date (Range)</label>
            <input
              type="date"
              className="form-control"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setSingleDate('');
              }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">To Date (Range)</label>
            <input
              type="date"
              className="form-control"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setSingleDate('');
              }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Payment Status</label>
            <select
              className="form-control"
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
            >
              <option value="ALL">All Payment Statuses</option>
              <option value="PAID">PAID</option>
              <option value="UNPAID">UNPAID (Pending Collection)</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Delivered Status</label>
            <select
              className="form-control"
              value={deliveryStatus}
              onChange={(e) => setDeliveryStatus(e.target.value)}
            >
              <option value="ALL">All Delivery Statuses</option>
              <option value="DELIVERED">Delivered</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
              <option value="BOOKED">Booked</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">From Station</label>
            <select
              className="form-control"
              value={fromStation}
              onChange={(e) => setFromStation(e.target.value)}
            >
              <option value="ALL">All Stations</option>
              {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">To Station</label>
            <select
              className="form-control"
              value={toStation}
              onChange={(e) => setToStation(e.target.value)}
            >
              <option value="ALL">All Stations</option>
              {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Assigned Driver</label>
            <select
              className="form-control"
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
            >
              <option value="ALL">All Drivers</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.name} ({d.vehicle_no})</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button className="btn btn-primary" onClick={runReport} disabled={loading}>
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              <span>Apply Filters</span>
            </button>
            <button className="btn btn-outline" onClick={handleResetFilters}>
              Reset
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button className="btn btn-accent" onClick={handlePrintRunSheet}>
              <Printer size={16} />
              <span>Print Orders Table</span>
            </button>
            <button className="btn btn-outline" onClick={handleExportCSV}>
              <Download size={16} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Summary Badges */}
      <div className="stats-grid no-print" style={{ marginBottom: '24px' }}>
        <div className="stat-card" style={{ padding: '16px' }}>
          <div className="stat-card-info">
            <h4>Total Bills</h4>
            <div className="stat-val" style={{ fontSize: '1.45rem' }}>{s.totalBills}</div>
          </div>
        </div>

        <div className="stat-card" style={{ padding: '16px' }}>
          <div className="stat-card-info">
            <h4>Total Pieces</h4>
            <div className="stat-val" style={{ fontSize: '1.45rem' }}>{s.totalPieces}</div>
          </div>
        </div>

        <div className="stat-card" style={{ padding: '16px' }}>
          <div className="stat-card-info">
            <h4>Total Freight</h4>
            <div className="stat-val" style={{ fontSize: '1.45rem' }}>₹{Number(s.totalAmount).toLocaleString()}</div>
          </div>
        </div>

        <div className="stat-card" style={{ padding: '16px' }}>
          <div className="stat-card-info">
            <h4>Paid Collections</h4>
            <div className="stat-val" style={{ fontSize: '1.45rem', color: '#16a34a' }}>₹{Number(s.totalPaid).toLocaleString()}</div>
          </div>
        </div>

        <div className="stat-card" style={{ padding: '16px' }}>
          <div className="stat-card-info">
            <h4>To-Pay to Collect</h4>
            <div className="stat-val" style={{ fontSize: '1.45rem', color: '#ea580c' }}>₹{Number(s.totalToPay).toLocaleString()}</div>
          </div>
        </div>

        <div className="stat-card" style={{ padding: '16px' }}>
          <div className="stat-card-info">
            <h4>Credit Total</h4>
            <div className="stat-val" style={{ fontSize: '1.45rem', color: '#0284c7' }}>₹{Number(s.totalCredit).toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Official Print Header (Visible ONLY on print) */}
      <div className="print-only" style={{ marginBottom: '14px', borderBottom: '2px solid #000', paddingBottom: '8px' }}>
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: '#000' }}>
            ES TRANSPORTERS | IGR QUICK PARCEL SERVICE
          </h2>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, margin: '2px 0', color: '#1e293b' }}>
            DAILY ORDER REPORT
          </div>
          <div style={{ fontSize: '0.75rem', color: '#475569' }}>
            Head Office: Karaikal | Branch Office: Puducherry | Phone: 94424 85296 / 93604 27527
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', fontWeight: 700, border: '1px solid #333', padding: '6px 10px', background: '#f8fafc' }}>
          <span>DATE: {singleDate ? new Date(singleDate).toLocaleDateString('en-IN') : (startDate && endDate ? `${startDate} to ${endDate}` : 'All Dates')}</span>
          <span>ROUTE: {fromStation !== 'ALL' ? fromStation : 'All'} ➔ {toStation !== 'ALL' ? toStation : 'All'}</span>
          <span>TOTAL ORDERS: {orders.length}</span>
          <span>TOTAL FREIGHT: ₹{Number(s.totalAmount).toLocaleString()}</span>
        </div>
      </div>

      {/* Filtered Report Table */}
      <div className="table-card">
        <div className="table-header no-print">
          <h3 style={{ fontSize: '1.15rem', color: 'var(--primary-dark)' }}>Report Order Details</h3>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>SL</th>
                <th>LR No</th>
                <th>Date</th>
                <th>Sender ➔ Receiver</th>
                <th>Route</th>
                <th>Pieces</th>
                <th>Delivery Status</th>
                <th>Payment Mode</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '30px' }}>Filtering orders...</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No orders found for the selected filter criteria.
                  </td>
                </tr>
              ) : (
                orders.map((o, idx) => (
                  <tr key={o.id}>
                    <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                    <td><strong style={{ color: 'var(--primary-dark)' }}>#{o.lr_number}</strong></td>
                    <td>{new Date(o.booking_date).toLocaleDateString()}</td>
                    <td><strong>{o.sender_name}</strong> ➔ <strong>{o.receiver_name}</strong></td>
                    <td>{o.from_station} ➔ {o.to_station}</td>
                    <td>{o.pieces} Pcs</td>
                    <td>
                      <span className={`badge ${o.delivery_status === 'DELIVERED' ? 'badge-delivered' : 'badge-in-transit'}`}>
                        {o.delivery_status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${o.payment_status === 'PAID' ? 'badge-paid' : 'badge-topay'}`}>
                        {o.payment_mode.replace(/_/g, ' ')} ({o.payment_status.replace(/_/g, ' ')})
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}><strong>₹{Number(o.total_amount).toLocaleString()}</strong></td>
                  </tr>
                ))
              )}
            </tbody>
            {orders.length > 0 && (
              <tfoot>
                <tr style={{ fontWeight: 800, background: '#f8fafc', borderTop: '2px solid #333' }}>
                  <td colSpan={5} style={{ textAlign: 'right', padding: '10px 14px' }}>
                    TOTAL ({orders.length} Orders):
                  </td>
                  <td style={{ padding: '10px 14px' }}>{s.totalPieces} Pcs</td>
                  <td colSpan={2}></td>
                  <td style={{ textAlign: 'right', padding: '10px 14px', color: '#15803d' }}>
                    ₹{Number(s.totalAmount).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Official Signatures (Visible ONLY in print) */}
      <table className="print-signatures" style={{ width: '100%', border: 'none', borderCollapse: 'collapse', marginTop: '60px' }}>
        <tbody>
          <tr>
            <td className="sig-cell" style={{ width: '28%', textAlign: 'center', borderTop: '1.5px solid #000', paddingTop: '8px' }}>
              <strong>STAFF SIGNATURE</strong>
            </td>
            <td style={{ width: '8%', border: 'none' }}></td>
            <td className="sig-cell" style={{ width: '28%', textAlign: 'center', borderTop: '1.5px solid #000', paddingTop: '8px' }}>
              <strong>DRIVER SIGNATURE</strong>
            </td>
            <td style={{ width: '8%', border: 'none' }}></td>
            <td className="sig-cell" style={{ width: '28%', textAlign: 'center', borderTop: '1.5px solid #000', paddingTop: '8px' }}>
              <strong>CHECKED & VERIFIED BY</strong>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default ReportsView;
