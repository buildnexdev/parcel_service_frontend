import React, { useState, useEffect } from 'react';
import { api } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import SuccessModal from '../Common/SuccessModal';
import { 
  Package, Search, Plus, CreditCard, Eye, Printer, 
  CheckCircle2, Clock, Truck, X, PlusCircle, AlertCircle, Phone, Edit, Trash2,
  RotateCw, Sparkles, ShieldAlert
} from 'lucide-react';

export const PACKAGE_TYPES = [
  { value: 'Box', label: 'Box / Carton', icon: '📦' },
  { value: 'Bag', label: 'Gunny Bag / Plastic Bag', icon: '🎒' },
  { value: 'Bundle', label: 'Cloth / Goods Bundle', icon: '🪢' },
  { value: 'Carton', label: 'Carton Box', icon: '📦' },
  { value: 'Cover', label: 'Cover / Document Envelope', icon: '✉️' },
  { value: 'Roll', label: 'Roll / Drum / Bale', icon: '🪵' },
  { value: 'Pcs', label: 'General Piece / Item', icon: '📦' }
];

export const parsePackageDenominations = (boxDetails) => {
  if (!boxDetails) return [];
  try {
    const parsed = typeof boxDetails === 'string' ? JSON.parse(boxDetails) : boxDetails;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((b, i) => {
      const p = parseInt(b.pieces, 10) || 1;
      const tw = b.total_weight !== undefined && b.total_weight !== ''
        ? parseFloat(b.total_weight)
        : (parseFloat(b.weight) || 0);
      const wp = b.weight_per_piece !== undefined && b.weight_per_piece !== ''
        ? parseFloat(b.weight_per_piece)
        : (p > 0 && tw > 0 ? parseFloat((tw / p).toFixed(2)) : tw);
      const ta = b.total_amount !== undefined && b.total_amount !== ''
        ? parseFloat(b.total_amount)
        : (parseFloat(b.amount) || 0);
      const rp = b.rate_per_piece !== undefined && b.rate_per_piece !== ''
        ? parseFloat(b.rate_per_piece)
        : (p > 0 && ta > 0 ? parseFloat((ta / p).toFixed(2)) : ta);
      return {
        box_no: b.box_no || i + 1,
        package_type: b.package_type || 'Box',
        pieces: p,
        weight_per_piece: wp > 0 ? wp : '',
        total_weight: tw > 0 ? tw : '',
        weight: tw > 0 ? tw : '',
        rate_per_piece: rp > 0 ? rp : '',
        total_amount: ta > 0 ? ta : '',
        amount: ta > 0 ? ta : ''
      };
    });
  } catch (e) {
    return [];
  }
};

const OrdersView = ({ defaultOpenNew = false }) => {
  const { hasPermission } = useAuth();
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
  const [deleteConfirmOrder, setDeleteConfirmOrder] = useState(null);
  const [deletingOrder, setDeletingOrder] = useState(false);
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
    box_items: [{ box_no: 1, package_type: 'Box', pieces: 1, weight_per_piece: '', total_weight: '', weight: '', rate_per_piece: 100, total_amount: 100, amount: 100 }],
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
    box_items: [{ box_no: 1, package_type: 'Box', pieces: 1, weight_per_piece: '', total_weight: '', weight: '', rate_per_piece: 100, total_amount: 100, amount: 100 }],
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
    if (!hasPermission('orders', 'add')) {
      showToast('You do not have permission to create new orders.', 'error');
      return;
    }
    const station = orderForm.from_station || 'Karaikal';
    const date = orderForm.booking_date || new Date().toISOString().split('T')[0];
    const nextLr = await fetchNextWaybill(station, date);
    setOrderForm(prev => ({
      ...prev,
      lr_number: nextLr || prev.lr_number
    }));
    setIsNewOrderOpen(true);
  };

  const handleConfirmDeleteOrder = async () => {
    if (!deleteConfirmOrder) return;
    if (!hasPermission('orders', 'delete')) {
      showToast('You do not have permission to delete orders.', 'error');
      return;
    }
    setDeletingOrder(true);
    try {
      await api.deleteOrder(deleteConfirmOrder.id);
      showToast(`Parcel LR #${deleteConfirmOrder.lr_number} deleted successfully!`, 'success');
      setDeleteConfirmOrder(null);
      loadOrders();
    } catch (err) {
      console.error('Delete order error:', err);
      showToast(err.message || 'Failed to delete order', 'error');
    } finally {
      setDeletingOrder(false);
    }
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
      if (prev.has_separate_boxes && newBoxes.length === 1) {
        newBoxes = newBoxes.map(b => {
          const wp = parseFloat(b.weight_per_piece) || 0;
          const rp = parseFloat(b.rate_per_piece) || rate;
          const tw = wp > 0 ? parseFloat((p * wp).toFixed(2)) : b.total_weight;
          const ta = rp > 0 ? parseFloat((p * rp).toFixed(2)) : b.total_amount;
          return {
            ...b,
            pieces: p,
            total_weight: tw,
            weight: tw,
            total_amount: ta,
            amount: ta
          };
        });
      }
      const sumBoxAmounts = prev.has_separate_boxes ? newBoxes.reduce((acc, b) => acc + (parseFloat(b.total_amount || b.amount) || 0), 0) : 0;
      const sumBoxWeights = prev.has_separate_boxes ? newBoxes.reduce((acc, b) => acc + (parseFloat(b.total_weight || b.weight) || 0), 0) : prev.weight_kg;
      const newFreight = prev.has_separate_boxes && sumBoxAmounts > 0 ? sumBoxAmounts : (rate > 0 ? p * rate : prev.freight_amount);

      return {
        ...prev,
        pieces: p,
        freight_amount: newFreight,
        box_items: newBoxes,
        weight_kg: prev.has_separate_boxes && sumBoxWeights > 0 ? parseFloat(sumBoxWeights.toFixed(2)) : prev.weight_kg
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
        newBoxes = newBoxes.map(b => {
          const bp = parseInt(b.pieces, 10) || 1;
          const isDefaultRate = b.rate_per_piece === '' || parseFloat(b.rate_per_piece) === parseFloat(prev.rate_per_piece);
          const newRp = isDefaultRate ? numRate : b.rate_per_piece;
          const newTa = isDefaultRate ? parseFloat((bp * numRate).toFixed(2)) : b.total_amount;
          return {
            ...b,
            rate_per_piece: newRp,
            total_amount: newTa,
            amount: newTa
          };
        });
      }
      const hasBoxAmounts = prev.has_separate_boxes && newBoxes.some(b => parseFloat(b.total_amount || b.amount) > 0);
      const sumBoxAmounts = hasBoxAmounts ? newBoxes.reduce((acc, b) => acc + (parseFloat(b.total_amount || b.amount) || 0), 0) : 0;
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
      const totalW = parseFloat(prev.weight_kg) || 0;
      const freight = parseFloat(prev.freight_amount) || (rate > 0 ? p * rate : 0);
      let items = prev.box_items || [];

      if (checked) {
        if (!items || items.length === 0 || (items.length === 1 && !items[0].total_weight && !items[0].total_amount)) {
          const unitW = (p > 0 && totalW > 0) ? parseFloat((totalW / p).toFixed(2)) : '';
          const unitRate = (p > 0 && freight > 0) ? parseFloat((freight / p).toFixed(2)) : (rate > 0 ? rate : '');
          items = [{
            box_no: 1,
            package_type: 'Box',
            pieces: p,
            weight_per_piece: unitW,
            total_weight: totalW > 0 ? totalW : '',
            weight: totalW > 0 ? totalW : '',
            rate_per_piece: unitRate,
            total_amount: freight > 0 ? freight : '',
            amount: freight > 0 ? freight : ''
          }];
        }
        const sumPcs = items.reduce((acc, b) => acc + (parseInt(b.pieces, 10) || 0), 0);
        const sumW = items.reduce((acc, b) => acc + (parseFloat(b.total_weight || b.weight) || 0), 0);
        const sumAmt = items.reduce((acc, b) => acc + (parseFloat(b.total_amount || b.amount) || 0), 0);
        return {
          ...prev,
          has_separate_boxes: true,
          box_items: items,
          pieces: sumPcs > 0 ? sumPcs : prev.pieces,
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

  const handleBoxFieldChange = (index, field, value) => {
    setOrderForm(prev => {
      const updated = prev.box_items.map((b, i) => {
        if (i !== index) return b;
        const item = { ...b, [field]: value };
        const p = parseInt(field === 'pieces' ? value : item.pieces, 10) || 1;
        item.pieces = Math.max(1, p);

        if (field === 'weight_per_piece') {
          const wp = value === '' ? '' : Math.max(0, parseFloat(value) || 0);
          item.weight_per_piece = wp;
          item.total_weight = wp !== '' ? parseFloat((item.pieces * wp).toFixed(2)) : '';
          item.weight = item.total_weight;
        } else if (field === 'total_weight' || field === 'weight') {
          const tw = value === '' ? '' : Math.max(0, parseFloat(value) || 0);
          item.total_weight = tw;
          item.weight = tw;
          item.weight_per_piece = (tw !== '' && item.pieces > 0) ? parseFloat((tw / item.pieces).toFixed(2)) : '';
        } else if (field === 'pieces') {
          if (item.weight_per_piece !== '') {
            item.total_weight = parseFloat((item.pieces * (parseFloat(item.weight_per_piece) || 0)).toFixed(2));
            item.weight = item.total_weight;
          }
          if (item.rate_per_piece !== '') {
            item.total_amount = parseFloat((item.pieces * (parseFloat(item.rate_per_piece) || 0)).toFixed(2));
            item.amount = item.total_amount;
          }
        } else if (field === 'rate_per_piece') {
          const rp = value === '' ? '' : Math.max(0, parseFloat(value) || 0);
          item.rate_per_piece = rp;
          item.total_amount = rp !== '' ? parseFloat((item.pieces * rp).toFixed(2)) : '';
          item.amount = item.total_amount;
        } else if (field === 'total_amount' || field === 'amount') {
          const ta = value === '' ? '' : Math.max(0, parseFloat(value) || 0);
          item.total_amount = ta;
          item.amount = ta;
          item.rate_per_piece = (ta !== '' && item.pieces > 0) ? parseFloat((ta / item.pieces).toFixed(2)) : '';
        }
        return item;
      });

      const sumPcs = updated.reduce((acc, b) => acc + (parseInt(b.pieces, 10) || 0), 0);
      const sumW = updated.reduce((acc, b) => acc + (parseFloat(b.total_weight || b.weight) || 0), 0);
      const sumAmt = updated.reduce((acc, b) => acc + (parseFloat(b.total_amount || b.amount) || 0), 0);
      const derivedRate = sumPcs > 0 && sumAmt > 0 ? parseFloat((sumAmt / sumPcs).toFixed(2)) : prev.rate_per_piece;

      return {
        ...prev,
        box_items: updated,
        pieces: sumPcs > 0 ? sumPcs : prev.pieces,
        weight_kg: parseFloat(sumW.toFixed(2)),
        freight_amount: sumAmt > 0 ? parseFloat(sumAmt.toFixed(2)) : prev.freight_amount,
        rate_per_piece: derivedRate > 0 ? derivedRate : prev.rate_per_piece
      };
    });
  };

  const handleBoxWeightChange = (index, val) => handleBoxFieldChange(index, 'total_weight', val);
  const handleBoxAmountChange = (index, val) => handleBoxFieldChange(index, 'total_amount', val);

  const handleAddBox = () => {
    setOrderForm(prev => {
      const rate = parseFloat(prev.rate_per_piece) || 0;
      const newItems = [
        ...(prev.box_items || []),
        {
          box_no: (prev.box_items?.length || 0) + 1,
          package_type: 'Box',
          pieces: 1,
          weight_per_piece: '',
          total_weight: '',
          weight: '',
          rate_per_piece: rate > 0 ? rate : '',
          total_amount: rate > 0 ? rate : '',
          amount: rate > 0 ? rate : ''
        }
      ];
      const sumPcs = newItems.reduce((acc, b) => acc + (parseInt(b.pieces, 10) || 0), 0);
      const sumW = newItems.reduce((acc, b) => acc + (parseFloat(b.total_weight || b.weight) || 0), 0);
      const sumAmt = newItems.reduce((acc, b) => acc + (parseFloat(b.total_amount || b.amount) || 0), 0);
      const derivedRate = sumPcs > 0 && sumAmt > 0 ? parseFloat((sumAmt / sumPcs).toFixed(2)) : prev.rate_per_piece;

      return {
        ...prev,
        pieces: sumPcs > 0 ? sumPcs : prev.pieces,
        box_items: newItems,
        weight_kg: parseFloat(sumW.toFixed(2)),
        freight_amount: sumAmt > 0 ? parseFloat(sumAmt.toFixed(2)) : prev.freight_amount,
        rate_per_piece: derivedRate > 0 ? derivedRate : prev.rate_per_piece
      };
    });
  };

  const handleRemoveBox = (index) => {
    setOrderForm(prev => {
      if ((prev.box_items?.length || 0) <= 1) return prev;
      const filtered = prev.box_items.filter((_, i) => i !== index).map((b, i) => ({ ...b, box_no: i + 1 }));
      const sumPcs = filtered.reduce((acc, b) => acc + (parseInt(b.pieces, 10) || 0), 0);
      const sumW = filtered.reduce((acc, b) => acc + (parseFloat(b.total_weight || b.weight) || 0), 0);
      const sumAmt = filtered.reduce((acc, b) => acc + (parseFloat(b.total_amount || b.amount) || 0), 0);
      const derivedRate = sumPcs > 0 && sumAmt > 0 ? parseFloat((sumAmt / sumPcs).toFixed(2)) : prev.rate_per_piece;

      return {
        ...prev,
        pieces: sumPcs > 0 ? sumPcs : prev.pieces,
        box_items: filtered,
        weight_kg: parseFloat(sumW.toFixed(2)),
        freight_amount: sumAmt > 0 ? parseFloat(sumAmt.toFixed(2)) : prev.freight_amount,
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
      if (prev.has_separate_boxes && newBoxes.length === 1) {
        newBoxes = newBoxes.map(b => {
          const wp = parseFloat(b.weight_per_piece) || 0;
          const rp = parseFloat(b.rate_per_piece) || rate;
          const tw = wp > 0 ? parseFloat((p * wp).toFixed(2)) : b.total_weight;
          const ta = rp > 0 ? parseFloat((p * rp).toFixed(2)) : b.total_amount;
          return {
            ...b,
            pieces: p,
            total_weight: tw,
            weight: tw,
            total_amount: ta,
            amount: ta
          };
        });
      }
      const sumBoxAmounts = prev.has_separate_boxes ? newBoxes.reduce((acc, b) => acc + (parseFloat(b.total_amount || b.amount) || 0), 0) : 0;
      const sumBoxWeights = prev.has_separate_boxes ? newBoxes.reduce((acc, b) => acc + (parseFloat(b.total_weight || b.weight) || 0), 0) : prev.weight_kg;
      const newFreight = prev.has_separate_boxes && sumBoxAmounts > 0 ? sumBoxAmounts : (rate > 0 ? p * rate : prev.freight_amount);

      return {
        ...prev,
        pieces: p,
        freight_amount: newFreight,
        box_items: newBoxes,
        weight_kg: prev.has_separate_boxes && sumBoxWeights > 0 ? parseFloat(sumBoxWeights.toFixed(2)) : prev.weight_kg
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
        newBoxes = newBoxes.map(b => {
          const bp = parseInt(b.pieces, 10) || 1;
          const isDefaultRate = b.rate_per_piece === '' || parseFloat(b.rate_per_piece) === parseFloat(prev.rate_per_piece);
          const newRp = isDefaultRate ? numRate : b.rate_per_piece;
          const newTa = isDefaultRate ? parseFloat((bp * numRate).toFixed(2)) : b.total_amount;
          return {
            ...b,
            rate_per_piece: newRp,
            total_amount: newTa,
            amount: newTa
          };
        });
      }
      const hasBoxAmounts = prev.has_separate_boxes && newBoxes.some(b => parseFloat(b.total_amount || b.amount) > 0);
      const sumBoxAmounts = hasBoxAmounts ? newBoxes.reduce((acc, b) => acc + (parseFloat(b.total_amount || b.amount) || 0), 0) : 0;
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
      const totalW = parseFloat(prev.weight_kg) || 0;
      const freight = parseFloat(prev.freight_amount) || (rate > 0 ? p * rate : 0);
      let items = prev.box_items || [];

      if (checked) {
        if (!items || items.length === 0 || (items.length === 1 && !items[0].total_weight && !items[0].total_amount)) {
          const unitW = (p > 0 && totalW > 0) ? parseFloat((totalW / p).toFixed(2)) : '';
          const unitRate = (p > 0 && freight > 0) ? parseFloat((freight / p).toFixed(2)) : (rate > 0 ? rate : '');
          items = [{
            box_no: 1,
            package_type: 'Box',
            pieces: p,
            weight_per_piece: unitW,
            total_weight: totalW > 0 ? totalW : '',
            weight: totalW > 0 ? totalW : '',
            rate_per_piece: unitRate,
            total_amount: freight > 0 ? freight : '',
            amount: freight > 0 ? freight : ''
          }];
        }
        const sumPcs = items.reduce((acc, b) => acc + (parseInt(b.pieces, 10) || 0), 0);
        const sumW = items.reduce((acc, b) => acc + (parseFloat(b.total_weight || b.weight) || 0), 0);
        const sumAmt = items.reduce((acc, b) => acc + (parseFloat(b.total_amount || b.amount) || 0), 0);
        return {
          ...prev,
          has_separate_boxes: true,
          box_items: items,
          pieces: sumPcs > 0 ? sumPcs : prev.pieces,
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

  const handleEditBoxFieldChange = (index, field, value) => {
    setEditForm(prev => {
      const updated = prev.box_items.map((b, i) => {
        if (i !== index) return b;
        const item = { ...b, [field]: value };
        const p = parseInt(field === 'pieces' ? value : item.pieces, 10) || 1;
        item.pieces = Math.max(1, p);

        if (field === 'weight_per_piece') {
          const wp = value === '' ? '' : Math.max(0, parseFloat(value) || 0);
          item.weight_per_piece = wp;
          item.total_weight = wp !== '' ? parseFloat((item.pieces * wp).toFixed(2)) : '';
          item.weight = item.total_weight;
        } else if (field === 'total_weight' || field === 'weight') {
          const tw = value === '' ? '' : Math.max(0, parseFloat(value) || 0);
          item.total_weight = tw;
          item.weight = tw;
          item.weight_per_piece = (tw !== '' && item.pieces > 0) ? parseFloat((tw / item.pieces).toFixed(2)) : '';
        } else if (field === 'pieces') {
          if (item.weight_per_piece !== '') {
            item.total_weight = parseFloat((item.pieces * (parseFloat(item.weight_per_piece) || 0)).toFixed(2));
            item.weight = item.total_weight;
          }
          if (item.rate_per_piece !== '') {
            item.total_amount = parseFloat((item.pieces * (parseFloat(item.rate_per_piece) || 0)).toFixed(2));
            item.amount = item.total_amount;
          }
        } else if (field === 'rate_per_piece') {
          const rp = value === '' ? '' : Math.max(0, parseFloat(value) || 0);
          item.rate_per_piece = rp;
          item.total_amount = rp !== '' ? parseFloat((item.pieces * rp).toFixed(2)) : '';
          item.amount = item.total_amount;
        } else if (field === 'total_amount' || field === 'amount') {
          const ta = value === '' ? '' : Math.max(0, parseFloat(value) || 0);
          item.total_amount = ta;
          item.amount = ta;
          item.rate_per_piece = (ta !== '' && item.pieces > 0) ? parseFloat((ta / item.pieces).toFixed(2)) : '';
        }
        return item;
      });

      const sumPcs = updated.reduce((acc, b) => acc + (parseInt(b.pieces, 10) || 0), 0);
      const sumW = updated.reduce((acc, b) => acc + (parseFloat(b.total_weight || b.weight) || 0), 0);
      const sumAmt = updated.reduce((acc, b) => acc + (parseFloat(b.total_amount || b.amount) || 0), 0);
      const derivedRate = sumPcs > 0 && sumAmt > 0 ? parseFloat((sumAmt / sumPcs).toFixed(2)) : prev.rate_per_piece;

      return {
        ...prev,
        box_items: updated,
        pieces: sumPcs > 0 ? sumPcs : prev.pieces,
        weight_kg: parseFloat(sumW.toFixed(2)),
        freight_amount: sumAmt > 0 ? parseFloat(sumAmt.toFixed(2)) : prev.freight_amount,
        rate_per_piece: derivedRate > 0 ? derivedRate : prev.rate_per_piece
      };
    });
  };

  const handleEditBoxWeightChange = (index, val) => handleEditBoxFieldChange(index, 'total_weight', val);
  const handleEditBoxAmountChange = (index, val) => handleEditBoxFieldChange(index, 'total_amount', val);

  const handleEditAddBox = () => {
    setEditForm(prev => {
      const rate = parseFloat(prev.rate_per_piece) || 0;
      const newItems = [
        ...(prev.box_items || []),
        {
          box_no: (prev.box_items?.length || 0) + 1,
          package_type: 'Box',
          pieces: 1,
          weight_per_piece: '',
          total_weight: '',
          weight: '',
          rate_per_piece: rate > 0 ? rate : '',
          total_amount: rate > 0 ? rate : '',
          amount: rate > 0 ? rate : ''
        }
      ];
      const sumPcs = newItems.reduce((acc, b) => acc + (parseInt(b.pieces, 10) || 0), 0);
      const sumW = newItems.reduce((acc, b) => acc + (parseFloat(b.total_weight || b.weight) || 0), 0);
      const sumAmt = newItems.reduce((acc, b) => acc + (parseFloat(b.total_amount || b.amount) || 0), 0);
      const derivedRate = sumPcs > 0 && sumAmt > 0 ? parseFloat((sumAmt / sumPcs).toFixed(2)) : prev.rate_per_piece;

      return {
        ...prev,
        pieces: sumPcs > 0 ? sumPcs : prev.pieces,
        box_items: newItems,
        weight_kg: parseFloat(sumW.toFixed(2)),
        freight_amount: sumAmt > 0 ? parseFloat(sumAmt.toFixed(2)) : prev.freight_amount,
        rate_per_piece: derivedRate > 0 ? derivedRate : prev.rate_per_piece
      };
    });
  };

  const handleEditRemoveBox = (index) => {
    setEditForm(prev => {
      if ((prev.box_items?.length || 0) <= 1) return prev;
      const filtered = prev.box_items.filter((_, i) => i !== index).map((b, i) => ({ ...b, box_no: i + 1 }));
      const sumPcs = filtered.reduce((acc, b) => acc + (parseInt(b.pieces, 10) || 0), 0);
      const sumW = filtered.reduce((acc, b) => acc + (parseFloat(b.total_weight || b.weight) || 0), 0);
      const sumAmt = filtered.reduce((acc, b) => acc + (parseFloat(b.total_amount || b.amount) || 0), 0);
      const derivedRate = sumPcs > 0 && sumAmt > 0 ? parseFloat((sumAmt / sumPcs).toFixed(2)) : prev.rate_per_piece;

      return {
        ...prev,
        pieces: sumPcs > 0 ? sumPcs : prev.pieces,
        box_items: filtered,
        weight_kg: parseFloat(sumW.toFixed(2)),
        freight_amount: sumAmt > 0 ? parseFloat(sumAmt.toFixed(2)) : prev.freight_amount,
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
      showToast(res.message || `Payment updated for Parcel LR #${selectedOrder.lr_number} successfully!`, 'success');
      setIsPaymentModalOpen(false);
      loadOrders();
      setSuccessModalData({
        title: 'Parcel Payment Updated!',
        message: `Payment update confirmed for Parcel LR #${selectedOrder.lr_number}.`,
        details: {
          'Parcel LR Number': `#${selectedOrder.lr_number}`,
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
    setStatusNote(`Parcel marked as ${newStatus}`);
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
      showToast(res.message || `Parcel LR #${order.lr_number} status updated to ${newStatus}!`, 'success');
      setStatusChangeDialog(null);
      loadOrders();
      setSuccessModalData({
        title: `Parcel Status: ${newStatus}`,
        message: `Delivery status for Parcel LR #${order.lr_number} has been updated.`,
        details: {
          'Parcel LR Number': `#${order.lr_number}`,
          'New Delivery Status': newStatus,
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
        ? orderForm.box_items.map((b, i) => {
            const p = parseInt(b.pieces, 10) || 1;
            const tw = parseFloat(b.total_weight !== undefined && b.total_weight !== '' ? b.total_weight : b.weight) || 0;
            const wp = parseFloat(b.weight_per_piece) || (p > 0 && tw > 0 ? parseFloat((tw / p).toFixed(2)) : tw);
            const ta = parseFloat(b.total_amount !== undefined && b.total_amount !== '' ? b.total_amount : b.amount) || 0;
            const rp = parseFloat(b.rate_per_piece) || (p > 0 && ta > 0 ? parseFloat((ta / p).toFixed(2)) : ta);
            return {
              box_no: i + 1,
              package_type: b.package_type || 'Box',
              pieces: p,
              weight_per_piece: wp > 0 ? wp : 0,
              total_weight: tw > 0 ? tw : 0,
              weight: tw > 0 ? tw : 0,
              rate_per_piece: rp > 0 ? rp : 0,
              total_amount: ta > 0 ? ta : 0,
              amount: ta > 0 ? ta : 0
            };
          })
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
      const created = res.order;
      showToast(res.message || `Parcel LR #${created?.lr_number || ''} booked successfully!`, 'success');
      setIsNewOrderOpen(false);
      loadOrders();

      if (created) {
        setSuccessModalData({
          title: 'Parcel Booked Successfully!',
          message: `Parcel LR #${created.lr_number} has been generated and booked into the system.`,
          details: {
            'Parcel LR Number': `#${created.lr_number}`,
            'Route': `${created.from_station} ➔ ${created.to_station}`,
            'Sender': `${created.sender_name} (${created.sender_phone || 'N/A'})`,
            'Receiver': `${created.receiver_name} (${created.receiver_phone || 'N/A'})`,
            'Parcel Cargo': `${created.pieces} Pcs / ${created.weight_kg} Kg`,
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
      const parsed = parsePackageDenominations(order.box_details);
      if (parsed.length > 0) {
        initialBoxes = parsed;
        hasBoxes = true;
      }
    }
    if (!hasBoxes) {
      initialBoxes = [{
        box_no: 1,
        package_type: 'Box',
        pieces: pcs,
        weight_per_piece: (pcs > 0 && (order.weight_kg || 0) > 0) ? parseFloat(((order.weight_kg || 0) / pcs).toFixed(2)) : (order.weight_kg || ''),
        total_weight: order.weight_kg || '',
        weight: order.weight_kg || '',
        rate_per_piece: rate > 0 ? rate : '',
        total_amount: order.freight_amount || '',
        amount: order.freight_amount || ''
      }];
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
        ? editForm.box_items.map((b, i) => {
            const p = parseInt(b.pieces, 10) || 1;
            const tw = parseFloat(b.total_weight !== undefined && b.total_weight !== '' ? b.total_weight : b.weight) || 0;
            const wp = parseFloat(b.weight_per_piece) || (p > 0 && tw > 0 ? parseFloat((tw / p).toFixed(2)) : tw);
            const ta = parseFloat(b.total_amount !== undefined && b.total_amount !== '' ? b.total_amount : b.amount) || 0;
            const rp = parseFloat(b.rate_per_piece) || (p > 0 && ta > 0 ? parseFloat((ta / p).toFixed(2)) : ta);
            return {
              box_no: i + 1,
              package_type: b.package_type || 'Box',
              pieces: p,
              weight_per_piece: wp > 0 ? wp : 0,
              total_weight: tw > 0 ? tw : 0,
              weight: tw > 0 ? tw : 0,
              rate_per_piece: rp > 0 ? rp : 0,
              total_amount: ta > 0 ? ta : 0,
              amount: ta > 0 ? ta : 0
            };
          })
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
      const parsed = parsePackageDenominations(order.box_details);
      if (parsed.length > 0) {
        hasCustomBoxRates = parsed.some(b => parseFloat(b.total_amount || b.amount) > 0);
        boxSummary = parsed.map((b, i) => `${b.pieces}× ${b.package_type || 'Box'} (${b.weight_per_piece ? `${b.weight_per_piece}kg ea` : `${b.total_weight || b.weight}kg`}${parseFloat(b.total_amount || b.amount) > 0 ? `, ₹${b.total_amount || b.amount}` : ''})`).join(' | ');
      }
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
    showToast(`🖨️ Parcel LR #${order.lr_number} Waybill sent to printer successfully!`, 'success');
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
      const parsed = parsePackageDenominations(order.box_details);
      if (parsed.length > 0) {
        boxSummary = parsed.map((b, i) => `${b.pieces}x${b.package_type || 'Box'}(${b.weight_per_piece ? `${b.weight_per_piece}kg` : `${b.total_weight || b.weight}kg`}${parseFloat(b.total_amount || b.amount) > 0 ? `@₹${b.rate_per_piece || (b.total_amount / b.pieces).toFixed(0)}` : ''})`).join(', ');
      }
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
          <div>*** THANK YOU - VISIT AGAIN ***</div>
          <div style="margin-top: 20px; border-top: 1px solid #000; padding-top: 3px; display: flex; justify-content: space-between; font-size: 8.5px;">
            <span>Customer Sign</span>
            <span>Driver Sign</span>
          </div>
        </div>
      </div>
    `;

    document.body.classList.add('printing-order-lr');
    window.print();
    showToast(`📱 Parcel LR #${order.lr_number} Bluetooth Thermal Slip sent to printer!`, 'success');
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
      'UNDELIVERED': 'badge-undelivered',
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
              <option value="UNDELIVERED">Undelivered</option>
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

            {hasPermission('orders', 'add') && (
              <button className="btn btn-accent" onClick={handleOpenNewOrder} style={{ whiteSpace: 'nowrap' }}>
                <Plus size={18} />
                <span>Add Order</span>
              </button>
            )}
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
                      <div style={{ fontSize: '0.775rem', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                        📦 {o.pieces} Pcs {o.weight_kg > 0 ? `• ⚖️ ${o.weight_kg} kg` : ''}
                      </div>

                      {/* Package Denomination Breakdown */}
                      {(() => {
                        const denoms = parsePackageDenominations(o.box_details);
                        if (denoms.length > 0) {
                          return (
                            <div style={{ marginTop: '5px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <div style={{ fontSize: '0.675rem', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Denomination:
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {denoms.map((d, i) => (
                                  <span key={i} style={{
                                    fontSize: '0.685rem',
                                    background: '#f0f9ff',
                                    color: '#0369a1',
                                    border: '1px solid #bae6fd',
                                    borderRadius: '4px',
                                    padding: '2px 6px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    lineHeight: 1.2
                                  }}>
                                    <strong style={{ color: '#0f172a' }}>{d.pieces}× {d.package_type || 'Box'}</strong>
                                    <span style={{ color: '#475569' }}>
                                      ({d.weight_per_piece ? `${d.weight_per_piece}kg` : (d.total_weight ? `${d.total_weight}kg` : '')}{d.rate_per_piece ? ` • ₹${d.rate_per_piece}` : ''})
                                    </span>
                                    {parseFloat(d.total_amount) > 0 && (
                                      <span style={{ color: '#047857', fontWeight: 700 }}>= ₹{d.total_amount}</span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div style={{
                            marginTop: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.7rem',
                            background: '#f8fafc',
                            color: '#475569',
                            border: '1px solid #e2e8f0',
                            borderRadius: '4px',
                            padding: '2px 6px'
                          }}>
                            <span>⚖️ {o.pieces > 0 && o.weight_kg > 0 ? `${(o.weight_kg / o.pieces).toFixed(1)} kg/pc` : `${o.weight_kg || 0} kg`}</span>
                            <span style={{ color: '#cbd5e1' }}>•</span>
                            <span style={{ color: '#047857', fontWeight: 600 }}>₹{parseFloat(o.rate_per_piece) > 0 ? o.rate_per_piece : (o.pieces > 0 ? (o.freight_amount / o.pieces).toFixed(0) : 0)}/pc</span>
                          </div>
                        );
                      })()}
                    </td>

                    <td>{getStatusBadge(o.delivery_status)}</td>

                    <td>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                        ₹{Number(o.total_amount).toLocaleString()}
                      </div>
                      {(() => {
                        const denoms = parsePackageDenominations(o.box_details);
                        if (denoms.length > 0) {
                          return (
                            <div style={{ fontSize: '0.7rem', color: '#047857', fontWeight: 700, marginTop: '2px' }}>
                              Itemized ({denoms.length} {denoms.length === 1 ? 'item' : 'items'}) • Freight: ₹{o.freight_amount}
                            </div>
                          );
                        }
                        if (parseFloat(o.rate_per_piece) > 0 || (o.pieces > 1 && o.total_amount > 0)) {
                          return (
                            <div style={{ fontSize: '0.7rem', color: '#047857', fontWeight: 600, marginTop: '2px' }}>
                              ₹{parseFloat(o.rate_per_piece) > 0 ? o.rate_per_piece : (o.total_amount / o.pieces).toFixed(0)}/pc × {o.pieces} pcs
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
                        {hasPermission('orders', 'edit') && (
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
                              <option value="UNDELIVERED">Undelivered</option>
                              <option value="CANCELLED">Cancelled</option>
                            </select>
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                          {/* EDIT ORDER BUTTON */}
                          {hasPermission('orders', 'edit') && (
                            <button
                              className="btn btn-outline btn-xs"
                              onClick={() => handleOpenEditOrder(o)}
                              title="Edit Order Details"
                              style={{ flex: 1, padding: '4px 6px', fontSize: '0.75rem', gap: '3px', color: '#0284c7', borderColor: '#bae6fd', background: '#f0f9ff' }}
                            >
                              <Edit size={12} />
                              <span>Edit</span>
                            </button>
                          )}

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

                          {/* DELETE ORDER BUTTON */}
                          {hasPermission('orders', 'delete') && (
                            <button
                              className="btn btn-outline btn-xs"
                              onClick={() => setDeleteConfirmOrder(o)}
                              title="Delete Order Permanently"
                              style={{ padding: '4px 6px', fontSize: '0.75rem', gap: '3px', color: '#dc2626', borderColor: '#fecaca', background: '#fef2f2' }}
                            >
                              <Trash2 size={12} />
                              <span>Delete</span>
                            </button>
                          )}
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

                {/* Package Denomination Breakdown Section */}
                <div style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '10px', padding: '14px', marginBottom: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                      <input
                        type="checkbox"
                        checked={orderForm.has_separate_boxes}
                        onChange={(e) => handleToggleSeparateBoxes(e.target.checked)}
                        style={{ width: 16, height: 16, accentColor: '#2563eb' }}
                      />
                      <span>📦 Itemize Package Denominations (Quantity, Weight & Rates)</span>
                    </label>

                    {orderForm.has_separate_boxes ? (
                      <button
                        type="button"
                        onClick={handleAddBox}
                        className="btn btn-outline btn-xs"
                        style={{ padding: '4px 10px', fontSize: '0.75rem', gap: '4px', background: '#fff', borderColor: '#2563eb', color: '#2563eb', fontWeight: 700 }}
                      >
                        <Plus size={13} />
                        <span>Add Package Row</span>
                      </button>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Total Consignment Weight:</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          className="form-control"
                          style={{ width: '90px', padding: '4px 8px', height: '32px', textAlign: 'right', fontWeight: 700 }}
                          value={orderForm.weight_kg}
                          onChange={(e) => setOrderForm({ ...orderForm, weight_kg: e.target.value })}
                        />
                        <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>KG</span>
                      </div>
                    )}
                  </div>

                  {!orderForm.has_separate_boxes && (
                    <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span>💡 Check above if parcel has different boxes, bags, or items with separate weights/rates.</span>
                      {parseFloat(orderForm.pieces) > 0 && parseFloat(orderForm.weight_kg) > 0 && (
                        <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                          Avg: {(orderForm.weight_kg / orderForm.pieces).toFixed(1)} kg / piece
                        </span>
                      )}
                    </div>
                  )}

                  {orderForm.has_separate_boxes && (
                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1' }}>
                      <div style={{ overflowX: 'auto', maxHeight: '250px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
                          <thead>
                            <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', textAlign: 'left', color: '#475569', fontSize: '0.75rem' }}>
                              <th style={{ padding: '6px 8px', width: '28px' }}>#</th>
                              <th style={{ padding: '6px 8px', minWidth: '130px' }}>Package Type</th>
                              <th style={{ padding: '6px 8px', width: '70px', textAlign: 'center' }}>Qty (Pcs)</th>
                              <th style={{ padding: '6px 8px', width: '90px', textAlign: 'right' }}>Wt / Pc (kg)</th>
                              <th style={{ padding: '6px 8px', width: '90px', textAlign: 'right' }}>Total Wt (kg)</th>
                              <th style={{ padding: '6px 8px', width: '90px', textAlign: 'right' }}>Rate / Pc (₹)</th>
                              <th style={{ padding: '6px 8px', width: '95px', textAlign: 'right' }}>Total (₹)</th>
                              <th style={{ padding: '6px 4px', width: '30px' }}></th>
                            </tr>
                          </thead>
                          <tbody>
                            {(orderForm.box_items || []).map((box, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
                                <td style={{ padding: '6px 8px', fontWeight: 700, color: '#64748b' }}>{idx + 1}</td>
                                <td style={{ padding: '4px 6px' }}>
                                  <select
                                    className="form-control"
                                    style={{ padding: '4px 6px', height: '30px', fontSize: '0.8rem', fontWeight: 600 }}
                                    value={box.package_type || 'Box'}
                                    onChange={(e) => handleBoxFieldChange(idx, 'package_type', e.target.value)}
                                  >
                                    {PACKAGE_TYPES.map(pt => (
                                      <option key={pt.value} value={pt.value}>{pt.icon} {pt.label}</option>
                                    ))}
                                  </select>
                                </td>
                                <td style={{ padding: '4px 6px' }}>
                                  <input
                                    type="number"
                                    min="1"
                                    className="form-control"
                                    style={{ padding: '4px 6px', height: '30px', fontSize: '0.825rem', textAlign: 'center', fontWeight: 700 }}
                                    value={box.pieces || 1}
                                    onChange={(e) => handleBoxFieldChange(idx, 'pieces', e.target.value)}
                                  />
                                </td>
                                <td style={{ padding: '4px 6px' }}>
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    placeholder="0.0"
                                    className="form-control"
                                    style={{ padding: '4px 6px', height: '30px', fontSize: '0.825rem', textAlign: 'right', fontWeight: 600 }}
                                    value={box.weight_per_piece}
                                    onChange={(e) => handleBoxFieldChange(idx, 'weight_per_piece', e.target.value)}
                                  />
                                </td>
                                <td style={{ padding: '4px 6px' }}>
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    placeholder="0.0"
                                    className="form-control"
                                    style={{ padding: '4px 6px', height: '30px', fontSize: '0.825rem', textAlign: 'right', fontWeight: 700, color: '#0369a1', background: '#f0f9ff' }}
                                    value={box.total_weight}
                                    onChange={(e) => handleBoxFieldChange(idx, 'total_weight', e.target.value)}
                                  />
                                </td>
                                <td style={{ padding: '4px 6px' }}>
                                  <input
                                    type="number"
                                    step="1"
                                    min="0"
                                    placeholder="0"
                                    className="form-control"
                                    style={{ padding: '4px 6px', height: '30px', fontSize: '0.825rem', textAlign: 'right', fontWeight: 600 }}
                                    value={box.rate_per_piece}
                                    onChange={(e) => handleBoxFieldChange(idx, 'rate_per_piece', e.target.value)}
                                  />
                                </td>
                                <td style={{ padding: '4px 6px' }}>
                                  <input
                                    type="number"
                                    step="1"
                                    min="0"
                                    placeholder="0"
                                    className="form-control"
                                    style={{ padding: '4px 6px', height: '30px', fontSize: '0.825rem', textAlign: 'right', fontWeight: 800, color: '#047857', background: '#f0fdf4' }}
                                    value={box.total_amount}
                                    onChange={(e) => handleBoxFieldChange(idx, 'total_amount', e.target.value)}
                                  />
                                </td>
                                <td style={{ padding: '4px 4px', textAlign: 'center' }}>
                                  {(orderForm.box_items || []).length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveBox(idx)}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px', display: 'inline-flex', alignItems: 'center' }}
                                      title="Remove row"
                                    >
                                      <X size={14} />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Summary Footer */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '10px', paddingTop: '8px', borderTop: '1.5px solid #cbd5e1', fontSize: '0.85rem' }}>
                        <span style={{ color: '#475569', fontSize: '0.8rem', fontWeight: 600 }}>
                          Total Items: <strong>{orderForm.box_items?.length || 0}</strong> item row{(orderForm.box_items?.length || 0) === 1 ? '' : 's'}
                        </span>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, color: '#1e293b', background: '#e2e8f0', padding: '4px 10px', borderRadius: '4px', fontSize: '0.8rem' }}>
                            📦 {orderForm.pieces || 0} Pcs
                          </span>
                          <span style={{ fontWeight: 800, color: '#0369a1', background: '#e0f2fe', padding: '4px 10px', borderRadius: '4px', fontSize: '0.8rem' }}>
                            ⚖️ {orderForm.weight_kg || 0} kg
                          </span>
                          <span style={{ fontWeight: 800, color: '#047857', background: '#dcfce7', border: '1px solid #86efac', padding: '4px 12px', borderRadius: '4px', fontSize: '0.85rem' }}>
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

                {/* Package Denomination Breakdown Section */}
                <div style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '10px', padding: '14px', marginBottom: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                      <input
                        type="checkbox"
                        checked={editForm.has_separate_boxes}
                        onChange={(e) => handleEditToggleSeparateBoxes(e.target.checked)}
                        style={{ width: 16, height: 16, accentColor: '#2563eb' }}
                      />
                      <span>📦 Itemize Package Denominations (Quantity, Weight & Rates)</span>
                    </label>

                    {editForm.has_separate_boxes ? (
                      <button
                        type="button"
                        onClick={handleEditAddBox}
                        className="btn btn-outline btn-xs"
                        style={{ padding: '4px 10px', fontSize: '0.75rem', gap: '4px', background: '#fff', borderColor: '#2563eb', color: '#2563eb', fontWeight: 700 }}
                      >
                        <Plus size={13} />
                        <span>Add Package Row</span>
                      </button>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Total Consignment Weight:</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          className="form-control"
                          style={{ width: '90px', padding: '4px 8px', height: '32px', textAlign: 'right', fontWeight: 700 }}
                          value={editForm.weight_kg}
                          onChange={(e) => setEditForm({ ...editForm, weight_kg: e.target.value })}
                        />
                        <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>KG</span>
                      </div>
                    )}
                  </div>

                  {!editForm.has_separate_boxes && (
                    <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span>💡 Check above if parcel has different boxes, bags, or items with separate weights/rates.</span>
                      {parseFloat(editForm.pieces) > 0 && parseFloat(editForm.weight_kg) > 0 && (
                        <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                          Avg: {(editForm.weight_kg / editForm.pieces).toFixed(1)} kg / piece
                        </span>
                      )}
                    </div>
                  )}

                  {editForm.has_separate_boxes && (
                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1' }}>
                      <div style={{ overflowX: 'auto', maxHeight: '250px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
                          <thead>
                            <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', textAlign: 'left', color: '#475569', fontSize: '0.75rem' }}>
                              <th style={{ padding: '6px 8px', width: '28px' }}>#</th>
                              <th style={{ padding: '6px 8px', minWidth: '130px' }}>Package Type</th>
                              <th style={{ padding: '6px 8px', width: '70px', textAlign: 'center' }}>Qty (Pcs)</th>
                              <th style={{ padding: '6px 8px', width: '90px', textAlign: 'right' }}>Wt / Pc (kg)</th>
                              <th style={{ padding: '6px 8px', width: '90px', textAlign: 'right' }}>Total Wt (kg)</th>
                              <th style={{ padding: '6px 8px', width: '90px', textAlign: 'right' }}>Rate / Pc (₹)</th>
                              <th style={{ padding: '6px 8px', width: '95px', textAlign: 'right' }}>Total (₹)</th>
                              <th style={{ padding: '6px 4px', width: '30px' }}></th>
                            </tr>
                          </thead>
                          <tbody>
                            {(editForm.box_items || []).map((box, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
                                <td style={{ padding: '6px 8px', fontWeight: 700, color: '#64748b' }}>{idx + 1}</td>
                                <td style={{ padding: '4px 6px' }}>
                                  <select
                                    className="form-control"
                                    style={{ padding: '4px 6px', height: '30px', fontSize: '0.8rem', fontWeight: 600 }}
                                    value={box.package_type || 'Box'}
                                    onChange={(e) => handleEditBoxFieldChange(idx, 'package_type', e.target.value)}
                                  >
                                    {PACKAGE_TYPES.map(pt => (
                                      <option key={pt.value} value={pt.value}>{pt.icon} {pt.label}</option>
                                    ))}
                                  </select>
                                </td>
                                <td style={{ padding: '4px 6px' }}>
                                  <input
                                    type="number"
                                    min="1"
                                    className="form-control"
                                    style={{ padding: '4px 6px', height: '30px', fontSize: '0.825rem', textAlign: 'center', fontWeight: 700 }}
                                    value={box.pieces || 1}
                                    onChange={(e) => handleEditBoxFieldChange(idx, 'pieces', e.target.value)}
                                  />
                                </td>
                                <td style={{ padding: '4px 6px' }}>
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    placeholder="0.0"
                                    className="form-control"
                                    style={{ padding: '4px 6px', height: '30px', fontSize: '0.825rem', textAlign: 'right', fontWeight: 600 }}
                                    value={box.weight_per_piece}
                                    onChange={(e) => handleEditBoxFieldChange(idx, 'weight_per_piece', e.target.value)}
                                  />
                                </td>
                                <td style={{ padding: '4px 6px' }}>
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    placeholder="0.0"
                                    className="form-control"
                                    style={{ padding: '4px 6px', height: '30px', fontSize: '0.825rem', textAlign: 'right', fontWeight: 700, color: '#0369a1', background: '#f0f9ff' }}
                                    value={box.total_weight}
                                    onChange={(e) => handleEditBoxFieldChange(idx, 'total_weight', e.target.value)}
                                  />
                                </td>
                                <td style={{ padding: '4px 6px' }}>
                                  <input
                                    type="number"
                                    step="1"
                                    min="0"
                                    placeholder="0"
                                    className="form-control"
                                    style={{ padding: '4px 6px', height: '30px', fontSize: '0.825rem', textAlign: 'right', fontWeight: 600 }}
                                    value={box.rate_per_piece}
                                    onChange={(e) => handleEditBoxFieldChange(idx, 'rate_per_piece', e.target.value)}
                                  />
                                </td>
                                <td style={{ padding: '4px 6px' }}>
                                  <input
                                    type="number"
                                    step="1"
                                    min="0"
                                    placeholder="0"
                                    className="form-control"
                                    style={{ padding: '4px 6px', height: '30px', fontSize: '0.825rem', textAlign: 'right', fontWeight: 800, color: '#047857', background: '#f0fdf4' }}
                                    value={box.total_amount}
                                    onChange={(e) => handleEditBoxFieldChange(idx, 'total_amount', e.target.value)}
                                  />
                                </td>
                                <td style={{ padding: '4px 4px', textAlign: 'center' }}>
                                  {(editForm.box_items || []).length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleEditRemoveBox(idx)}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px', display: 'inline-flex', alignItems: 'center' }}
                                      title="Remove row"
                                    >
                                      <X size={14} />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Summary Footer */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '10px', paddingTop: '8px', borderTop: '1.5px solid #cbd5e1', fontSize: '0.85rem' }}>
                        <span style={{ color: '#475569', fontSize: '0.8rem', fontWeight: 600 }}>
                          Total Items: <strong>{editForm.box_items?.length || 0}</strong> item row{(editForm.box_items?.length || 0) === 1 ? '' : 's'}
                        </span>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, color: '#1e293b', background: '#e2e8f0', padding: '4px 10px', borderRadius: '4px', fontSize: '0.8rem' }}>
                            📦 {editForm.pieces || 0} Pcs
                          </span>
                          <span style={{ fontWeight: 800, color: '#0369a1', background: '#e0f2fe', padding: '4px 10px', borderRadius: '4px', fontSize: '0.8rem' }}>
                            ⚖️ {editForm.weight_kg || 0} kg
                          </span>
                          <span style={{ fontWeight: 800, color: '#047857', background: '#dcfce7', border: '1px solid #86efac', padding: '4px 12px', borderRadius: '4px', fontSize: '0.85rem' }}>
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
                      <option value="UNDELIVERED">Undelivered</option>
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
              <div>
                <h3 style={{ margin: 0 }}>Parcel Consignment (LR #{selectedOrder.lr_number})</h3>
                <span style={{ fontSize: '0.775rem', color: '#64748b' }}>Complete lifecycle tracking & billing details</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-outline btn-xs"
                  onClick={() => handlePrintLR(selectedOrder)}
                  title="Print Full A4 Waybill"
                  style={{ gap: '4px', fontSize: '0.75rem', padding: '5px 9px' }}
                >
                  <Printer size={13} />
                  <span>Print A4</span>
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-xs"
                  onClick={() => handlePrintThermalReceipt(selectedOrder)}
                  title="Print Bluetooth Thermal Slip (Driver Slip)"
                  style={{ gap: '4px', fontSize: '0.75rem', padding: '5px 9px', color: '#16a34a', borderColor: '#86efac', background: '#f0fdf4' }}
                >
                  <Printer size={13} />
                  <span>Thermal Slip 📱</span>
                </button>
                <button className="modal-close" onClick={() => setIsTrackingDrawerOpen(false)}>
                  <X size={22} />
                </button>
              </div>
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
              <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '16px', marginBottom: '18px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.875rem' }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.725rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700, display: 'block' }}>
                      Consignment Summary
                    </span>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', marginTop: '3px' }}>
                      📦 {selectedOrder.pieces} Pcs <span style={{ color: '#94a3b8', margin: '0 4px' }}>•</span> ⚖️ {selectedOrder.weight_kg} Kg
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '3px' }}>
                      Goods: <strong>{selectedOrder.description || 'General Goods'}</strong>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: '#64748b', fontSize: '0.725rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700, display: 'block' }}>
                      Freight & Billing
                    </span>
                    <div style={{ color: '#15803d', fontSize: '1.25rem', fontWeight: 900, marginTop: '3px' }}>
                      ₹{Number(selectedOrder.total_amount).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.785rem', color: '#64748b', marginTop: '3px' }}>
                      {selectedOrder.payment_mode} • <strong style={{ color: selectedOrder.payment_status === 'PAID' ? '#15803d' : '#b45309' }}>{selectedOrder.payment_status}</strong>
                    </div>
                  </div>
                </div>

                {/* Denomination Breakdown */}
                {(() => {
                  const denoms = parsePackageDenominations(selectedOrder.box_details);
                  if (denoms.length > 0) {
                    return (
                      <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed #cbd5e1' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            📦 Itemized Package Denominations ({denoms.length} Items)
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            Total: <strong>{selectedOrder.pieces} Pcs</strong> • <strong>{selectedOrder.weight_kg} Kg</strong>
                          </span>
                        </div>

                        <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
                            <thead>
                              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.75rem' }}>
                                <th style={{ padding: '6px 10px', textAlign: 'left', width: '30px' }}>#</th>
                                <th style={{ padding: '6px 10px', textAlign: 'left' }}>Package Type</th>
                                <th style={{ padding: '6px 10px', textAlign: 'center' }}>Quantity (Pcs)</th>
                                <th style={{ padding: '6px 10px', textAlign: 'right' }}>Weight / Pc</th>
                                <th style={{ padding: '6px 10px', textAlign: 'right' }}>Total Weight</th>
                                <th style={{ padding: '6px 10px', textAlign: 'right' }}>Rate / Pc</th>
                                <th style={{ padding: '6px 10px', textAlign: 'right' }}>Subtotal</th>
                              </tr>
                            </thead>
                            <tbody>
                              {denoms.map((d, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td style={{ padding: '7px 10px', color: '#64748b', fontWeight: 600 }}>{i + 1}</td>
                                  <td style={{ padding: '7px 10px', fontWeight: 700, color: '#1e293b' }}>
                                    {d.package_type || 'Box'}
                                  </td>
                                  <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>
                                    {d.pieces} Pcs
                                  </td>
                                  <td style={{ padding: '7px 10px', textAlign: 'right', color: '#64748b' }}>
                                    {d.weight_per_piece ? `${d.weight_per_piece} kg` : '-'}
                                  </td>
                                  <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, color: '#0369a1' }}>
                                    {d.total_weight ? `${d.total_weight} kg` : `${d.weight || 0} kg`}
                                  </td>
                                  <td style={{ padding: '7px 10px', textAlign: 'right', color: '#64748b' }}>
                                    {d.rate_per_piece ? `₹${d.rate_per_piece}` : '-'}
                                  </td>
                                  <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 800, color: '#047857' }}>
                                    ₹{Number(d.total_amount || d.amount || 0).toLocaleString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0', fontWeight: 800 }}>
                                <td colSpan={2} style={{ padding: '8px 10px', color: '#0f172a' }}>Total Consignment:</td>
                                <td style={{ padding: '8px 10px', textAlign: 'center', color: '#2563eb' }}>{selectedOrder.pieces} Pcs</td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#64748b', fontSize: '0.75rem' }}>
                                  {selectedOrder.pieces > 0 && selectedOrder.weight_kg > 0 ? `Avg ${(selectedOrder.weight_kg / selectedOrder.pieces).toFixed(1)} kg` : ''}
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#0369a1' }}>{selectedOrder.weight_kg} kg</td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#64748b', fontSize: '0.75rem' }}>
                                  {selectedOrder.pieces > 0 && selectedOrder.freight_amount > 0 ? `Avg ₹${(selectedOrder.freight_amount / selectedOrder.pieces).toFixed(1)}` : ''}
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#047857', fontSize: '0.9rem' }}>
                                  ₹{Number(selectedOrder.freight_amount).toLocaleString()}
                                </td>
                              </tr>
                              {parseFloat(selectedOrder.other_charges) > 0 && (
                                <tr style={{ background: '#fffbeb', fontSize: '0.75rem', color: '#92400e' }}>
                                  <td colSpan={6} style={{ padding: '5px 10px', textAlign: 'right', fontWeight: 600 }}>Other Handling / Door Delivery Charges:</td>
                                  <td style={{ padding: '5px 10px', textAlign: 'right', fontWeight: 700 }}>+ ₹{selectedOrder.other_charges}</td>
                                </tr>
                              )}
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    );
                  }

                  // Standard Consignment Denomination Card (when no separate box rows)
                  return (
                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                        📦 Consignment Denomination:
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px' }}>
                          <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Package Count</span>
                          <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{selectedOrder.pieces} Pcs</strong>
                        </div>
                        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px' }}>
                          <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Weight Denomination</span>
                          <strong style={{ fontSize: '0.95rem', color: '#0369a1' }}>{selectedOrder.weight_kg} Kg</strong>
                          {selectedOrder.pieces > 1 && selectedOrder.weight_kg > 0 && (
                            <span style={{ fontSize: '0.675rem', color: '#64748b', display: 'block' }}>
                              ({(selectedOrder.weight_kg / selectedOrder.pieces).toFixed(1)} kg / pc)
                            </span>
                          )}
                        </div>
                        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px' }}>
                          <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Rate Denomination</span>
                          <strong style={{ fontSize: '0.95rem', color: '#047857' }}>
                            ₹{selectedOrder.rate_per_piece || (selectedOrder.pieces > 0 ? (selectedOrder.freight_amount / selectedOrder.pieces).toFixed(0) : 0)} / Pc
                          </strong>
                          <span style={{ fontSize: '0.675rem', color: '#64748b', display: 'block' }}>
                            {selectedOrder.pieces} × ₹{selectedOrder.rate_per_piece || (selectedOrder.pieces > 0 ? (selectedOrder.freight_amount / selectedOrder.pieces).toFixed(0) : 0)} = ₹{selectedOrder.freight_amount}
                          </span>
                        </div>
                        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 10px' }}>
                          <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Billing Breakdown</span>
                          <strong style={{ fontSize: '0.95rem', color: '#15803d' }}>₹{Number(selectedOrder.total_amount).toLocaleString()}</strong>
                          <span style={{ fontSize: '0.675rem', color: '#64748b', display: 'block' }}>
                            Freight ₹{selectedOrder.freight_amount} {parseFloat(selectedOrder.other_charges) > 0 ? `+ ₹${selectedOrder.other_charges}` : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
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

      {/* Delete Order Confirmation Modal */}
      {deleteConfirmOrder && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmOrder(null)}>
          <div
            className="modal-box"
            style={{ maxWidth: '420px', textAlign: 'center', padding: '28px 24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Trash2 size={26} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
              Delete Consignment Order?
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '20px', lineHeight: 1.5 }}>
              Are you sure you want to permanently delete LR <strong>#{deleteConfirmOrder.lr_number}</strong> from <strong>{deleteConfirmOrder.sender_name}</strong> to <strong>{deleteConfirmOrder.receiver_name}</strong>?
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{ flex: 1 }}
                onClick={() => setDeleteConfirmOrder(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingOrder}
                className="btn btn-danger"
                style={{ flex: 1 }}
                onClick={handleConfirmDeleteOrder}
              >
                {deletingOrder ? 'Deleting...' : 'Delete Order'}
              </button>
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
