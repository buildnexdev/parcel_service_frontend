import React, { useState, useEffect } from 'react';
import { api } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import SuccessModal from '../Common/SuccessModal';
import { 
  Package, Search, Plus, CreditCard, Eye, Printer, 
  CheckCircle2, Clock, Truck, X, PlusCircle, AlertCircle, Phone, Edit, Trash2
} from 'lucide-react';

const OrdersView = ({ defaultOpenNew = false }) => {
  const { showToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');

  // Modals
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(defaultOpenNew);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isTrackingDrawerOpen, setIsTrackingDrawerOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [trackingHistory, setTrackingHistory] = useState([]);
  const [successModalData, setSuccessModalData] = useState(null);

  // Status Change Dialog State (replaces prompt/window.confirm)
  const [statusChangeDialog, setStatusChangeDialog] = useState(null);
  const [statusNote, setStatusNote] = useState('');
  const [markPaymentPaid, setMarkPaymentPaid] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Custom checkpoint inline state inside tracking drawer
  const [isAddingCheckpoint, setIsAddingCheckpoint] = useState(false);
  const [cpLocation, setCpLocation] = useState('');
  const [cpNote, setCpNote] = useState('');

  // New Order Form
  const [orderForm, setOrderForm] = useState({
    lr_number: '',
    booking_date: new Date().toISOString().split('T')[0],
    sender_name: '',
    sender_phone: '',
    receiver_name: '',
    receiver_phone: '',
    from_station: 'Pondicherry',
    to_station: 'Karaikal',
    pieces: 1,
    weight_kg: 0,
    description: 'Textiles / Goods',
    payment_mode: 'TO_PAY',
    payment_status: 'UNPAID',
    payment_method: 'CASH',
    freight_amount: 100,
    other_charges: 0,
    driver_id: '',
    remarks: ''
  });

  // Payment Update Form (In-place)
  const [paymentForm, setPaymentForm] = useState({
    payment_status: 'PAID',
    payment_mode: 'TO_PAY',
    payment_method: 'CASH',
    amount_paid: 0,
    remarks: ''
  });

  // Edit Order Modal State
  const [isEditOrderOpen, setIsEditOrderOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [editForm, setEditForm] = useState({
    lr_number: '',
    booking_date: '',
    sender_name: '',
    sender_phone: '',
    sender_address: '',
    receiver_name: '',
    receiver_phone: '',
    receiver_address: '',
    from_station: 'Karaikal',
    to_station: 'Pondicherry',
    pieces: 1,
    weight_kg: 0,
    description: 'Goods',
    payment_mode: 'TO_PAY',
    payment_status: 'UNPAID',
    payment_method: 'CASH',
    freight_amount: 100,
    other_charges: 0,
    delivery_status: 'BOOKED',
    driver_id: '',
    remarks: ''
  });

  useEffect(() => {
    loadMetadata();
    loadOrders();
  }, []);

  const loadMetadata = async () => {
    try {
      const [dRes, bRes] = await Promise.all([
        api.getDrivers(),
        api.getBranches()
      ]);
      if (dRes.success) setDrivers(dRes.drivers || []);
      if (bRes.success) setBranches(bRes.branches || []);
    } catch (err) {
      console.error('Failed to load drivers/branches metadata:', err);
    }
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await api.getOrders({
        search,
        delivery_status: statusFilter,
        payment_status: paymentFilter,
        limit: 150
      });
      if (res.success && res.orders) {
        setOrders(res.orders);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      loadOrders();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter, paymentFilter]);

  // Open In-Place Payment Modal
  const handleOpenPayment = (order) => {
    setSelectedOrder(order);
    setPaymentForm({
      payment_status: order.payment_status === 'PAID' ? 'PAID' : 'PAID',
      payment_mode: order.payment_mode,
      payment_method: order.payment_method || 'CASH',
      amount_paid: order.payment_status === 'PAID' ? order.total_amount : order.total_amount,
      remarks: order.remarks || 'Payment collected'
    });
    setIsPaymentModalOpen(true);
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;

    try {
      const res = await api.updatePayment(selectedOrder.id, paymentForm);
      showToast(res.message || 'Payment updated successfully!', 'success');
      setIsPaymentModalOpen(false);
      loadOrders();
      setSuccessModalData({
        title: 'Payment Status Updated!',
        message: `Payment update confirmed for LR #${selectedOrder.lr_number}.`,
        details: {
          'LR Number': `#${selectedOrder.lr_number}`,
          'Payment Status': paymentForm.payment_status,
          'Payment Mode': paymentForm.payment_mode,
          'Amount Paid': `₹${paymentForm.amount_paid}`,
          'Payment Method': paymentForm.payment_method || 'CASH'
        }
      });
    } catch (err) {
      showToast(err.message || 'Failed to update payment', 'error');
    }
  };

  // Quick Status Update Modal Trigger
  const handleTriggerStatusChange = (order, newStatus) => {
    if (!newStatus) return;
    setStatusChangeDialog({ order, newStatus });
    setStatusNote(`Order marked as ${newStatus}`);
    setMarkPaymentPaid(order.payment_mode === 'TO_PAY');
  };

  const handleConfirmStatusChange = async (e) => {
    e.preventDefault();
    if (!statusChangeDialog) return;
    const { order, newStatus } = statusChangeDialog;

    setStatusUpdating(true);
    try {
      const res = await api.updateDeliveryStatus(order.id, {
        delivery_status: newStatus,
        location: newStatus === 'DELIVERED' ? order.to_station : order.from_station,
        note: statusNote,
        mark_payment_paid: newStatus === 'DELIVERED' && markPaymentPaid
      });
      showToast(res.message || `Status updated to ${newStatus}!`, 'success');
      setStatusChangeDialog(null);
      loadOrders();
      setSuccessModalData({
        title: `Order Status Updated: ${newStatus}`,
        message: `Delivery status for LR #${order.lr_number} has been updated.`,
        details: {
          'LR Number': `#${order.lr_number}`,
          'New Status': newStatus,
          'Route': `${order.from_station} ➔ ${order.to_station}`,
          'Checkpoint Note': statusNote || 'Status logged'
        }
      });
    } catch (err) {
      showToast(err.message || 'Failed to update delivery status', 'error');
    } finally {
      setStatusUpdating(false);
    }
  };

  // Open Tracking Drawer
  const handleOpenTracking = async (order) => {
    setSelectedOrder(order);
    setIsAddingCheckpoint(false);
    setCpLocation(order.to_station);
    setCpNote('');
    try {
      const res = await api.getOrderById(order.id);
      if (res.success) {
        setTrackingHistory(res.tracking_history || []);
        setIsTrackingDrawerOpen(true);
      }
    } catch (err) {
      showToast(err.message || 'Failed to retrieve tracking details', 'error');
    }
  };

  const handleSaveCheckpoint = async (e) => {
    e.preventDefault();
    if (!selectedOrder || !cpLocation) return;

    try {
      await api.addCheckpoint(selectedOrder.id, {
        status: selectedOrder.delivery_status,
        location: cpLocation,
        note: cpNote || 'Transit checkpoint recorded'
      });
      showToast('Checkpoint note added!', 'success');
      setIsAddingCheckpoint(false);
      setCpNote('');
      const res = await api.getOrderById(selectedOrder.id);
      if (res.success) setTrackingHistory(res.tracking_history || []);
    } catch (err) {
      showToast(err.message || 'Failed to add checkpoint', 'error');
    }
  };

  // Create Order
  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (orderForm.sender_phone && !/^\d{10}$/.test(orderForm.sender_phone)) {
      showToast('Sender phone number must be exactly 10 digits.', 'error');
      return;
    }
    if (orderForm.receiver_phone && !/^\d{10}$/.test(orderForm.receiver_phone)) {
      showToast('Receiver phone number must be exactly 10 digits.', 'error');
      return;
    }
    try {
      const res = await api.createOrder({
        ...orderForm,
        freight_amount: parseFloat(orderForm.freight_amount) || 0,
        other_charges: parseFloat(orderForm.other_charges) || 0,
        pieces: parseInt(orderForm.pieces, 10) || 1,
        weight_kg: parseFloat(orderForm.weight_kg) || 0,
        driver_id: orderForm.driver_id ? parseInt(orderForm.driver_id, 10) : null
      });
      showToast(res.message || 'Order created successfully!', 'success');
      setIsNewOrderOpen(false);
      loadOrders();

      const created = res.order;
      if (created) {
        setSuccessModalData({
          title: 'Order Booked Successfully!',
          message: `LR #${created.lr_number} has been generated and booked into the system.`,
          details: {
            'LR Number': `#${created.lr_number}`,
            'Route': `${created.from_station} ➔ ${created.to_station}`,
            'Sender': `${created.sender_name} (${created.sender_phone || 'N/A'})`,
            'Receiver': `${created.receiver_name} (${created.receiver_phone || 'N/A'})`,
            'Packages': `${created.pieces} Pcs / ${created.weight_kg} Kg`,
            'Total Freight': `₹${Number(created.total_amount).toLocaleString()} [${created.payment_mode} - ${created.payment_status}]`
          },
          orderToPrint: created
        });
      }
    } catch (err) {
      showToast(err.message || 'Failed to create order', 'error');
    }
  };

  // Open Edit Order Modal
  const handleOpenEditOrder = (order) => {
    setEditingOrderId(order.id);
    setEditForm({
      lr_number: order.lr_number || '',
      booking_date: order.booking_date ? new Date(order.booking_date).toISOString().split('T')[0] : '',
      sender_name: order.sender_name || '',
      sender_phone: order.sender_phone || '',
      sender_address: order.sender_address || '',
      receiver_name: order.receiver_name || '',
      receiver_phone: order.receiver_phone || '',
      receiver_address: order.receiver_address || '',
      from_station: order.from_station || 'Karaikal',
      to_station: order.to_station || 'Pondicherry',
      pieces: order.pieces || 1,
      weight_kg: order.weight_kg || 0,
      description: order.description || 'Goods',
      payment_mode: order.payment_mode || 'TO_PAY',
      payment_status: order.payment_status || 'UNPAID',
      payment_method: order.payment_method || 'CASH',
      freight_amount: order.freight_amount !== undefined ? order.freight_amount : 0,
      other_charges: order.other_charges !== undefined ? order.other_charges : 0,
      delivery_status: order.delivery_status || 'BOOKED',
      driver_id: order.driver_id || '',
      remarks: order.remarks || ''
    });
    setIsEditOrderOpen(true);
  };

  // Save Edited Order
  const handleUpdateOrder = async (e) => {
    e.preventDefault();
    if (!editingOrderId) return;
    if (editForm.sender_phone && !/^\d{10}$/.test(editForm.sender_phone)) {
      showToast('Sender phone number must be exactly 10 digits.', 'error');
      return;
    }
    if (editForm.receiver_phone && !/^\d{10}$/.test(editForm.receiver_phone)) {
      showToast('Receiver phone number must be exactly 10 digits.', 'error');
      return;
    }

    try {
      const res = await api.updateOrder(editingOrderId, {
        ...editForm,
        freight_amount: parseFloat(editForm.freight_amount) || 0,
        other_charges: parseFloat(editForm.other_charges) || 0,
        pieces: parseInt(editForm.pieces, 10) || 1,
        weight_kg: parseFloat(editForm.weight_kg) || 0,
        driver_id: editForm.driver_id ? parseInt(editForm.driver_id, 10) : null
      });
      showToast(res.message || 'Order updated successfully!', 'success');
      setIsEditOrderOpen(false);
      setEditingOrderId(null);
      loadOrders();
    } catch (err) {
      showToast(err.message || 'Failed to update order', 'error');
    }
  };

  // Delete Order with Confirmation
  const handleDeleteOrder = async (orderId, lrNumber) => {
    if (window.confirm(`Are you sure you want to permanently delete order LR #${lrNumber}? This cannot be undone.`)) {
      try {
        await api.deleteOrder(orderId);
        showToast(`Order #${lrNumber} deleted successfully.`, 'success');
        setIsEditOrderOpen(false);
        setEditingOrderId(null);
        loadOrders();
      } catch (err) {
        showToast(err.message || 'Failed to delete order', 'error');
      }
    }
  };

  // Print Order LR
  const handlePrintLR = (order) => {
    const printArea = document.getElementById('printableOrderArea');
    if (!printArea) return;

    printArea.innerHTML = `
      <div style="padding: 24px; font-family: sans-serif; border: 2px dashed #b91c1c; background: #fff5f5; border-radius: 8px; max-width: 780px; margin: 0 auto; color: #1e293b;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #b91c1c; padding-bottom: 12px; margin-bottom: 12px;">
          <div>
            <h2 style="font-size: 1.6rem; color: #991b1b; margin: 0;">IGR QUICK PARCEL SERVICE</h2>
            <h4 style="font-size: 1.1rem; color: #1e293b; margin: 2px 0;">(ES TRANSPORTERS)</h4>
            <div style="font-size: 0.8rem; color: #475569;">
              <strong>Head Office:</strong> 32, Church Street, Karaikal - 609 602<br>
              <strong>Branch Office:</strong> No. 9, Throwpathi Amman Kovil St, Arumathapuram, Puducherry - 605 110<br>
              <strong>Phone:</strong> 94424 85296 / 93604 27527 / 96555 66060
            </div>
          </div>
          <div style="text-align: right;">
            <div style="background: #991b1b; color: #fff; padding: 4px 12px; font-weight: bold; font-size: 0.9rem; border-radius: 4px;">WAY BILL / LR</div>
            <div style="font-size: 1.5rem; font-weight: 800; color: #991b1b; margin-top: 4px;">#${order.lr_number}</div>
            <div style="font-size: 0.85rem;"><strong>Date:</strong> ${new Date(order.booking_date).toLocaleDateString()}</div>
            <div style="font-size: 0.8rem; color: #047857; font-weight: bold; margin-top: 2px;">GSTIN: 34BJCPM0785J1Z3</div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 14px; font-size: 0.9rem;">
          <div style="border: 1px solid #f87171; padding: 10px; border-radius: 4px; background: #fff;">
            <strong style="color: #991b1b;">SENDER (FROM):</strong>
            <div style="font-size: 1.05rem; font-weight: bold;">${order.sender_name}</div>
            <div>Phone: ${order.sender_phone || 'N/A'}</div>
            <div>Booking Station: <strong>${order.from_station}</strong></div>
          </div>
          <div style="border: 1px solid #f87171; padding: 10px; border-radius: 4px; background: #fff;">
            <strong style="color: #991b1b;">RECEIVER (TO):</strong>
            <div style="font-size: 1.05rem; font-weight: bold;">${order.receiver_name}</div>
            <div>Phone: ${order.receiver_phone || 'N/A'}</div>
            <div>Delivery Station: <strong>${order.to_station}</strong></div>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 0.9rem;">
          <thead>
            <tr style="background: #fee2e2; border-bottom: 2px solid #b91c1c;">
              <th style="padding: 8px; text-align: left;">Description of Goods</th>
              <th style="padding: 8px; text-align: center;">Pieces</th>
              <th style="padding: 8px; text-align: center;">Weight</th>
              <th style="padding: 8px; text-align: center;">Payment Mode</th>
              <th style="padding: 8px; text-align: right;">Total Freight</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #fca5a5;">${order.description || 'General Goods'}</td>
              <td style="padding: 10px; border-bottom: 1px solid #fca5a5; text-align: center;">${order.pieces} Pcs</td>
              <td style="padding: 10px; border-bottom: 1px solid #fca5a5; text-align: center;">${order.weight_kg} Kg</td>
              <td style="padding: 10px; border-bottom: 1px solid #fca5a5; text-align: center; font-weight: bold; color: #991b1b;">
                ${order.payment_mode} (${order.payment_status})
              </td>
              <td style="padding: 10px; border-bottom: 1px solid #fca5a5; text-align: right; font-weight: bold; font-size: 1.1rem;">
                ₹${Number(order.total_amount).toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>

        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 30px; font-size: 0.85rem;">
          <div style="border-top: 1px solid #475569; padding-top: 4px; width: 180px; text-align: center;">Booking Clerk Signature</div>
          <div style="border-top: 1px solid #475569; padding-top: 4px; width: 180px; text-align: center;">Driver Signature</div>
          <div style="border-top: 1px solid #475569; padding-top: 4px; width: 180px; text-align: center;">Receiver Signature & Seal</div>
        </div>
      </div>
    `;

    window.print();
  };

  const getStatusBadge = (status) => {
    const map = {
      'BOOKED': 'badge-booked',
      'IN_TRANSIT': 'badge-in-transit',
      'OUT_FOR_DELIVERY': 'badge-out-for-delivery',
      'DELIVERED': 'badge-delivered',
      'CANCELLED': 'badge-cancelled'
    };
    return (
      <span className={`badge ${map[status] || 'badge-booked'}`}>
        <span className="badge-dot"></span>
        <span>{status.replace(/_/g, ' ')}</span>
      </span>
    );
  };

  const getPaymentBadge = (mode, status) => {
    const isPaid = status === 'PAID';
    return (
      <span className={`badge ${isPaid ? 'badge-paid' : (mode === 'CREDIT' ? 'badge-credit' : 'badge-topay')}`}>
        <span className="badge-dot"></span>
        <span>{mode} • {status}</span>
      </span>
    );
  };

  const calculatedTotal = (parseFloat(orderForm.freight_amount) || 0) + (parseFloat(orderForm.other_charges) || 0);

  return (
    <div>
      <div className="table-card">
        {/* Controls Header */}
        <div className="table-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px', maxWidth: '420px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '36px' }}
              placeholder="Search by LR No, Sender, Receiver, Phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <select
              className="form-control"
              style={{ width: 'auto', minWidth: '160px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Delivery Statuses</option>
              <option value="BOOKED">Booked</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <select
              className="form-control"
              style={{ width: 'auto', minWidth: '140px' }}
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
            >
              <option value="ALL">All Payments</option>
              <option value="PAID">PAID</option>
              <option value="UNPAID">UNPAID (To-Pay / Pending)</option>
            </select>

            <button className="btn btn-accent" onClick={() => setIsNewOrderOpen(true)}>
              <Plus size={18} />
              <span>Add Order</span>
            </button>
          </div>
        </div>

        {/* Orders Table */}
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '130px' }}>LR & Date</th>
                <th>Sender (From)</th>
                <th>Receiver (To)</th>
                <th>Route & Cargo</th>
                <th>Delivery Status</th>
                <th>Freight & Payment</th>
                <th>Driver & Vehicle</th>
                <th style={{ textAlign: 'center', minWidth: '170px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No orders found. Click "Add Order" above to create an order.
                  </td>
                </tr>
              ) : (
                orders.map(o => (
                  <tr key={o.id}>
                    <td>
                      <div style={{ display: 'inline-flex', flexDirection: 'column' }}>
                        <span style={{ 
                          fontFamily: 'monospace', 
                          fontWeight: 800, 
                          color: '#1d4ed8', 
                          background: '#eff6ff', 
                          padding: '3px 8px', 
                          borderRadius: '6px', 
                          fontSize: '0.925rem',
                          border: '1px solid #bfdbfe',
                          display: 'inline-block',
                          width: 'fit-content'
                        }}>
                          #{o.lr_number}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                          {new Date(o.booking_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.925rem' }}>{o.sender_name}</div>
                      <div style={{ fontSize: '0.785rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                        <Phone size={12} style={{ opacity: 0.7 }} />
                        <span>{o.sender_phone || 'No phone'}</span>
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.925rem' }}>{o.receiver_name}</div>
                      <div style={{ fontSize: '0.785rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                        <Phone size={12} style={{ opacity: 0.7 }} />
                        <span>{o.receiver_phone || 'No phone'}</span>
                      </div>
                    </td>

                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '3px 9px', borderRadius: '6px', fontWeight: 600, fontSize: '0.825rem', color: '#1e293b' }}>
                        <span>{o.from_station}</span>
                        <span style={{ color: '#2563eb', fontWeight: 800 }}>➔</span>
                        <span>{o.to_station}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                        📦 {o.pieces} Pcs {o.weight_kg > 0 ? `• ${o.weight_kg} kg` : ''}
                      </div>
                    </td>

                    <td>{getStatusBadge(o.delivery_status)}</td>

                    <td>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                        ₹{Number(o.total_amount).toLocaleString()}
                      </div>
                      <div style={{ marginTop: '4px' }}>
                        {getPaymentBadge(o.payment_mode, o.payment_status)}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Truck size={14} style={{ color: '#2563eb' }} />
                        <span>{o.driver_name || 'Unassigned'}</span>
                      </div>
                      {o.driver_vehicle ? (
                        <div style={{ 
                          fontFamily: 'monospace', 
                          fontSize: '0.75rem', 
                          fontWeight: 700, 
                          background: '#ffffff', 
                          border: '1.5px solid #cbd5e1', 
                          borderRadius: '4px', 
                          padding: '1px 6px', 
                          display: 'inline-block',
                          marginTop: '4px',
                          color: '#1e293b'
                        }}>
                          {o.driver_vehicle}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.725rem', color: '#94a3b8' }}>No vehicle assigned</span>
                      )}
                    </td>

                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '160px' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          {/* IN-PLACE PAYMENT UPDATE BUTTON */}
                          <button
                            className="btn btn-sm"
                            onClick={() => handleOpenPayment(o)}
                            title="Update payment in-place"
                            style={{ 
                              background: o.payment_status === 'PAID' ? '#ecfdf5' : '#eff6ff',
                              color: o.payment_status === 'PAID' ? '#047857' : '#1d4ed8',
                              border: o.payment_status === 'PAID' ? '1px solid #a7f3d0' : '1px solid #bfdbfe',
                              padding: '5px 10px',
                              fontSize: '0.785rem',
                              gap: '4px',
                              flex: 1
                            }}
                          >
                            <CreditCard size={13} />
                            <span>{o.payment_status === 'PAID' ? 'Paid ✓' : 'Pay ₹'}</span>
                          </button>

                          {/* Status change dropdown */}
                          <select
                            className="form-control"
                            style={{ 
                              width: 'auto', 
                              padding: '4px 6px', 
                              fontSize: '0.785rem',
                              height: '29px',
                              borderRadius: '6px',
                              background: '#f8fafc',
                              border: '1px solid #cbd5e1'
                            }}
                            value=""
                            onChange={(e) => handleTriggerStatusChange(o, e.target.value)}
                          >
                            <option value="" disabled>Status...</option>
                            <option value="BOOKED">Booked</option>
                            <option value="IN_TRANSIT">In Transit</option>
                            <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                            <option value="DELIVERED">Delivered</option>
                            <option value="CANCELLED">Cancelled</option>
                          </select>
                        </div>

                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          {/* EDIT ORDER BUTTON */}
                          <button
                            className="btn btn-outline btn-xs"
                            onClick={() => handleOpenEditOrder(o)}
                            title="Edit Order Details"
                            style={{ flex: 1, padding: '4px 6px', fontSize: '0.75rem', gap: '3px', color: '#0284c7', borderColor: '#bae6fd', background: '#f0f9ff' }}
                          >
                            <Edit size={12} />
                            <span>Edit</span>
                          </button>

                          {/* Tracking Timeline Drawer */}
                          <button
                            className="btn btn-outline btn-xs"
                            onClick={() => handleOpenTracking(o)}
                            title="View tracking history"
                            style={{ flex: 1, padding: '4px 6px', fontSize: '0.75rem', gap: '3px' }}
                          >
                            <Eye size={12} />
                            <span>Track</span>
                          </button>

                          {/* Print LR */}
                          <button
                            className="btn btn-outline btn-xs"
                            onClick={() => handlePrintLR(o)}
                            title="Print Waybill / LR"
                            style={{ flex: 1, padding: '4px 6px', fontSize: '0.75rem', gap: '3px' }}
                          >
                            <Printer size={12} />
                            <span>Print</span>
                          </button>
                        </div>
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
      {/* IN-PLACE PAYMENT UPDATE MODAL */}
      {/* ============================================================= */}
      {isPaymentModalOpen && selectedOrder && (
        <div className="modal-overlay" onClick={() => setIsPaymentModalOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Update Payment (LR #{selectedOrder.lr_number})</h3>
              <button className="modal-close" onClick={() => setIsPaymentModalOpen(false)}>
                <X size={22} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '14px', marginBottom: '18px', fontSize: '0.9rem' }}>
                <div><strong>Sender:</strong> {selectedOrder.sender_name}</div>
                <div><strong>Receiver:</strong> {selectedOrder.receiver_name}</div>
                <div><strong>Total Freight:</strong> ₹{Number(selectedOrder.total_amount).toLocaleString()}</div>
              </div>

              <form onSubmit={handleSavePayment}>
                <div className="form-group">
                  <label className="form-label">Payment Status *</label>
                  <select
                    className="form-control"
                    value={paymentForm.payment_status}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_status: e.target.value })}
                  >
                    <option value="PAID">PAID</option>
                    <option value="UNPAID">UNPAID (Pending)</option>
                    <option value="PARTIALLY_PAID">PARTIALLY PAID</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Payment Mode</label>
                    <select
                      className="form-control"
                      value={paymentForm.payment_mode}
                      onChange={(e) => setPaymentForm({ ...paymentForm, payment_mode: e.target.value })}
                    >
                      <option value="TO_PAY">TO PAY</option>
                      <option value="PAID">PAID</option>
                      <option value="CREDIT">CREDIT</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Payment Method</label>
                    <select
                      className="form-control"
                      value={paymentForm.payment_method}
                      onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                    >
                      <option value="CASH">CASH</option>
                      <option value="UPI">UPI / GPay / PhonePe</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="CREDIT">Credit</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Amount Collected (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    value={paymentForm.amount_paid}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount_paid: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Payment Notes / Remarks</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Paid in cash on delivery"
                    value={paymentForm.remarks}
                    onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                  />
                </div>

                <div className="flex justify-between items-center" style={{ marginTop: '20px' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setIsPaymentModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-accent">
                    Save Payment Update
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* IN-UI STATUS CHANGE MODAL (Replaces browser prompt/confirm) */}
      {/* ============================================================= */}
      {statusChangeDialog && (
        <div className="modal-overlay" onClick={() => setStatusChangeDialog(null)}>
          <div className="modal-box" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Update Status: {statusChangeDialog.newStatus}</h3>
              <button className="modal-close" onClick={() => setStatusChangeDialog(null)}>
                <X size={22} />
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleConfirmStatusChange}>
                <div style={{ marginBottom: 16 }}>
                  <div><strong>LR Number:</strong> #{statusChangeDialog.order.lr_number}</div>
                  <div><strong>Route:</strong> {statusChangeDialog.order.from_station} ➔ {statusChangeDialog.order.to_station}</div>
                </div>

                <div className="form-group">
                  <label className="form-label">Transit Note / Checkpoint Description</label>
                  <input
                    type="text"
                    className="form-control"
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    required
                  />
                </div>

                {statusChangeDialog.newStatus === 'DELIVERED' && statusChangeDialog.order.payment_mode === 'TO_PAY' && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '12px', borderRadius: '8px', marginBottom: 18 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={markPaymentPaid}
                        onChange={(e) => setMarkPaymentPaid(e.target.checked)}
                      />
                      <span>Mark TO-PAY as collected / PAID (₹{statusChangeDialog.order.total_amount})</span>
                    </label>
                  </div>
                )}

                <div className="flex justify-between items-center" style={{ marginTop: 20 }}>
                  <button type="button" className="btn btn-outline" onClick={() => setStatusChangeDialog(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-accent" disabled={statusUpdating}>
                    {statusUpdating ? 'Updating...' : `Confirm ${statusChangeDialog.newStatus}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* BOOK NEW ORDER MODAL */}
      {/* ============================================================= */}
      {isNewOrderOpen && (
        <div className="modal-overlay" onClick={() => setIsNewOrderOpen(false)}>
          <div className="modal-box" style={{ maxWidth: 680 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Order (LR / Bill)</h3>
              <button className="modal-close" onClick={() => setIsNewOrderOpen(false)}>
                <X size={22} />
              </button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleCreateOrder}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">LR / Waybill Number *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 18002"
                      value={orderForm.lr_number}
                      onChange={(e) => setOrderForm({ ...orderForm, lr_number: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Booking Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={orderForm.booking_date}
                      onChange={(e) => setOrderForm({ ...orderForm, booking_date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Sender Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. PRIME TEXTILES"
                      value={orderForm.sender_name}
                      onChange={(e) => setOrderForm({ ...orderForm, sender_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Sender Phone (10 Digits)</label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="e.g. 9840123456"
                      value={orderForm.sender_phone}
                      maxLength={10}
                      onChange={(e) => setOrderForm({ ...orderForm, sender_phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Receiver Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. KRISHNA SILKS"
                      value={orderForm.receiver_name}
                      onChange={(e) => setOrderForm({ ...orderForm, receiver_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Receiver Phone (10 Digits)</label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="e.g. 9443187211"
                      value={orderForm.receiver_phone}
                      maxLength={10}
                      onChange={(e) => setOrderForm({ ...orderForm, receiver_phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">From Station *</label>
                    <select
                      className="form-control"
                      value={orderForm.from_station}
                      onChange={(e) => setOrderForm({ ...orderForm, from_station: e.target.value })}
                    >
                      {branches.map(b => <option key={b.id} value={b.name}>{b.name} ({b.code})</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">To Station *</label>
                    <select
                      className="form-control"
                      value={orderForm.to_station}
                      onChange={(e) => setOrderForm({ ...orderForm, to_station: e.target.value })}
                    >
                      {branches.map(b => <option key={b.id} value={b.name}>{b.name} ({b.code})</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Pieces (PCS)</label>
                    <input
                      type="number"
                      min="1"
                      className="form-control"
                      value={orderForm.pieces}
                      onChange={(e) => setOrderForm({ ...orderForm, pieces: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Weight (KG)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-control"
                      value={orderForm.weight_kg}
                      onChange={(e) => setOrderForm({ ...orderForm, weight_kg: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description of Goods</label>
                    <input
                      type="text"
                      className="form-control"
                      value={orderForm.description}
                      onChange={(e) => setOrderForm({ ...orderForm, description: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Payment Mode</label>
                    <select
                      className="form-control"
                      value={orderForm.payment_mode}
                      onChange={(e) => setOrderForm({ ...orderForm, payment_mode: e.target.value })}
                    >
                      <option value="TO_PAY">TO PAY (Collect on delivery)</option>
                      <option value="PAID">PAID (Prepaid)</option>
                      <option value="CREDIT">CREDIT</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Status</label>
                    <select
                      className="form-control"
                      value={orderForm.payment_status}
                      onChange={(e) => setOrderForm({ ...orderForm, payment_status: e.target.value })}
                    >
                      <option value="UNPAID">UNPAID</option>
                      <option value="PAID">PAID</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Method</label>
                    <select
                      className="form-control"
                      value={orderForm.payment_method}
                      onChange={(e) => setOrderForm({ ...orderForm, payment_method: e.target.value })}
                    >
                      <option value="CASH">CASH</option>
                      <option value="UPI">UPI / GPay</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="CREDIT">Credit</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Freight Amount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      value={orderForm.freight_amount}
                      onChange={(e) => setOrderForm({ ...orderForm, freight_amount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Other Charges (₹)</label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      value={orderForm.other_charges}
                      onChange={(e) => setOrderForm({ ...orderForm, other_charges: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Total Freight</label>
                    <input
                      type="text"
                      className="form-control"
                      value={`₹${calculatedTotal.toFixed(2)}`}
                      disabled
                      style={{ fontWeight: 'bold', background: '#f8fafc' }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Assign Driver / Vehicle</label>
                  <select
                    className="form-control"
                    value={orderForm.driver_id}
                    onChange={(e) => setOrderForm({ ...orderForm, driver_id: e.target.value })}
                  >
                    <option value="">-- Select Assigned Driver --</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.vehicle_no})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Remarks</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Urgent textile delivery / Handle with care"
                    value={orderForm.remarks}
                    onChange={(e) => setOrderForm({ ...orderForm, remarks: e.target.value })}
                  />
                </div>

                <div className="flex justify-between items-center" style={{ marginTop: '24px' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setIsNewOrderOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-accent">
                    Save & Create Order
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* EDIT ORDER MODAL */}
      {/* ============================================================= */}
      {isEditOrderOpen && (
        <div className="modal-overlay" onClick={() => setIsEditOrderOpen(false)}>
          <div className="modal-box" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit size={20} color="#0284c7" />
                <h3>Edit Order #{editForm.lr_number}</h3>
              </div>
              <button className="modal-close" onClick={() => setIsEditOrderOpen(false)}>
                <X size={22} />
              </button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleUpdateOrder}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">LR / Waybill Number *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 18002"
                      value={editForm.lr_number}
                      onChange={(e) => setEditForm({ ...editForm, lr_number: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Booking Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={editForm.booking_date}
                      onChange={(e) => setEditForm({ ...editForm, booking_date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Sender Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. PRIME TEXTILES"
                      value={editForm.sender_name}
                      onChange={(e) => setEditForm({ ...editForm, sender_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Sender Phone (10 Digits)</label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="e.g. 9840123456"
                      value={editForm.sender_phone}
                      maxLength={10}
                      onChange={(e) => setEditForm({ ...editForm, sender_phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Sender Address</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Sender pickup address (optional)"
                    value={editForm.sender_address}
                    onChange={(e) => setEditForm({ ...editForm, sender_address: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Receiver Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. KRISHNA SILKS"
                      value={editForm.receiver_name}
                      onChange={(e) => setEditForm({ ...editForm, receiver_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Receiver Phone (10 Digits)</label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="e.g. 9443187211"
                      value={editForm.receiver_phone}
                      maxLength={10}
                      onChange={(e) => setEditForm({ ...editForm, receiver_phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Receiver Address</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Receiver delivery address (optional)"
                    value={editForm.receiver_address}
                    onChange={(e) => setEditForm({ ...editForm, receiver_address: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">From Station *</label>
                    <select
                      className="form-control"
                      value={editForm.from_station}
                      onChange={(e) => setEditForm({ ...editForm, from_station: e.target.value })}
                    >
                      {branches.map(b => <option key={b.id} value={b.name}>{b.name} ({b.code})</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">To Station *</label>
                    <select
                      className="form-control"
                      value={editForm.to_station}
                      onChange={(e) => setEditForm({ ...editForm, to_station: e.target.value })}
                    >
                      {branches.map(b => <option key={b.id} value={b.name}>{b.name} ({b.code})</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Pieces (PCS)</label>
                    <input
                      type="number"
                      min="1"
                      className="form-control"
                      value={editForm.pieces}
                      onChange={(e) => setEditForm({ ...editForm, pieces: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Weight (KG)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-control"
                      value={editForm.weight_kg}
                      onChange={(e) => setEditForm({ ...editForm, weight_kg: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description of Goods</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Payment Mode</label>
                    <select
                      className="form-control"
                      value={editForm.payment_mode}
                      onChange={(e) => setEditForm({ ...editForm, payment_mode: e.target.value })}
                    >
                      <option value="TO_PAY">TO PAY (Collect on delivery)</option>
                      <option value="PAID">PAID (Prepaid)</option>
                      <option value="CREDIT">CREDIT</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Status</label>
                    <select
                      className="form-control"
                      value={editForm.payment_status}
                      onChange={(e) => setEditForm({ ...editForm, payment_status: e.target.value })}
                    >
                      <option value="UNPAID">UNPAID</option>
                      <option value="PAID">PAID</option>
                      <option value="PARTIALLY_PAID">PARTIALLY PAID</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment Method</label>
                    <select
                      className="form-control"
                      value={editForm.payment_method}
                      onChange={(e) => setEditForm({ ...editForm, payment_method: e.target.value })}
                    >
                      <option value="CASH">CASH</option>
                      <option value="UPI">UPI / GPay</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="CREDIT">Credit</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Freight Amount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      value={editForm.freight_amount}
                      onChange={(e) => setEditForm({ ...editForm, freight_amount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Other Charges (₹)</label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      value={editForm.other_charges}
                      onChange={(e) => setEditForm({ ...editForm, other_charges: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Total Freight</label>
                    <input
                      type="text"
                      className="form-control"
                      value={`₹${((parseFloat(editForm.freight_amount) || 0) + (parseFloat(editForm.other_charges) || 0)).toFixed(2)}`}
                      disabled
                      style={{ fontWeight: 'bold', background: '#f8fafc' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Delivery Status</label>
                    <select
                      className="form-control"
                      value={editForm.delivery_status}
                      onChange={(e) => setEditForm({ ...editForm, delivery_status: e.target.value })}
                    >
                      <option value="BOOKED">Booked</option>
                      <option value="IN_TRANSIT">In Transit</option>
                      <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                      <option value="DELIVERED">Delivered</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Assign Driver / Vehicle</label>
                    <select
                      className="form-control"
                      value={editForm.driver_id}
                      onChange={(e) => setEditForm({ ...editForm, driver_id: e.target.value })}
                    >
                      <option value="">-- Unassigned --</option>
                      {drivers.map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.vehicle_no})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Remarks</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Urgent textile delivery / Handle with care"
                    value={editForm.remarks}
                    onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                  />
                </div>

                <div className="flex justify-between items-center" style={{ marginTop: '24px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" className="btn btn-outline" onClick={() => setIsEditOrderOpen(false)}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm"
                      style={{ color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => handleDeleteOrder(editingOrderId, editForm.lr_number)}
                    >
                      <Trash2 size={14} />
                      <span>Delete Order</span>
                    </button>
                  </div>
                  <button type="submit" className="btn btn-accent" style={{ background: '#0284c7', borderColor: '#0284c7' }}>
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TRACKING TIMELINE DRAWER */}
      {/* ============================================================= */}
      {isTrackingDrawerOpen && selectedOrder && (
        <div className="modal-overlay" onClick={() => setIsTrackingDrawerOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Tracking Lifecycle (LR #{selectedOrder.lr_number})</h3>
              <button className="modal-close" onClick={() => setIsTrackingDrawerOpen(false)}>
                <X size={22} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ fontWeight: 700, color: 'var(--primary-dark)' }}>
                  {selectedOrder.from_station} ➔ {selectedOrder.to_station}
                </div>
                {getStatusBadge(selectedOrder.delivery_status)}
              </div>

              {/* Add Checkpoint Button or Form */}
              <div style={{ marginBottom: '20px' }}>
                {!isAddingCheckpoint ? (
                  <button className="btn btn-outline btn-sm" onClick={() => setIsAddingCheckpoint(true)}>
                    <PlusCircle size={14} />
                    <span>Add Transit Checkpoint Note</span>
                  </button>
                ) : (
                  <form onSubmit={handleSaveCheckpoint} style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '8px' }}>Log New Checkpoint</div>
                    <div className="form-group" style={{ marginBottom: 10 }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Location (e.g. Cuddalore Junction)"
                        value={cpLocation}
                        onChange={(e) => setCpLocation(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 10 }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Checkpoint Note (e.g. Arrived at hub / Passed toll)"
                        value={cpNote}
                        onChange={(e) => setCpNote(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="btn btn-accent btn-sm">Save Note</button>
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => setIsAddingCheckpoint(false)}>Cancel</button>
                    </div>
                  </form>
                )}
              </div>

              <div className="timeline">
                {trackingHistory.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)' }}>No checkpoints logged yet.</div>
                ) : (
                  trackingHistory.map((cp, idx) => (
                    <div key={idx} className="timeline-step">
                      <div className="timeline-dot"></div>
                      <div style={{ fontWeight: 700, color: 'var(--primary-dark)' }}>{cp.status} - {cp.location}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{cp.note}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{new Date(cp.created_at).toLocaleString()}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Print Container for Order Bill */}
      <div id="printableOrderArea" className="print-only"></div>

      {/* In-UI Success Modal */}
      <SuccessModal
        isOpen={!!successModalData}
        onClose={() => setSuccessModalData(null)}
        title={successModalData?.title || 'Success'}
        message={successModalData?.message || 'Action completed successfully.'}
        details={successModalData?.details}
        primaryButtonText={successModalData?.orderToPrint ? 'Print Order LR' : 'OK'}
        onPrimaryClick={() => {
          if (successModalData?.orderToPrint) {
            handlePrintLR(successModalData.orderToPrint);
          }
          setSuccessModalData(null);
        }}
        secondaryButtonText={successModalData?.orderToPrint ? 'Done' : null}
        onSecondaryClick={() => setSuccessModalData(null)}
      />
    </div>
  );
};

export default OrdersView;
