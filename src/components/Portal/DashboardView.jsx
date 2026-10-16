import React, { useState, useEffect } from 'react';
import { api } from '../../api/api';
import { Package, Truck, CheckCircle2, Clock, DollarSign, Users, ArrowRight } from 'lucide-react';

const DashboardView = ({ onNavigate }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      const res = await api.getDashboardSummary();
      if (res.success) {
        setStats(res);
      }
    } catch (err) {
      console.error('Failed to load dashboard summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      'BOOKED': 'badge-booked',
      'IN_TRANSIT': 'badge-in-transit',
      'OUT_FOR_DELIVERY': 'badge-out-for-delivery',
      'DELIVERED': 'badge-delivered',
      'CANCELLED': 'badge-cancelled'
    };
    return <span className={`badge ${map[status] || 'badge-booked'}`}>{status.replace(/_/g, ' ')}</span>;
  };

  const getPaymentBadge = (mode, status) => {
    const isPaid = status === 'PAID';
    return (
      <span className={`badge ${isPaid ? 'badge-paid' : (mode === 'CREDIT' ? 'badge-credit' : 'badge-topay')}`}>
        {mode} ({status})
      </span>
    );
  };

  if (loading) {
    return <div style={{ padding: '30px', textAlign: 'center' }}>Loading dashboard analytics...</div>;
  }

  const today = stats?.today || {};
  const allTime = stats?.allTime || {};
  const drivers = stats?.drivers || {};
  const recentOrders = stats?.recentOrders || [];

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-info">
            <h4>Today's Bookings</h4>
            <div className="stat-val">{today.today_orders_count || 0}</div>
          </div>
          <div className="stat-card-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <Package size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-info">
            <h4>Active In-Transit</h4>
            <div className="stat-val">{allTime.active_in_transit || 0}</div>
          </div>
          <div className="stat-card-icon" style={{ background: '#fffbeb', color: '#d97706' }}>
            <Truck size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-info">
            <h4>Delivered Today</h4>
            <div className="stat-val">{today.today_delivered || 0}</div>
          </div>
          <div className="stat-card-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-info">
            <h4>Total Revenue</h4>
            <div className="stat-val">₹{Number(allTime.total_revenue || 0).toLocaleString()}</div>
          </div>
          <div className="stat-card-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
            <DollarSign size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-info">
            <h4>Pending To-Pay</h4>
            <div className="stat-val" style={{ color: '#ea580c' }}>
              ₹{Number(allTime.total_pending_topay || 0).toLocaleString()}
            </div>
          </div>
          <div className="stat-card-icon" style={{ background: '#fff7ed', color: '#ea580c' }}>
            <Clock size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-info">
            <h4>Active Drivers</h4>
            <div className="stat-val">{drivers.on_duty_drivers || 0} / {drivers.total_drivers || 0}</div>
          </div>
          <div className="stat-card-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
            <Users size={22} />
          </div>
        </div>
      </div>

      {/* Quick Action Shortcuts */}
      <div style={{ display: 'flex', gap: '14px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button className="btn btn-accent" onClick={() => onNavigate('orders', { openNewModal: true })}>
          ➕ Add New Order
        </button>
        <button className="btn btn-outline" onClick={() => onNavigate('drivers', { openAddModal: true })}>
          🚚 Add Assigned Driver
        </button>
        <button className="btn btn-outline" onClick={() => onNavigate('reports')}>
          📊 View Daily Reports
        </button>
      </div>

      {/* Recent Orders Table */}
      <div className="table-card">
        <div className="table-header">
          <div>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--primary-dark)' }}>Recent Orders</h3>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>Latest registered orders across branches</p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => onNavigate('orders')}>
            View All Orders <ArrowRight size={14} />
          </button>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>LR No</th>
                <th>Booking Date</th>
                <th>Sender ➔ Receiver</th>
                <th>Route</th>
                <th>Status</th>
                <th>Payment Mode</th>
                <th>Freight Total</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No orders found in the database. Click "Add New Order" above to add your first live order!
                  </td>
                </tr>
              ) : (
                recentOrders.map(o => (
                  <tr key={o.id}>
                    <td><strong style={{ color: 'var(--primary-dark)' }}>#{o.lr_number}</strong></td>
                    <td>{new Date(o.booking_date).toLocaleDateString()}</td>
                    <td><strong>{o.sender_name}</strong> ➔ <strong>{o.receiver_name}</strong></td>
                    <td>{o.from_station} ➔ {o.to_station}</td>
                    <td>{getStatusBadge(o.delivery_status)}</td>
                    <td>{getPaymentBadge(o.payment_mode, o.payment_status)}</td>
                    <td><strong>₹{Number(o.total_amount).toLocaleString()}</strong></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
