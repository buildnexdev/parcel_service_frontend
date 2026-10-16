import React, { useState, useEffect } from 'react';
import { api } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { Filter, Printer, Download, RefreshCw, Calendar, DollarSign, Package } from 'lucide-react';

const ReportsView = () => {
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

  // Print Official Delivery Run Sheet
  const handlePrintRunSheet = () => {
    if (!reportData || !reportData.orders || reportData.orders.length === 0) {
      showToast('Please run the report and ensure there are orders to print on the run sheet.', 'error');
      return;
    }

    const printArea = document.getElementById('printableRunSheetArea');
    if (!printArea) return;

    const s = reportData.summary;
    const orders = reportData.orders;
    const dateStr = singleDate ? new Date(singleDate).toLocaleDateString() : `${startDate} to ${endDate}`;

    const rowsHtml = orders.map((o, idx) => `
      <tr>
        <td style="border: 1px solid #333; padding: 6px; text-align: center;">${idx + 1}</td>
        <td style="border: 1px solid #333; padding: 6px; font-weight: bold;">${o.sender_name}</td>
        <td style="border: 1px solid #333; padding: 6px; font-weight: bold;">${o.receiver_name}</td>
        <td style="border: 1px solid #333; padding: 6px; text-align: center; font-family: monospace; font-weight: bold;">${o.lr_number}</td>
        <td style="border: 1px solid #333; padding: 6px; text-align: center;">${o.pieces}</td>
        <td style="border: 1px solid #333; padding: 6px; text-align: center;">${o.from_station}</td>
        <td style="border: 1px solid #333; padding: 6px; text-align: center;">${o.to_station}</td>
        <td style="border: 1px solid #333; padding: 6px; text-align: center; font-weight: bold;">${o.payment_mode}</td>
        <td style="border: 1px solid #333; padding: 6px; text-align: right; font-weight: bold;">₹${o.total_amount}</td>
        <td style="border: 1px solid #333; padding: 6px; font-size: 0.8rem;">${o.remarks || ''}</td>
      </tr>
    `).join('');

    printArea.innerHTML = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #000; background: #fff; max-width: 900px; margin: 0 auto;">
        <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 12px;">
          <h1 style="font-size: 1.8rem; margin: 0; letter-spacing: 0.05em;">IGR QUICK PARCEL SERVICE</h1>
          <h3 style="font-size: 1.2rem; margin: 2px 0;">ES TRANSPORTERS</h3>
          <p style="margin: 0; font-size: 0.85rem; font-weight: bold;">KARAIKAL - PUDUCHERRY | DELIVERY RUN SHEET</p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; font-size: 0.85rem; margin-bottom: 12px; border: 1px solid #333; padding: 8px;">
          <div><strong>DATE:</strong> ${dateStr}</div>
          <div><strong>TOTAL BILLS:</strong> ${s.totalBills}</div>
          <div><strong>TOTAL PCS:</strong> ${s.totalPieces}</div>
          <div><strong>TOTAL AMOUNT:</strong> ₹${s.totalAmount}</div>
          <div><strong>PAID TOTAL:</strong> ₹${s.totalPaid}</div>
          <div><strong>TO-PAY TOTAL:</strong> ₹${s.totalToPay}</div>
          <div><strong>CREDIT TOTAL:</strong> ₹${s.totalCredit}</div>
          <div><strong>GSTIN:</strong> 34BJCPM0785J1Z3</div>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-bottom: 30px;">
          <thead>
            <tr style="background: #e2e8f0;">
              <th style="border: 1px solid #333; padding: 6px;">SL</th>
              <th style="border: 1px solid #333; padding: 6px;">SENDER</th>
              <th style="border: 1px solid #333; padding: 6px;">RECEIVER</th>
              <th style="border: 1px solid #333; padding: 6px;">LR NO</th>
              <th style="border: 1px solid #333; padding: 6px;">PCS</th>
              <th style="border: 1px solid #333; padding: 6px;">FROM</th>
              <th style="border: 1px solid #333; padding: 6px;">TO</th>
              <th style="border: 1px solid #333; padding: 6px;">MODE</th>
              <th style="border: 1px solid #333; padding: 6px;">AMOUNT</th>
              <th style="border: 1px solid #333; padding: 6px;">REMARKS</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div style="display: flex; justify-content: space-between; margin-top: 50px; font-size: 0.85rem; text-align: center;">
          <div style="width: 200px; border-top: 1px solid #000; padding-top: 6px;"><strong>STAFF SIGNATURE</strong></div>
          <div style="width: 200px; border-top: 1px solid #000; padding-top: 6px;"><strong>DRIVER SIGNATURE</strong></div>
          <div style="width: 200px; border-top: 1px solid #000; padding-top: 6px;"><strong>CHECKED & VERIFIED BY</strong></div>
        </div>
      </div>
    `;

    window.print();
  };

  // Export CSV
  const handleExportCSV = () => {
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

  const s = reportData?.summary || { totalBills: 0, totalPieces: 0, totalAmount: 0, totalPaid: 0, totalToPay: 0, totalCredit: 0 };
  const orders = reportData?.orders || [];

  return (
    <div>
      {/* Filter Card */}
      <div style={{ background: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', padding: '24px', marginBottom: '24px' }}>
        <div className="flex items-center gap-2" style={{ marginBottom: '16px' }}>
          <Filter size={18} color="var(--primary)" />
          <h3 style={{ fontSize: '1.15rem', color: 'var(--primary-dark)' }}>Daily Reports & Multi-Filters</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '18px' }}>
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
              <span>Print Delivery Run Sheet</span>
            </button>
            <button className="btn btn-outline" onClick={handleExportCSV}>
              <Download size={16} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Summary Badges */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
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

      {/* Filtered Report Table */}
      <div className="table-card">
        <div className="table-header">
          <h3 style={{ fontSize: '1.15rem', color: 'var(--primary-dark)' }}>Report Order Details</h3>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>SL</th>
                <th>LR No</th>
                <th>Date</th>
                <th>Sender ➔ Receiver</th>
                <th>Route</th>
                <th>Pieces</th>
                <th>Delivery Status</th>
                <th>Payment Mode</th>
                <th>Amount</th>
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
                    <td>{idx + 1}</td>
                    <td><strong style={{ color: 'var(--primary-dark)' }}>#{o.lr_number}</strong></td>
                    <td>{new Date(o.booking_date).toLocaleDateString()}</td>
                    <td><strong>{o.sender_name}</strong> ➔ <strong>{o.receiver_name}</strong></td>
                    <td>{o.from_station} ➔ {o.to_station}</td>
                    <td>{o.pieces} Pcs</td>
                    <td>
                      <span className={`badge ${o.delivery_status === 'DELIVERED' ? 'badge-delivered' : 'badge-in-transit'}`}>
                        {o.delivery_status}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${o.payment_status === 'PAID' ? 'badge-paid' : 'badge-topay'}`}>
                        {o.payment_mode} ({o.payment_status})
                      </span>
                    </td>
                    <td><strong>₹{Number(o.total_amount).toLocaleString()}</strong></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hidden Print Container for Official Delivery Run Sheet */}
      <div id="printableRunSheetArea" className="print-only"></div>
    </div>
  );
};

export default ReportsView;
