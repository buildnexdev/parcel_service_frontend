import React, { useState, useEffect } from 'react';
import { api } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import SuccessModal from '../Common/SuccessModal';
import { 
  Package, Search, Plus, CreditCard, Eye, Printer, 
  CheckCircle2, Clock, Truck, X, PlusCircle, AlertCircle, Phone, Edit, Trash2,
  RotateCw, Sparkles
} from 'lucide-react';

const OrdersView = ({ defaultOpenNew = false }) => {
  const { showToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingLr, setGeneratingLr] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');

  // Modals
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
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
    from_station: 'Karaikal',
    to_station: 'Pondicherry',
    pieces: 1,
    rate_per_piece: 100,
    weight_kg: 0,
    has_separate_boxes: false,
    box_items: [{ box_no: 1, weight: '', amount: '' }],
    description: 'Textiles / Goods',
    payment_mode: 'TO_PAY',
    payment_status: 'UNPAID',
    payment_method: 'CASH',
    freight_amount: 100,
    other_charges: 0,
    driver_id: '',
    vehicle_id: '',
    vehicle_no: '',
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
    rate_per_piece: 100,
    weight_kg: 0,
    has_separate_boxes: false,
    box_items: [{ box_no: 1, weight: '', amount: '' }],
    description: 'Goods',
    payment_mode: 'TO_PAY',
    payment_status: 'UNPAID',
    payment_method: 'CASH',
    freight_amount: 100,
    other_charges: 0,
    delivery_status: 'BOOKED',
    driver_id: '',
    vehicle_id: '',
    vehicle_no: '',
    remarks: ''
  });

  useEffect(() => {
    loadMetadata();
    loadOrders();
    if (defaultOpenNew) {
      handleOpenNewOrder();
    }
  }, []);

  const loadMetadata = async () => {
    try {
      const [dRes, bRes, vRes] = await Promise.all([
        api.getDrivers(),
        api.getBranches(),
        api.getVehicles()
      ]);
      if (dRes.success) setDrivers(dRes.drivers || []);
      if (bRes.success) setBranches(bRes.branches || []);
      if (vRes.success) setVehicles(vRes.vehicles || []);
    } catch (err) {
      console.error('Failed to load drivers/branches/vehicles metadata:', err);
    }
  };

  // Auto-generate next waybill / LR number: Today's date + Station code (e.g. Karaikal -> KA) + sequence
  const fetchNextWaybill = async (fromStation, date) => {
    try {
      setGeneratingLr(true);
      const res = await api.getNextWaybillNumber({
        from_station: fromStation || 'Karaikal',
        date: date || new Date().toISOString().split('T')[0]
      });
      if (res.success && res.next_lr) {
        return res.next_lr;
      }
    } catch (err) {
      console.error('Failed to get next waybill number:', err);
    } finally {
      setGeneratingLr(false);
    }
    return '';
  };

  const handleOpenNewOrder = async () => {
    const station = orderForm.from_station || 'Karaikal';
    const date = orderForm.booking_date || new Date().toISOString().split('T')[0];
    const nextLr = await fetchNextWaybill(station, date);
    setOrderForm(prev => ({
      ...prev,
      lr_number: nextLr || prev.lr_number
    }));
    setIsNewOrderOpen(true);
  };

  const handleStationOrDateChange = async (station, date) => {
    const newStation = station !== undefined ? station : orderForm.from_station;
    const newDate = date !== undefined ? date : orderForm.booking_date;
    const nextLr = await fetchNextWaybill(newStation, newDate);
    setOrderForm(prev => ({
      ...prev,
      from_station: newStation,
      booking_date: newDate,
      lr_number: nextLr || prev.lr_number
    }));
  };

  const handleSelectVehicle = (vehicleId) => {
    if (!vehicleId) {
      setOrderForm(prev => ({ ...prev, vehicle_id: '', vehicle_no: '' }));
      return;
    }
    const selectedVeh = vehicles.find(v => v.id.toString() === vehicleId.toString());
    if (selectedVeh) {
      const matchingDriver = drivers.find(d => d.name && selectedVeh.driver_name && d.name.toLowerCase() === selectedVeh.driver_name.toLowerCase());
      setOrderForm(prev => ({
        ...prev,
        vehicle_id: selectedVeh.id,
        vehicle_no: selectedVeh.vehicle_no,
        driver_id: matchingDriver ? matchingDriver.id : prev.driver_id
      }));
    }
  };

  const handleSelectEditVehicle = (vehicleId) => {
    if (!vehicleId) {
      setEditForm(prev => ({ ...prev, vehicle_id: '', vehicle_no: '' }));
      return;
    }
    const selectedVeh = vehicles.find(v => v.id.toString() === vehicleId.toString());
    if (selectedVeh) {
      const matchingDriver = drivers.find(d => d.name && selectedVeh.driver_name && d.name.toLowerCase() === selectedVeh.driver_name.toLowerCase());
      setEditForm(prev => ({
        ...prev,
        vehicle_id: selectedVeh.id,
        vehicle_no: selectedVeh.vehicle_no,
        driver_id: matchingDriver ? matchingDriver.id : prev.driver_id
      }));
    }
  };

  // ==========================================
  // NEW ORDER: PIECES, RATE, & BOX CALCULATIONS
  // ==========================================
  const handlePiecesChange = (val) => {
    const p = Math.max(1, parseInt(val, 10) || 1);
    setOrderForm(prev => {
      const rate = parseFloat(prev.rate_per_piece) || 0;
      let newBoxes = prev.box_items || [];
      if (prev.has_separate_boxes) {
        if (p > newBoxes.length) {
          const added = Array.from({ length: p - newBoxes.length }, (_, i) => ({
            box_no: newBoxes.length + i + 1,
            weight: '',
            amount: rate > 0 ? rate : ''
          }));
          newBoxes = [...newBoxes, ...added];
        } else {
          newBoxes = newBoxes.slice(0, p);
        }
      }
      const hasBoxAmounts = prev.has_separate_boxes && newBoxes.some(b => parseFloat(b.amount) > 0);
      const sumBoxAmounts = hasBoxAmounts ? newBoxes.reduce((acc, b) => acc + (parseFloat(b.amount) || 0), 0) : 0;
      const newFreight = hasBoxAmounts ? sumBoxAmounts : (rate > 0 ? p * rate : prev.freight_amount);
      const sumW = prev.has_separate_boxes ? newBoxes.reduce((acc, b) => acc + (parseFloat(b.weight) || 0), 0) : prev.weight_kg;

      return {
        ...prev,
        pieces: p,
        freight_amount: newFreight,
        box_items: newBoxes,
        weight_kg: prev.has_separate_boxes && sumW > 0 ? parseFloat(sumW.toFixed(2)) : prev.weight_kg
      };
    });
  };

  const handleRateChange = (val) => {
    const rate = val === '' ? '' : Math.max(0, parseFloat(val) || 0);
    setOrderForm(prev => {
      const p = parseInt(prev.pieces, 10) || 1;
      const numRate = parseFloat(rate) || 0;
      let newBoxes = prev.box_items || [];
      if (prev.has_separate_boxes && numRate > 0) {
        newBoxes = newBoxes.map(b => ({
          ...b,
          amount: (b.amount === '' || parseFloat(b.amount) === parseFloat(prev.rate_per_piece)) ? numRate : b.amount
        }));
      }
      const hasBoxAmounts = prev.has_separate_boxes && newBoxes.some(b => parseFloat(b.amount) > 0);
      const sumBoxAmounts = hasBoxAmounts ? newBoxes.reduce((acc, b) => acc + (parseFloat(b.amount) || 0), 0) : 0;
      const newFreight = hasBoxAmounts ? sumBoxAmounts : (numRate > 0 ? p * numRate : prev.freight_amount);

      return {
        ...prev,
        rate_per_piece: rate,
        box_items: newBoxes,
        freight_amount: newFreight
      };
    });
  };

  const handleFreightAmountChange = (val) => {
    const amt = val === '' ? '' : Math.max(0, parseFloat(val) || 0);
    setOrderForm(prev => {
      const p = parseInt(prev.pieces, 10) || 1;
      const numAmt = parseFloat(amt) || 0;
      const derivedRate = p > 0 ? parseFloat((numAmt / p).toFixed(2)) : 0;
      return {
        ...prev,
        freight_amount: amt,
        rate_per_piece: derivedRate > 0 ? derivedRate : prev.rate_per_piece
      };
    });
  };

  const handleToggleSeparateBoxes = (checked) => {
    setOrderForm(prev => {
      const p = parseInt(prev.pieces, 10) || 1;
      const rate = parseFloat(prev.rate_per_piece) || 0;
      let items = prev.box_items || [];
      if (checked) {
        if (items.length !== p) {
          items = Array.from({ length: p }, (_, i) => items[i] || { box_no: i + 1, weight: '', amount: rate > 0 ? rate : '' });
        } else {
          items = items.map((b) => ({
            ...b,
            amount: b.amount !== undefined && b.amount !== '' ? b.amount : (rate > 0 ? rate : '')
          }));
        }
        const sumW = items.reduce((acc, b) => acc + (parseFloat(b.weight) || 0), 0);
        const hasBoxAmounts = items.some(b => parseFloat(b.amount) > 0);
        const sumAmt = hasBoxAmounts ? items.reduce((acc, b) => acc + (parseFloat(b.amount) || 0), 0) : (rate > 0 ? p * rate : prev.freight_amount);
        return {
          ...prev,
          has_separate_boxes: true,
          box_items: items,
          weight_kg: sumW > 0 ? parseFloat(sumW.toFixed(2)) : prev.weight_kg,
          freight_amount: sumAmt > 0 ? parseFloat(sumAmt.toFixed(2)) : prev.freight_amount
        };
      } else {
        return {
          ...prev,
          has_separate_boxes: false
        };
      }
    });
  };

  const handleBoxWeightChange = (index, val) => {
    setOrderForm(prev => {
      const updated = prev.box_items.map((b, i) => i === index ? { ...b, weight: val } : b);
      const sumW = updated.reduce((acc, b) => acc + (parseFloat(b.weight) || 0), 0);
      return {
        ...prev,
        box_items: updated,
        weight_kg: parseFloat(sumW.toFixed(2))
      };
    });
  };

  const handleBoxAmountChange = (index, val) => {
    setOrderForm(prev => {
      const updated = prev.box_items.map((b, i) => i === index ? { ...b, amount: val } : b);
      const sumAmt = updated.reduce((acc, b) => acc + (parseFloat(b.amount) || 0), 0);
      const p = parseInt(prev.pieces, 10) || 1;
      const derivedRate = p > 0 ? parseFloat((sumAmt / p).toFixed(2)) : prev.rate_per_piece;
      return {
        ...prev,
        box_items: updated,
        freight_amount: parseFloat(sumAmt.toFixed(2)),
        rate_per_piece: derivedRate > 0 ? derivedRate : prev.rate_per_piece
      };
    });
  };

  const handleAddBox = () => {
    setOrderForm(prev => {
      const rate = parseFloat(prev.rate_per_piece) || 0;
      const newItems = [
        ...(prev.box_items || []),
        { box_no: (prev.box_items?.length || 0) + 1, weight: '', amount: rate > 0 ? rate : '' }
      ];
      const newPcs = newItems.length;
      const sumW = newItems.reduce((acc, b) => acc + (parseFloat(b.weight) || 0), 0);
      const hasBoxAmounts = newItems.some(b => parseFloat(b.amount) > 0);
      const sumBoxAmounts = hasBoxAmounts ? newItems.reduce((acc, b) => acc + (parseFloat(b.amount) || 0), 0) : 0;
      const newFreight = hasBoxAmounts ? sumBoxAmounts : (rate > 0 ? newPcs * rate : prev.freight_amount);
      const derivedRate = newPcs > 0 && newFreight > 0 ? parseFloat((newFreight / newPcs).toFixed(2)) : rate;

      return {
        ...prev,
        pieces: newPcs,
        box_items: newItems,
        weight_kg: parseFloat(sumW.toFixed(2)),
        freight_amount: newFreight,
        rate_per_piece: derivedRate > 0 ? derivedRate : prev.rate_per_piece
      };
    });
  };

  const handleRemoveBox = (index) => {
    setOrderForm(prev => {
      if ((prev.box_items?.length || 0) <= 1) return prev;
      const filtered = prev.box_items.filter((_, i) => i !== index).map((b, i) => ({ ...b, box_no: i + 1 }));
      const newPcs = filtered.length;
      const sumW = filtered.reduce((acc, b) => acc + (parseFloat(b.weight) || 0), 0);
      const hasBoxAmounts = filtered.some(b => parseFloat(b.amount) > 0);
      const sumBoxAmounts = hasBoxAmounts ? filtered.reduce((acc, b) => acc + (parseFloat(b.amount) || 0), 0) : 0;
      const rate = parseFloat(prev.rate_per_piece) || 0;
      const newFreight = hasBoxAmounts ? sumBoxAmounts : (rate > 0 ? newPcs * rate : prev.freight_amount);
      const derivedRate = newPcs > 0 && newFreight > 0 ? parseFloat((newFreight / newPcs).toFixed(2)) : rate;

      return {
        ...prev,
        pieces: newPcs,
        box_items: filtered,
        weight_kg: parseFloat(sumW.toFixed(2)),
        freight_amount: newFreight,
        rate_per_piece: derivedRate > 0 ? derivedRate : prev.rate_per_piece
      };
    });
  };

  // ==========================================
  // EDIT ORDER: PIECES, RATE, & BOX CALCULATIONS
  // ==========================================
  const handleEditPiecesChange = (val) => {
    const p = Math.max(1, parseInt(val, 10) || 1);
    setEditForm(prev => {
      const rate = parseFloat(prev.rate_per_piece) || 0;
      let newBoxes = prev.box_items || [];
      if (prev.has_separate_boxes) {
        if (p > newBoxes.length) {
          const added = Array.from({ length: p - newBoxes.length }, (_, i) => ({
            box_no: newBoxes.length + i + 1,
            weight: '',
            amount: rate > 0 ? rate : ''
          }));
          newBoxes = [...newBoxes, ...added];
        } else {
          newBoxes = newBoxes.slice(0, p);
        }
      }
      const hasBoxAmounts = prev.has_separate_boxes && newBoxes.some(b => parseFloat(b.amount) > 0);
      const sumBoxAmounts = hasBoxAmounts ? newBoxes.reduce((acc, b) => acc + (parseFloat(b.amount) || 0), 0) : 0;
      const newFreight = hasBoxAmounts ? sumBoxAmounts : (rate > 0 ? p * rate : prev.freight_amount);
      const sumW = prev.has_separate_boxes ? newBoxes.reduce((acc, b) => acc + (parseFloat(b.weight) || 0), 0) : prev.weight_kg;

      return {
        ...prev,
        pieces: p,
        freight_amount: newFreight,
        box_items: newBoxes,
        weight_kg: prev.has_separate_boxes && sumW > 0 ? parseFloat(sumW.toFixed(2)) : prev.weight_kg
      };
    });
  };

  const handleEditRateChange = (val) => {
    const rate = val === '' ? '' : Math.max(0, parseFloat(val) || 0);
    setEditForm(prev => {
      const p = parseInt(prev.pieces, 10) || 1;
      const numRate = parseFloat(rate) || 0;
      let newBoxes = prev.box_items || [];
      if (prev.has_separate_boxes && numRate > 0) {
        newBoxes = newBoxes.map(b => ({
          ...b,
          amount: (b.amount === '' || parseFloat(b.amount) === parseFloat(prev.rate_per_piece)) ? numRate : b.amount
        }));
      }
      const hasBoxAmounts = prev.has_separate_boxes && newBoxes.some(b => parseFloat(b.amount) > 0);
      const sumBoxAmounts = hasBoxAmounts ? newBoxes.reduce((acc, b) => acc + (parseFloat(b.amount) || 0), 0) : 0;
      const newFreight = hasBoxAmounts ? sumBoxAmounts : (numRate > 0 ? p * numRate : prev.freight_amount);

      return {
        ...prev,
        rate_per_piece: rate,
        box_items: newBoxes,
        freight_amount: newFreight
      };
    });
  };

  const handleEditFreightAmountChange = (val) => {
    const amt = val === '' ? '' : Math.max(0, parseFloat(val) || 0);
    setEditForm(prev => {
      const p = parseInt(prev.pieces, 10) || 1;
      const numAmt = parseFloat(amt) || 0;
      const derivedRate = p > 0 ? parseFloat((numAmt / p).toFixed(2)) : 0;
      return {
        ...prev,
        freight_amount: amt,
        rate_per_piece: derivedRate > 0 ? derivedRate : prev.rate_per_piece
      };
    });
  };

  const handleEditToggleSeparateBoxes = (checked) => {
    setEditForm(prev => {
      const p = parseInt(prev.pieces, 10) || 1;
      const rate = parseFloat(prev.rate_per_piece) || 0;
      let items = prev.box_items || [];
      if (checked) {
        if (items.length !== p) {
          items = Array.from({ length: p }, (_, i) => items[i] || { box_no: i + 1, weight: '', amount: rate > 0 ? rate : '' });
        } else {
          items = items.map((b) => ({
            ...b,
            amount: b.amount !== undefined && b.amount !== '' ? b.amount : (rate > 0 ? rate : '')
          }));
        }
        const sumW = items.reduce((acc, b) => acc + (parseFloat(b.weight) || 0), 0);
        const hasBoxAmounts = items.some(b => parseFloat(b.amount) > 0);
        const sumAmt = hasBoxAmounts ? items.reduce((acc, b) => acc + (parseFloat(b.amount) || 0), 0) : (rate > 0 ? p * rate : prev.freight_amount);
        return {
          ...prev,
          has_separate_boxes: true,
          box_items: items,
          weight_kg: sumW > 0 ? parseFloat(sumW.toFixed(2)) : prev.weight_kg,
          freight_amount: sumAmt > 0 ? parseFloat(sumAmt.toFixed(2)) : prev.freight_amount
        };
      } else {
        return {
          ...prev,
          has_separate_boxes: false
        };
      }
    });
  };

  const handleEditBoxWeightChange = (index, val) => {
    setEditForm(prev => {
      const updated = prev.box_items.map((b, i) => i === index ? { ...b, weight: val } : b);
      const sumW = updated.reduce((acc, b) => acc + (parseFloat(b.weight) || 0), 0);
      return {
        ...prev,
        box_items: updated,
        weight_kg: parseFloat(sumW.toFixed(2))
      };
    });
  };

  const handleEditBoxAmountChange = (index, val) => {
    setEditForm(prev => {
      const updated = prev.box_items.map((b, i) => i === index ? { ...b, amount: val } : b);
      const sumAmt = updated.reduce((acc, b) => acc + (parseFloat(b.amount) || 0), 0);
      const p = parseInt(prev.pieces, 10) || 1;
      const derivedRate = p > 0 ? parseFloat((sumAmt / p).toFixed(2)) : prev.rate_per_piece;
      return {
        ...prev,
        box_items: updated,
        freight_amount: parseFloat(sumAmt.toFixed(2)),
        rate_per_piece: derivedRate > 0 ? derivedRate : prev.rate_per_piece
      };
    });
  };

  const handleEditAddBox = () => {
    setEditForm(prev => {
      const rate = parseFloat(prev.rate_per_piece) || 0;
      const newItems = [
        ...(prev.box_items || []),
        { box_no: (prev.box_items?.length || 0) + 1, weight: '', amount: rate > 0 ? rate : '' }
      ];
      const newPcs = newItems.length;
      const sumW = newItems.reduce((acc, b) => acc + (parseFloat(b.weight) || 0), 0);
      const hasBoxAmounts = newItems.some(b => parseFloat(b.amount) > 0);
      const sumBoxAmounts = hasBoxAmounts ? newItems.reduce((acc, b) => acc + (parseFloat(b.amount) || 0), 0) : 0;
      const newFreight = hasBoxAmounts ? sumBoxAmounts : (rate > 0 ? newPcs * rate : prev.freight_amount);
      const derivedRate = newPcs > 0 && newFreight > 0 ? parseFloat((newFreight / newPcs).toFixed(2)) : rate;

      return {
        ...prev,
        pieces: newPcs,
        box_items: newItems,
        weight_kg: parseFloat(sumW.toFixed(2)),
        freight_amount: newFreight,
        rate_per_piece: derivedRate > 0 ? derivedRate : prev.rate_per_piece
      };
    });
  };

  const handleEditRemoveBox = (index) => {
    setEditForm(prev => {
      if ((prev.box_items?.length || 0) <= 1) return prev;
      const filtered = prev.box_items.filter((_, i) => i !== index).map((b, i) => ({ ...b, box_no: i + 1 }));
      const newPcs = filtered.length;
      const sumW = filtered.reduce((acc, b) => acc + (parseFloat(b.weight) || 0), 0);
      const hasBoxAmounts = filtered.some(b => parseFloat(b.amount) > 0);
      const sumBoxAmounts = hasBoxAmounts ? filtered.reduce((acc, b) => acc + (parseFloat(b.amount) || 0), 0) : 0;
      const rate = parseFloat(prev.rate_per_piece) || 0;
      const newFreight = hasBoxAmounts ? sumBoxAmounts : (rate > 0 ? newPcs * rate : prev.freight_amount);
      const derivedRate = newPcs > 0 && newFreight > 0 ? parseFloat((newFreight / newPcs).toFixed(2)) : rate;

      return {
        ...prev,
        pieces: newPcs,
        box_items: filtered,
        weight_kg: parseFloat(sumW.toFixed(2)),
        freight_amount: newFreight,
        rate_per_piece: derivedRate > 0 ? derivedRate : prev.rate_per_piece
      };
    });
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
      const boxDetailsToSave = orderForm.has_separate_boxes && orderForm.box_items?.length > 0
        ? orderForm.box_items.map((b, i) => ({
            box_no: i + 1,
            weight: parseFloat(b.weight) || 0,
            amount: parseFloat(b.amount) || 0
          }))
        : null;

      const res = await api.createOrder({
        ...orderForm,
        freight_amount: parseFloat(orderForm.freight_amount) || 0,
        rate_per_piece: parseFloat(orderForm.rate_per_piece) || 0,
        other_charges: parseFloat(orderForm.other_charges) || 0,
        pieces: parseInt(orderForm.pieces, 10) || 1,
        weight_kg: parseFloat(orderForm.weight_kg) || 0,
        box_details: boxDetailsToSave,
        driver_id: orderForm.driver_id ? parseInt(orderForm.driver_id, 10) : null,
        vehicle_id: orderForm.vehicle_id ? parseInt(orderForm.vehicle_id, 10) : null,
        vehicle_no: orderForm.vehicle_no || null
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
            'Total Freight': `₹${Number(created.total_amount).toLocaleString()} [${created.payment_mode} - ${created.payment_status}]`,
            'Assigned Vehicle': created.vehicle_no || created.driver_vehicle || 'Unassigned'
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
    let initialBoxes = [];
    let hasBoxes = false;
    const pcs = order.pieces || 1;
    const rate = order.rate_per_piece !== undefined && parseFloat(order.rate_per_piece) > 0
      ? order.rate_per_piece
      : (pcs > 0 ? parseFloat(((order.freight_amount || 0) / pcs).toFixed(2)) : 0);

    if (order.box_details) {
      try {
        const parsed = typeof order.box_details === 'string' ? JSON.parse(order.box_details) : order.box_details;
        if (Array.isArray(parsed) && parsed.length > 0) {
          initialBoxes = parsed.map((b, i) => ({
            box_no: b.box_no || i + 1,
            weight: b.weight !== undefined ? b.weight : (typeof b === 'number' ? b : ''),
            amount: b.amount !== undefined ? b.amount : (rate > 0 ? rate : '')
          }));
          hasBoxes = true;
        }
      } catch (e) {}
    }
    if (!hasBoxes) {
      initialBoxes = Array.from({ length: pcs }, (_, i) => ({
        box_no: i + 1,
        weight: '',
        amount: rate > 0 ? rate : ''
      }));
    }

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
      pieces: pcs,
      rate_per_piece: rate,
      weight_kg: order.weight_kg || 0,
      has_separate_boxes: hasBoxes,
      box_items: initialBoxes,
      description: order.description || 'Goods',
      payment_mode: order.payment_mode || 'TO_PAY',
      payment_status: order.payment_status || 'UNPAID',
      payment_method: order.payment_method || 'CASH',
      freight_amount: order.freight_amount !== undefined ? order.freight_amount : 0,
      other_charges: order.other_charges !== undefined ? order.other_charges : 0,
      delivery_status: order.delivery_status || 'BOOKED',
      driver_id: order.driver_id || '',
      vehicle_id: order.vehicle_id || '',
      vehicle_no: order.vehicle_no || order.driver_vehicle || '',
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
      const boxDetailsToSave = editForm.has_separate_boxes && editForm.box_items?.length > 0
        ? editForm.box_items.map((b, i) => ({
            box_no: i + 1,
            weight: parseFloat(b.weight) || 0,
            amount: parseFloat(b.amount) || 0
          }))
        : null;

      const res = await api.updateOrder(editingOrderId, {
        ...editForm,
        freight_amount: parseFloat(editForm.freight_amount) || 0,
        rate_per_piece: parseFloat(editForm.rate_per_piece) || 0,
        other_charges: parseFloat(editForm.other_charges) || 0,
        pieces: parseInt(editForm.pieces, 10) || 1,
        weight_kg: parseFloat(editForm.weight_kg) || 0,
        box_details: boxDetailsToSave,
        driver_id: editForm.driver_id ? parseInt(editForm.driver_id, 10) : null,
        vehicle_id: editForm.vehicle_id ? parseInt(editForm.vehicle_id, 10) : null,
        vehicle_no: editForm.vehicle_no || null
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

    let boxSummary = '';
    let hasCustomBoxRates = false;
    if (order.box_details) {
      try {
        const parsed = typeof order.box_details === 'string' ? JSON.parse(order.box_details) : order.box_details;
        if (Array.isArray(parsed) && parsed.length > 0) {
          hasCustomBoxRates = parsed.some(b => parseFloat(b.amount) > 0);
          boxSummary = parsed.map((b, i) => `Box ${i + 1}: ${b.weight} kg${parseFloat(b.amount) > 0 ? ` (₹${b.amount})` : ''}`).join(' | ');
        }
      } catch (e) {}
    }

    const rateText = hasCustomBoxRates
      ? `<div style="font-size: 0.725rem; color: #047857; margin-top: 2px; font-weight: 600;">Separate Box Rates</div>`
      : (order.rate_per_piece > 0 ? `<div style="font-size: 0.725rem; color: #475569; margin-top: 2px;">Rate: ₹${order.rate_per_piece}/pc</div>` : '');

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

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 14px; font-size: 0.85rem;">
          <div style="border: 1px solid #fca5a5; padding: 8px 10px; border-radius: 4px; background: #fffaf0;">
            <strong style="color: #991b1b;">ASSIGNED VEHICLE:</strong>
            <div style="font-family: monospace; font-size: 1rem; font-weight: 800; color: #1e293b; margin-top: 2px;">
              ${order.vehicle_no || order.driver_vehicle || 'Direct Dispatch'}
            </div>
            ${order.vehicle_type ? `<div style="font-size: 0.775rem; color: #64748b;">${order.vehicle_type} ${order.vehicle_capacity ? `(${order.vehicle_capacity})` : ''}</div>` : ''}
          </div>
          <div style="border: 1px solid #fca5a5; padding: 8px 10px; border-radius: 4px; background: #fffaf0;">
            <strong style="color: #991b1b;">ASSIGNED DRIVER:</strong>
            <div style="font-size: 0.95rem; font-weight: 700; color: #1e293b; margin-top: 2px;">
              ${order.driver_name || 'Fleet Driver'}
            </div>
            <div style="font-size: 0.775rem; color: #64748b;">Contact: ${order.driver_phone || 'N/A'}</div>
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
              <td style="padding: 10px; border-bottom: 1px solid #fca5a5; text-align: center;">
                <strong>${order.pieces} Pcs</strong>
                ${rateText}
              </td>
              <td style="padding: 10px; border-bottom: 1px solid #fca5a5; text-align: center;">
                <strong>${order.weight_kg} Kg</strong>
                ${boxSummary ? `<div style="font-size: 0.725rem; color: #64748b; margin-top: 2px; line-height: 1.3;">(${boxSummary})</div>` : ''}
              </td>
              <td style="padding: 10px; border-bottom: 1px solid #fca5a5; text-align: center; font-weight: bold; color: #991b1b;">
                ${order.payment_mode} (${order.payment_status})
              </td>
              <td style="padding: 10px; border-bottom: 1px solid #fca5a5; text-align: right; font-weight: bold; font-size: 1.1rem;">
                ₹${Number(order.total_amount).toLocaleString()}
                ${hasCustomBoxRates
                  ? `<div style="font-size: 0.725rem; color: #475569; font-weight: normal; margin-top: 2px;">(Sum of box rates${order.other_charges > 0 ? ` + ₹${order.other_charges}` : ''})</div>`
                  : (order.rate_per_piece > 0 ? `<div style="font-size: 0.725rem; color: #475569; font-weight: normal; margin-top: 2px;">(${order.pieces} × ₹${order.rate_per_piece}${order.other_charges > 0 ? ` + ₹${order.other_charges}` : ''})</div>` : '')
                }
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

    document.body.classList.add('printing-order-lr');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-order-lr');
      if (printArea) printArea.innerHTML = '';
    }, 1000);
  };

  // Print 58mm/80mm Portable Bluetooth Thermal Slip for Drivers
  const handlePrintThermalReceipt = (order) => {
    const printArea = document.getElementById('printableOrderArea');
    if (!printArea) return;

    let boxSummary = '';
    if (order.box_details) {
      try {
        const parsed = typeof order.box_details === 'string' ? JSON.parse(order.box_details) : order.box_details;
        if (Array.isArray(parsed) && parsed.length > 0) {
          boxSummary = parsed.map((b, i) => `#${i + 1}: ${b.weight}kg${parseFloat(b.amount) > 0 ? ` (₹${b.amount})` : ''}`).join(', ');
        }
      } catch (e) {}
    }

    printArea.innerHTML = `
      <div style="width: 270px; margin: 0 auto; padding: 4px; font-family: monospace, 'Courier New', Courier; font-size: 11px; line-height: 1.35; color: #000; background: #fff;">
        <div style="text-align: center; border-bottom: 1.5px dashed #000; padding-bottom: 6px; margin-bottom: 6px;">
          <div style="font-size: 14px; font-weight: 900; letter-spacing: 0.05em;">IGR QUICK PARCEL</div>
          <div style="font-size: 11px; font-weight: bold;">(ES TRANSPORTERS)</div>
          <div style="font-size: 9px; margin-top: 2px;">KARAIKAL - PUDUCHERRY</div>
          <div style="font-size: 9px;">Phone: 94424 85296 / 93604 27527</div>
        </div>

        <div style="border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 5px;">
          <div style="font-size: 13px; font-weight: 900; text-align: center;">LR: #${order.lr_number}</div>
          <div style="display: flex; justify-content: space-between; font-size: 10px; margin-top: 2px;">
            <span>Date: ${new Date(order.booking_date).toLocaleDateString('en-IN')}</span>
            <span>${new Date(order.booking_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div style="font-size: 11px; font-weight: bold; text-align: center; margin-top: 4px; background: #000; color: #fff; padding: 2px 4px;">
            ${order.from_station} ➔ ${order.to_station}
          </div>
        </div>

        <div style="border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 5px; font-size: 10.5px;">
          <div><strong>SENDER:</strong> ${order.sender_name}</div>
          <div>Phone: ${order.sender_phone || 'N/A'}</div>
          <div style="margin-top: 3px;"><strong>RECEIVER:</strong> ${order.receiver_name}</div>
          <div>Phone: ${order.receiver_phone || 'N/A'}</div>
        </div>

        <div style="border-bottom: 1.5px dashed #000; padding-bottom: 6px; margin-bottom: 6px;">
          <div style="display: flex; justify-content: space-between; font-size: 11px;">
            <span>Pieces: <strong>${order.pieces} Pcs</strong></span>
            <span>Weight: <strong>${order.weight_kg || 0} Kg</strong></span>
          </div>
          ${boxSummary ? `<div style="font-size: 9.5px; color: #222; margin-top: 2px;">Boxes: ${boxSummary}</div>` : ''}
          ${order.description ? `<div style="font-size: 10px; margin-top: 2px;">Goods: ${order.description}</div>` : ''}
          <div style="margin-top: 5px; padding-top: 4px; border-top: 1px dotted #000; display: flex; justify-content: space-between; font-size: 13px; font-weight: 900;">
            <span>${order.payment_mode}:</span>
            <span>₹${Number(order.total_amount).toLocaleString()}</span>
          </div>
          <div style="font-size: 9.5px; text-align: right; color: #333;">Payment: ${order.payment_status}</div>
        </div>

        <div style="font-size: 10px; margin-bottom: 8px;">
          <div>Vehicle: <strong>${order.vehicle_no || order.driver_vehicle || 'Direct Dispatch'}</strong></div>
          <div>Driver: ${order.driver_name || 'Driver'}</div>
        </div>

        <div style="text-align: center; border-top: 1px dashed #000; padding-top: 6px; font-size: 9px;">
          <div>*** THANK YOU - HAVE A SAFE TRIP ***</div>
          <div style="margin-top: 20px; border-top: 1px solid #000; padding-top: 3px; display: flex; justify-content: space-between; font-size: 8.5px;">
            <span>Customer Sign</span>
            <span>Driver Sign</span>
          </div>
        </div>
      </div>
    `;

    document.body.classList.add('printing-order-lr');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-order-lr');
      if (printArea) printArea.innerHTML = '';
    }, 1000);
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
        <div className="table-header no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 'min(100%, 240px)', position: 'relative' }}>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', width: 'auto' }}>
            <select
              className="form-control"
              style={{ width: 'auto', flex: 1, minWidth: '150px' }}
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
              style={{ width: 'auto', flex: 1, minWidth: '130px' }}
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
            >
              <option value="ALL">All Payments</option>
              <option value="PAID">PAID</option>
              <option value="UNPAID">UNPAID (To-Pay / Pending)</option>
            </select>

            <button className="btn btn-accent" onClick={handleOpenNewOrder} style={{ whiteSpace: 'nowrap' }}>
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
                <th>Vehicle & Driver</th>
                <th className="no-print" style={{ textAlign: 'center', minWidth: '170px' }}>Actions</th>
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
                      {o.box_details && (() => {
                        try {
                          const boxes = typeof o.box_details === 'string' ? JSON.parse(o.box_details) : o.box_details;
                          if (Array.isArray(boxes) && boxes.length > 0) {
                            return (
                              <div style={{ fontSize: '0.675rem', color: '#0369a1', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '4px', padding: '2px 6px', marginTop: '3px', width: 'fit-content' }}>
                                📦 {boxes.map((b, i) => `#${i + 1}: ${b.weight}kg${parseFloat(b.amount) > 0 ? ` (₹${b.amount})` : ''}`).join(', ')}
                              </div>
                            );
                          }
                        } catch (e) {}
                        return null;
                      })()}
                    </td>

                    <td>{getStatusBadge(o.delivery_status)}</td>

                    <td>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                        ₹{Number(o.total_amount).toLocaleString()}
                      </div>
                      {(() => {
                        try {
                          const boxes = o.box_details ? (typeof o.box_details === 'string' ? JSON.parse(o.box_details) : o.box_details) : null;
                          if (Array.isArray(boxes) && boxes.some(b => parseFloat(b.amount) > 0)) {
                            return (
                              <div style={{ fontSize: '0.7rem', color: '#047857', fontWeight: 600, marginTop: '2px' }}>
                                Separate Box Rates ({boxes.length} boxes)
                              </div>
                            );
                          }
                        } catch (e) {}
                        if (parseFloat(o.rate_per_piece) > 0 || (o.pieces > 1 && o.total_amount > 0)) {
                          return (
                            <div style={{ fontSize: '0.7rem', color: '#047857', fontWeight: 600, marginTop: '2px' }}>
                              ₹{parseFloat(o.rate_per_piece) > 0 ? o.rate_per_piece : (o.total_amount / o.pieces).toFixed(0)}/pc × {o.pieces}
                            </div>
                          );
                        }
                        return null;
                      })()}
                      <div style={{ marginTop: '4px' }}>
                        {getPaymentBadge(o.payment_mode, o.payment_status)}
                      </div>
                    </td>

                    <td>
                      {(o.vehicle_no || o.driver_vehicle) ? (
                        <div style={{
                          fontFamily: 'monospace', 
                          fontSize: '0.825rem', 
                          fontWeight: 800, 
                          background: '#ffffff', 
                          border: '1.5px solid #0f172a', 
                          borderRadius: '5px', 
                          padding: '2px 8px', 
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          color: '#0f172a',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                          marginBottom: '3px'
                        }}>
                          <span style={{ fontSize: '0.6rem', background: '#0f172a', color: '#fff', padding: '1px 3px', borderRadius: '2px', fontWeight: 700 }}>IND</span>
                          <span>{o.vehicle_no || o.driver_vehicle}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', display: 'block', marginBottom: '2px' }}>No vehicle assigned</span>
                      )}

                      {o.vehicle_type && (
                        <div style={{ fontSize: '0.725rem', color: '#475569', fontWeight: 600 }}>
                          🚛 {o.vehicle_type} {o.vehicle_capacity ? `• ${o.vehicle_capacity}` : ''}
                        </div>
                      )}

                      <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                        <Truck size={12} style={{ color: '#2563eb' }} />
                        <span>{o.driver_name || 'Driver unassigned'}</span>
                      </div>
                    </td>

                    <td className="no-print">
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

                          {/* Print LR (A4) */}
                          <button
                            className="btn btn-outline btn-xs"
                            onClick={() => handlePrintLR(o)}
                            title="Print Full A4 Waybill"
                            style={{ flex: 1, padding: '4px 6px', fontSize: '0.75rem', gap: '3px' }}
                          >
                            <Printer size={12} />
                            <span>A4</span>
                          </button>

                          {/* Print Bluetooth Slip (58mm Thermal) */}
                          <button
                            className="btn btn-outline btn-xs"
                            onClick={() => handlePrintThermalReceipt(o)}
                            title="Print Portable Bluetooth Thermal Slip (Driver Slip)"
                            style={{ flex: 1, padding: '4px 6px', fontSize: '0.75rem', gap: '3px', color: '#16a34a', borderColor: '#86efac', background: '#f0fdf4' }}
                          >
                            <Printer size={12} />
                            <span>Slip 📱</span>
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

                <div className="form-grid-2">
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
          <div className="modal-box" style={{ maxWidth: 960, width: 'min(96vw, 960px)' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Order (LR / Bill)</h3>
              <button className="modal-close" onClick={() => setIsNewOrderOpen(false)}>
                <X size={22} />
              </button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleCreateOrder}>
                <div className="form-grid-2">
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label className="form-label" style={{ margin: 0 }}>LR Number *</label>
                      <button
                        type="button"
                        onClick={() => handleStationOrDateChange(orderForm.from_station, orderForm.booking_date)}
                        className="btn btn-outline btn-xs"
                        style={{ padding: '2px 8px', fontSize: '0.72rem', gap: '4px', borderColor: '#bfdbfe', color: '#1d4ed8', background: '#eff6ff' }}
                        title="Auto-calculate next sequence number based on origin station and booking date"
                      >
                        <RotateCw size={11} className={generatingLr ? 'spin' : ''} />
                        <span>Auto Next</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 20261020KA001"
                      value={orderForm.lr_number}
                      onChange={(e) => setOrderForm({ ...orderForm, lr_number: e.target.value })}
                      required
                      style={{ fontWeight: 800, fontFamily: 'monospace', letterSpacing: '0.04em', color: '#1d4ed8', background: '#f8fafc' }}
                    />
                    <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '3px', display: 'block' }}>
                      ⚡ Auto-incremented for <strong>{orderForm.from_station}</strong> ({orderForm.booking_date})
                    </span>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Booking Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={orderForm.booking_date}
                      onChange={(e) => handleStationOrDateChange(orderForm.from_station, e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-grid-2">
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
                    <label className="form-label">Sender Phone</label>
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

                <div className="form-grid-2">
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
                    <label className="form-label">Receiver Phone</label>
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

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">From Station *</label>
                    <select
                      className="form-control"
                      value={orderForm.from_station}
                      onChange={(e) => handleStationOrDateChange(e.target.value, orderForm.booking_date)}
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

                {/* Goods, Pieces, & Rate Calculation */}
                <div className="form-grid-3">
                  <div className="form-group">
                    <label className="form-label">Pieces *</label>
                    <input
                      type="number"
                      min="1"
                      className="form-control"
                      value={orderForm.pieces}
                      onChange={(e) => handlePiecesChange(e.target.value)}
                      required
                      style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Rate / Piece (₹) *</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="form-control"
                      placeholder="e.g. 100"
                      value={orderForm.rate_per_piece}
                      onChange={(e) => handleRateChange(e.target.value)}
                      style={{ fontWeight: 800, fontSize: '1rem', color: '#047857' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <input
                      type="text"
                      className="form-control"
                      value={orderForm.description}
                      onChange={(e) => setOrderForm({ ...orderForm, description: e.target.value })}
                      placeholder="e.g. Textiles / Goods"
                    />
                  </div>
                </div>

                {/* Weight & Individual Box Weights & Amounts Section */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontWeight: 700, fontSize: '0.875rem', color: '#1e293b' }}>
                      <input
                        type="checkbox"
                        checked={orderForm.has_separate_boxes}
                        onChange={(e) => handleToggleSeparateBoxes(e.target.checked)}
                      />
                      <span>📦 Individual Boxes ({orderForm.pieces} {orderForm.pieces === 1 ? 'Box' : 'Boxes'})</span>
                    </label>

                    {orderForm.has_separate_boxes ? (
                      <button
                        type="button"
                        onClick={handleAddBox}
                        className="btn btn-outline btn-xs"
                        style={{ padding: '3px 8px', fontSize: '0.75rem', gap: '4px', background: '#fff', borderColor: '#cbd5e1' }}
                      >
                        <Plus size={12} />
                        <span>Add Box</span>
                      </button>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Total Weight:</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          className="form-control"
                          style={{ width: '90px', padding: '4px 8px', height: '32px', textAlign: 'right', fontWeight: 700 }}
                          value={orderForm.weight_kg}
                          onChange={(e) => setOrderForm({ ...orderForm, weight_kg: e.target.value })}
                        />
                        <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>KG</span>
                      </div>
                    )}
                  </div>

                  {orderForm.has_separate_boxes && (
                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '10px', maxHeight: '190px', overflowY: 'auto', padding: '2px' }}>
                        {(orderForm.box_items || []).map((box, idx) => (
                          <div key={idx} style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 10px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>
                                📦 #{idx + 1}
                              </span>
                              {(orderForm.box_items || []).length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveBox(idx)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px 4px', display: 'flex', alignItems: 'center' }}
                                  title="Remove box"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '2px 6px' }}>
                                <span style={{ fontSize: '0.8rem', color: '#64748b', marginRight: '4px' }} title="Weight (kg)">⚖️</span>
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  placeholder="0.0"
                                  className="form-control"
                                  style={{ border: 'none', background: 'transparent', padding: '2px 0', height: '28px', fontSize: '0.85rem', textAlign: 'right', fontWeight: 700 }}
                                  value={box.weight}
                                  onChange={(e) => handleBoxWeightChange(idx, e.target.value)}
                                />
                                <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: '3px', fontWeight: 600 }}>kg</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '2px 6px' }}>
                                <span style={{ fontSize: '0.85rem', color: '#047857', fontWeight: 800, marginRight: '4px' }} title="Amount (₹)">₹</span>
                                <input
                                  type="number"
                                  step="1"
                                  min="0"
                                  placeholder="0"
                                  className="form-control"
                                  style={{ border: 'none', background: 'transparent', padding: '2px 0', height: '28px', fontSize: '0.85rem', textAlign: 'right', fontWeight: 700, color: '#047857' }}
                                  value={box.amount}
                                  onChange={(e) => handleBoxAmountChange(idx, e.target.value)}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1', fontSize: '0.825rem' }}>
                        <span style={{ color: '#64748b', fontSize: '0.785rem' }}>
                          <strong>{orderForm.box_items?.length || 0}</strong> boxes
                        </span>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <span style={{ fontWeight: 800, color: '#0f172a', background: '#e2e8f0', padding: '3px 10px', borderRadius: '4px' }}>
                            📦 Total: {orderForm.weight_kg || 0} kg
                          </span>
                          <span style={{ fontWeight: 800, color: '#047857', background: '#dcfce7', border: '1px solid #86efac', padding: '3px 10px', borderRadius: '4px' }}>
                            💰 Freight: ₹{orderForm.freight_amount || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-grid-3">
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

                <div className="form-grid-3">
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label className="form-label" style={{ margin: 0 }}>Freight (₹) *</label>
                      {parseFloat(orderForm.rate_per_piece) > 0 && (
                        <span style={{ fontSize: '0.7rem', color: '#047857', fontWeight: 700 }}>
                          ({orderForm.pieces} × ₹{orderForm.rate_per_piece})
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      value={orderForm.freight_amount}
                      onChange={(e) => handleFreightAmountChange(e.target.value)}
                      required
                      style={{ fontWeight: 700 }}
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
                    <div style={{
                      background: '#f0fdf4',
                      border: '1.5px solid #86efac',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      minHeight: '40px'
                    }}>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#15803d', lineHeight: 1.1 }}>
                        ₹{calculatedTotal.toFixed(2)}
                      </div>
                      <span style={{ fontSize: '0.675rem', color: '#166534', marginTop: '2px' }}>
                        ₹{parseFloat(orderForm.freight_amount) || 0} + ₹{parseFloat(orderForm.other_charges) || 0} charges
                      </span>
                    </div>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Assign Vehicle</label>
                    <select
                      className="form-control"
                      value={orderForm.vehicle_id || ''}
                      onChange={(e) => handleSelectVehicle(e.target.value)}
                    >
                      <option value="">-- Select Vehicle --</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.vehicle_no} — {v.vehicle_type} ({v.capacity || 'Active'})
                        </option>
                      ))}
                    </select>
                    {orderForm.vehicle_no && (
                      <span style={{ fontSize: '0.725rem', color: '#059669', marginTop: '3px', display: 'block', fontWeight: 600 }}>
                        ✓ Selected Vehicle: {orderForm.vehicle_no}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Assign Driver</label>
                    <select
                      className="form-control"
                      value={orderForm.driver_id || ''}
                      onChange={(e) => setOrderForm({ ...orderForm, driver_id: e.target.value })}
                    >
                      <option value="">-- Select Driver --</option>
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
          <div className="modal-box" style={{ maxWidth: 960, width: 'min(96vw, 960px)' }} onClick={(e) => e.stopPropagation()}>
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
                <div className="form-grid-2">
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

                <div className="form-grid-2">
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
                    <label className="form-label">Sender Phone</label>
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

                <div className="form-grid-2">
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
                    <label className="form-label">Receiver Phone</label>
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

                <div className="form-grid-2">
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

                {/* Goods, Pieces, & Rate Calculation */}
                <div className="form-grid-3">
                  <div className="form-group">
                    <label className="form-label">Pieces *</label>
                    <input
                      type="number"
                      min="1"
                      className="form-control"
                      value={editForm.pieces}
                      onChange={(e) => handleEditPiecesChange(e.target.value)}
                      required
                      style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Rate / Piece (₹) *</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="form-control"
                      placeholder="e.g. 100"
                      value={editForm.rate_per_piece}
                      onChange={(e) => handleEditRateChange(e.target.value)}
                      style={{ fontWeight: 800, fontSize: '1rem', color: '#047857' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      placeholder="e.g. Goods"
                    />
                  </div>
                </div>

                {/* Weight & Individual Box Weights & Amounts Section */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontWeight: 700, fontSize: '0.875rem', color: '#1e293b' }}>
                      <input
                        type="checkbox"
                        checked={editForm.has_separate_boxes}
                        onChange={(e) => handleEditToggleSeparateBoxes(e.target.checked)}
                      />
                      <span>📦 Individual Boxes ({editForm.pieces} {editForm.pieces === 1 ? 'Box' : 'Boxes'})</span>
                    </label>

                    {editForm.has_separate_boxes ? (
                      <button
                        type="button"
                        onClick={handleEditAddBox}
                        className="btn btn-outline btn-xs"
                        style={{ padding: '3px 8px', fontSize: '0.75rem', gap: '4px', background: '#fff', borderColor: '#cbd5e1' }}
                      >
                        <Plus size={12} />
                        <span>Add Box</span>
                      </button>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Total Weight:</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          className="form-control"
                          style={{ width: '90px', padding: '4px 8px', height: '32px', textAlign: 'right', fontWeight: 700 }}
                          value={editForm.weight_kg}
                          onChange={(e) => setEditForm({ ...editForm, weight_kg: e.target.value })}
                        />
                        <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>KG</span>
                      </div>
                    )}
                  </div>

                  {editForm.has_separate_boxes && (
                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '10px', maxHeight: '190px', overflowY: 'auto', padding: '2px' }}>
                        {(editForm.box_items || []).map((box, idx) => (
                          <div key={idx} style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 10px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>
                                📦 #{idx + 1}
                              </span>
                              {(editForm.box_items || []).length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleEditRemoveBox(idx)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px 4px', display: 'flex', alignItems: 'center' }}
                                  title="Remove box"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '2px 6px' }}>
                                <span style={{ fontSize: '0.8rem', color: '#64748b', marginRight: '4px' }} title="Weight (kg)">⚖️</span>
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  placeholder="0.0"
                                  className="form-control"
                                  style={{ border: 'none', background: 'transparent', padding: '2px 0', height: '28px', fontSize: '0.85rem', textAlign: 'right', fontWeight: 700 }}
                                  value={box.weight}
                                  onChange={(e) => handleEditBoxWeightChange(idx, e.target.value)}
                                />
                                <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: '3px', fontWeight: 600 }}>kg</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '2px 6px' }}>
                                <span style={{ fontSize: '0.85rem', color: '#047857', fontWeight: 800, marginRight: '4px' }} title="Amount (₹)">₹</span>
                                <input
                                  type="number"
                                  step="1"
                                  min="0"
                                  placeholder="0"
                                  className="form-control"
                                  style={{ border: 'none', background: 'transparent', padding: '2px 0', height: '28px', fontSize: '0.85rem', textAlign: 'right', fontWeight: 700, color: '#047857' }}
                                  value={box.amount}
                                  onChange={(e) => handleEditBoxAmountChange(idx, e.target.value)}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1', fontSize: '0.825rem' }}>
                        <span style={{ color: '#64748b', fontSize: '0.785rem' }}>
                          <strong>{editForm.box_items?.length || 0}</strong> boxes
                        </span>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <span style={{ fontWeight: 800, color: '#0f172a', background: '#e2e8f0', padding: '3px 10px', borderRadius: '4px' }}>
                            📦 Total: {editForm.weight_kg || 0} kg
                          </span>
                          <span style={{ fontWeight: 800, color: '#047857', background: '#dcfce7', border: '1px solid #86efac', padding: '3px 10px', borderRadius: '4px' }}>
                            💰 Freight: ₹{editForm.freight_amount || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-grid-3">
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

                <div className="form-grid-3">
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label className="form-label" style={{ margin: 0 }}>Freight (₹) *</label>
                      {parseFloat(editForm.rate_per_piece) > 0 && (
                        <span style={{ fontSize: '0.7rem', color: '#047857', fontWeight: 700 }}>
                          ({editForm.pieces} × ₹{editForm.rate_per_piece})
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      value={editForm.freight_amount}
                      onChange={(e) => handleEditFreightAmountChange(e.target.value)}
                      required
                      style={{ fontWeight: 700 }}
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
                    <div style={{
                      background: '#f0fdf4',
                      border: '1.5px solid #86efac',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      minHeight: '40px'
                    }}>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#15803d', lineHeight: 1.1 }}>
                        ₹{((parseFloat(editForm.freight_amount) || 0) + (parseFloat(editForm.other_charges) || 0)).toFixed(2)}
                      </div>
                      <span style={{ fontSize: '0.675rem', color: '#166534', marginTop: '2px' }}>
                        ₹{parseFloat(editForm.freight_amount) || 0} + ₹{parseFloat(editForm.other_charges) || 0} charges
                      </span>
                    </div>
                  </div>
                </div>

                <div className="form-grid-3">
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
                    <label className="form-label">Assign Vehicle</label>
                    <select
                      className="form-control"
                      value={editForm.vehicle_id || ''}
                      onChange={(e) => handleSelectEditVehicle(e.target.value)}
                    >
                      <option value="">-- Select Vehicle --</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.vehicle_no} — {v.vehicle_type} ({v.capacity || 'Active'})
                        </option>
                      ))}
                    </select>
                    {editForm.vehicle_no && (
                      <span style={{ fontSize: '0.72rem', color: '#0284c7', marginTop: '3px', display: 'block', fontWeight: 600 }}>
                        ✓ Vehicle: {editForm.vehicle_no}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Assign Driver</label>
                    <select
                      className="form-control"
                      value={editForm.driver_id || ''}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ fontWeight: 700, color: 'var(--primary-dark)' }}>
                  {selectedOrder.from_station} ➔ {selectedOrder.to_station}
                </div>
                {getStatusBadge(selectedOrder.delivery_status)}
              </div>

              {(selectedOrder.vehicle_no || selectedOrder.driver_vehicle) && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: 34, height: 34, borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Truck size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 800, fontFamily: 'monospace', color: '#0f172a' }}>
                        {selectedOrder.vehicle_no || selectedOrder.driver_vehicle}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {selectedOrder.vehicle_type || 'Transport Fleet'} {selectedOrder.driver_name ? `• Driver: ${selectedOrder.driver_name}` : ''}
                      </div>
                    </div>
                  </div>
                  {selectedOrder.driver_phone && (
                    <a href={`tel:${selectedOrder.driver_phone}`} className="btn btn-outline btn-xs" style={{ gap: '4px', color: '#0284c7', borderColor: '#bae6fd' }}>
                      <Phone size={12} />
                      <span>Call Driver</span>
                    </a>
                  )}
                </div>
              )}

              {/* Consignment Packages & Pricing Details */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Packages & Weight</span>
                    <strong style={{ color: '#0f172a' }}>{selectedOrder.pieces} Pcs ({selectedOrder.weight_kg} Kg)</strong>
                    <div style={{ fontSize: '0.75rem', color: '#475569' }}>{selectedOrder.description || 'Goods'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>Freight & Billing</span>
                    <strong style={{ color: '#15803d', fontSize: '1rem' }}>₹{Number(selectedOrder.total_amount).toLocaleString()}</strong>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {selectedOrder.payment_mode} • {selectedOrder.payment_status}
                    </div>
                  </div>
                </div>

                {parseFloat(selectedOrder.rate_per_piece) > 0 && (
                  <div style={{ fontSize: '0.725rem', color: '#047857', marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed #e2e8f0' }}>
                    Rate: ₹{selectedOrder.rate_per_piece}/pc × {selectedOrder.pieces} pcs = ₹{selectedOrder.freight_amount} {parseFloat(selectedOrder.other_charges) > 0 ? `+ ₹${selectedOrder.other_charges} other charges` : ''}
                  </div>
                )}

                {selectedOrder.box_details && (() => {
                  try {
                    const boxes = typeof selectedOrder.box_details === 'string' ? JSON.parse(selectedOrder.box_details) : selectedOrder.box_details;
                    if (Array.isArray(boxes) && boxes.length > 0) {
                      return (
                        <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px dashed #e2e8f0' }}>
                          <span style={{ fontSize: '0.725rem', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                            Individual Box Details ({boxes.length} boxes):
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {boxes.map((b, i) => (
                              <span key={i} style={{ fontSize: '0.725rem', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '3px 8px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <span>Box #{i + 1}: {b.weight} kg</span>
                                {parseFloat(b.amount) > 0 && <span style={{ color: '#047857', background: '#dcfce7', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>₹{b.amount}</span>}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    }
                  } catch (e) {}
                  return null;
                })()}
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
        primaryButtonText={successModalData?.orderToPrint ? 'Print A4 Bill' : 'OK'}
        onPrimaryClick={() => {
          if (successModalData?.orderToPrint) {
            handlePrintLR(successModalData.orderToPrint);
          }
          setSuccessModalData(null);
        }}
        secondaryButtonText={successModalData?.orderToPrint ? 'Bluetooth Slip 📱' : null}
        onSecondaryClick={() => {
          if (successModalData?.orderToPrint) {
            handlePrintThermalReceipt(successModalData.orderToPrint);
          }
          setSuccessModalData(null);
        }}
      />
    </div>
  );
};

export default OrdersView;
