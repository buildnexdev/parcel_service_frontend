import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Wallet, Plus, Search, Filter, Calendar, Download, Printer,
  Edit2, Trash2, Fuel, Users, Truck, Wrench, Coffee,
  FileText, ArrowUpDown, X, Check, AlertCircle, RefreshCw
} from 'lucide-react';

export const EXPENSE_CATEGORIES = [
  { id: 'Fuel / Diesel', label: 'Fuel / Diesel', icon: Fuel, color: '#f59e0b', bg: '#fef3c7' },
  { id: 'Driver Batta / Allowance', label: 'Driver Batta / Allowance', icon: Users, color: '#3b82f6', bg: '#eff6ff' },
  { id: 'Vehicle Maintenance', label: 'Vehicle Maintenance', icon: Wrench, color: '#ec4899', bg: '#fdf2f8' },
  { id: 'Toll Plaza', label: 'Toll Plaza / Fastag', icon: Truck, color: '#8b5cf6', bg: '#f5f3ff' },
  { id: 'Loading / Coolie', label: 'Loading / Coolie (Hamali)', icon: Truck, color: '#10b981', bg: '#ecfdf5' },
  { id: 'Office Rent & Bills', label: 'Office Rent & Bills', icon: Wallet, color: '#6366f1', bg: '#eef2ff' },
  { id: 'Tea & Refreshments', label: 'Tea & Refreshments', icon: Coffee, color: '#ea580c', bg: '#fff7ed' },
  { id: 'Printing & Stationery', label: 'Printing & Stationery', icon: FileText, color: '#0284c7', bg: '#f0f9ff' },
  { id: 'Miscellaneous', label: 'Miscellaneous', icon: AlertCircle, color: '#64748b', bg: '#f1f5f9' }
];

const DailyExpensesView = () => {
  const { hasPermission } = useAuth();
  const { showToast } = useToast();

  const [expenses, setExpenses] = useState([]);
  const [stats, setStats] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [datePreset, setDatePreset] = useState('today');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [category, setCategory] = useState('ALL');
  const [branch, setBranch] = useState('ALL');
  const [paymentMode, setPaymentMode] = useState('ALL');
  const [search, setSearch] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saving, setSaving] = useState(false);

  // Fuel calculator helper state in form
  const [fuelLitres, setFuelLitres] = useState('');
  const [fuelRate, setFuelRate] = useState('');

  // Expense Form State
  const initialForm = {
    expense_date: new Date().toISOString().split('T')[0],
    category: 'Fuel / Diesel',
    title: '',
    amount: '',
    branch: 'Karaikal',
    payment_mode: 'CASH',
    paid_to: '',
    voucher_no: '',
    vehicle_id: '',
    driver_id: '',
    notes: ''
  };
  const [form, setForm] = useState(initialForm);

  // Load initial dropdowns
  useEffect(() => {
    loadMetadata();
  }, []);

  // Fetch expenses when filters change
  useEffect(() => {
    fetchExpenses();
  }, [date, startDate, endDate, category, branch, paymentMode]);

  const loadMetadata = async () => {
    try {
      const [vRes, dRes, bRes] = await Promise.all([
        api.getVehicles(),
        api.getDrivers(),
        api.getBranches()
      ]);
      if (vRes.success) setVehicles(vRes.vehicles || []);
      if (dRes.success) setDrivers(dRes.drivers || []);
      if (bRes.success) setBranches(bRes.branches || []);
    } catch (err) {
      console.warn('Failed to load expense metadata:', err);
    }
  };

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params = {
        category,
        branch,
        payment_mode: paymentMode,
        search
      };

      if (datePreset === 'custom') {
        if (startDate && endDate) {
          params.startDate = startDate;
          params.endDate = endDate;
        }
      } else if (date) {
        params.date = date;
      }

      const res = await api.getExpenses(params);
      if (res.success) {
        setExpenses(res.expenses || []);
        setStats(res.stats || null);
      }
    } catch (err) {
      console.error('Fetch expenses error:', err);
      showToast(err.message || 'Failed to load expenses', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchExpenses();
  };

  // Date Preset Selection
  const applyDatePreset = (preset) => {
    setDatePreset(preset);
    const today = new Date();
    const formatDate = (d) => d.toISOString().split('T')[0];

    if (preset === 'today') {
      setDate(formatDate(today));
      setStartDate('');
      setEndDate('');
    } else if (preset === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      setDate(formatDate(y));
      setStartDate('');
      setEndDate('');
    } else if (preset === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setDate('');
      setStartDate(formatDate(firstDay));
      setEndDate(formatDate(lastDay));
    } else if (preset === 'all') {
      setDate('');
      setStartDate('');
      setEndDate('');
    } else if (preset === 'custom') {
      setDate('');
      if (!startDate) setStartDate(formatDate(today));
      if (!endDate) setEndDate(formatDate(today));
    }
  };

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingExpense(null);
    setFuelLitres('');
    setFuelRate('');
    setForm({
      ...initialForm,
      expense_date: new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (exp) => {
    setEditingExpense(exp);
    setFuelLitres('');
    setFuelRate('');
    setForm({
      expense_date: exp.expense_date ? exp.expense_date.split('T')[0] : '',
      category: exp.category || 'Miscellaneous',
      title: exp.title || '',
      amount: exp.amount || '',
      branch: exp.branch || 'Karaikal',
      payment_mode: exp.payment_mode || 'CASH',
      paid_to: exp.paid_to || '',
      voucher_no: exp.voucher_no || '',
      vehicle_id: exp.vehicle_id || '',
      driver_id: exp.driver_id || '',
      notes: exp.notes || ''
    });
    setIsModalOpen(true);
  };

  // Handle Fuel calculator
  const handleLitresOrRateChange = (litres, rate) => {
    setFuelLitres(litres);
    setFuelRate(rate);
    const l = parseFloat(litres);
    const r = parseFloat(rate);
    if (!isNaN(l) && !isNaN(r) && l > 0 && r > 0) {
      const total = (l * r).toFixed(2);
      setForm(prev => ({
        ...prev,
        amount: total,
        title: prev.title || `Diesel ${l}L @ ₹${r}/L`
      }));
    }
  };

  // Save Expense
  const handleSubmitExpense = async (e) => {
    e.preventDefault();
    if (!form.expense_date || !form.category || !form.title || !form.amount) {
      showToast('Please fill in all required fields (Date, Category, Title, Amount)', 'error');
      return;
    }

    setSaving(true);
    try {
      if (editingExpense) {
        await api.updateExpense(editingExpense.id, form);
        showToast('Expense updated successfully!', 'success');
      } else {
        await api.createExpense(form);
        showToast('Expense recorded successfully!', 'success');
      }
      setIsModalOpen(false);
      fetchExpenses();
    } catch (err) {
      console.error('Save expense error:', err);
      showToast(err.message || 'Failed to save expense', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Delete Expense
  const handleDeleteExpense = async () => {
    if (!deleteConfirm) return;
    try {
      await api.deleteExpense(deleteConfirm.id);
      showToast('Expense deleted successfully!', 'success');
      setDeleteConfirm(null);
      fetchExpenses();
    } catch (err) {
      console.error('Delete expense error:', err);
      showToast(err.message || 'Failed to delete expense', 'error');
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (expenses.length === 0) {
      showToast('No expenses to export', 'error');
      return;
    }

    const headers = ['Date', 'Category', 'Title', 'Amount (₹)', 'Payment Mode', 'Paid To', 'Voucher No', 'Vehicle No', 'Driver Name', 'Branch', 'Notes', 'Created By'];
    const rows = expenses.map(e => [
      e.expense_date ? e.expense_date.split('T')[0] : '',
      `"${e.category || ''}"`,
      `"${(e.title || '').replace(/"/g, '""')}"`,
      parseFloat(e.amount || 0).toFixed(2),
      e.payment_mode || 'CASH',
      `"${(e.paid_to || '').replace(/"/g, '""')}"`,
      `"${e.voucher_no || ''}"`,
      `"${e.vehicle_no || ''}"`,
      `"${(e.driver_name || '').replace(/"/g, '""')}"`,
      `"${e.branch || ''}"`,
      `"${(e.notes || '').replace(/"/g, '""')}"`,
      `"${e.created_by || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Daily_Expenses_${datePreset}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Expenses exported to CSV!', 'success');
  };

  // Print Daily Expense Voucher Sheet
  const handlePrintSheet = () => {
    window.print();
  };

  // Calculate filtered total
  const filteredSum = useMemo(() => {
    return expenses.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);
  }, [expenses]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner & KPI Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {/* Today's Expense Card */}
        <div className="card" style={{ padding: '18px 20px', background: 'linear-gradient(135deg, #1e293b, #0f172a)', color: '#fff', borderRadius: '14px', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Today's Expenses</span>
            <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', fontFamily: 'Outfit' }}>
            ₹{parseFloat(stats?.today_expenses || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            Current daily operational costs
          </div>
        </div>

        {/* Month Total Card */}
        <div className="card" style={{ padding: '18px 20px', background: 'linear-gradient(135deg, #1e293b, #0f172a)', color: '#fff', borderRadius: '14px', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>This Month Total</span>
            <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wallet size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', fontFamily: 'Outfit' }}>
            ₹{parseFloat(stats?.month_expenses || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            Monthly cumulative expenditure
          </div>
        </div>

        {/* Fuel Total Card */}
        <div className="card" style={{ padding: '18px 20px', background: 'linear-gradient(135deg, #1e293b, #0f172a)', color: '#fff', borderRadius: '14px', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fuel / Diesel (Month)</span>
            <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Fuel size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', fontFamily: 'Outfit' }}>
            ₹{parseFloat(stats?.month_fuel || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            Fleet diesel &amp; petrol charges
          </div>
        </div>

        {/* Driver Batta Card */}
        <div className="card" style={{ padding: '18px 20px', background: 'linear-gradient(135deg, #1e293b, #0f172a)', color: '#fff', borderRadius: '14px', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Driver Batta (Month)</span>
            <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(236, 72, 153, 0.2)', color: '#f472b6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', fontFamily: 'Outfit' }}>
            ₹{parseFloat(stats?.month_batta || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            Driver trip daily allowances
          </div>
        </div>
      </div>

      {/* Control Bar: Date Presets & Action Buttons */}
      <div className="card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          {/* Date Range Presets */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginRight: '4px' }}>Period:</span>
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'this_month', label: 'This Month' },
              { id: 'custom', label: 'Custom Range' },
              { id: 'all', label: 'All Records' }
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyDatePreset(p.id)}
                className="btn btn-sm"
                style={{
                  padding: '5px 12px',
                  fontSize: '0.8rem',
                  borderRadius: '20px',
                  background: datePreset === p.id ? 'var(--primary)' : '#f1f5f9',
                  color: datePreset === p.id ? '#ffffff' : '#475569',
                  border: 'none',
                  fontWeight: datePreset === p.id ? 700 : 500,
                  cursor: 'pointer'
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={handlePrintSheet}
              className="btn btn-outline btn-sm"
              title="Print Voucher Sheet"
              style={{ padding: '6px 12px' }}
            >
              <Printer size={15} />
              <span className="desktop-only">Print</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="btn btn-outline btn-sm"
              title="Export to Excel / CSV"
              style={{ padding: '6px 12px' }}
            >
              <Download size={15} />
              <span className="desktop-only">Export CSV</span>
            </button>
            {hasPermission('expenses', 'add') && (
              <button
                onClick={handleOpenCreate}
                className="btn btn-accent btn-sm"
                style={{ padding: '6px 14px' }}
              >
                <Plus size={16} />
                <span>Record Expense</span>
              </button>
            )}
          </div>
        </div>

        {/* Custom Date Pickers (if custom selected) */}
        {datePreset === 'custom' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569' }}>From Date:</span>
            <input
              type="date"
              className="form-control"
              style={{ width: 'auto', padding: '5px 10px', fontSize: '0.85rem' }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569' }}>To Date:</span>
            <input
              type="date"
              className="form-control"
              style={{ width: 'auto', padding: '5px 10px', fontSize: '0.85rem' }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <button
              onClick={fetchExpenses}
              className="btn btn-primary btn-sm"
              style={{ padding: '6px 12px' }}
            >
              Apply Filter
            </button>
          </div>
        )}

        {/* Filters Row: Category, Branch, Payment Mode, Search */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', alignItems: 'center' }}>
          {/* Category Filter */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '3px' }}>CATEGORY</label>
            <select
              className="form-control"
              style={{ padding: '6px 10px', fontSize: '0.85rem', height: '36px' }}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="ALL">All Categories</option>
              {EXPENSE_CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Branch Filter */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '3px' }}>BRANCH</label>
            <select
              className="form-control"
              style={{ padding: '6px 10px', fontSize: '0.85rem', height: '36px' }}
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
            >
              <option value="ALL">All Branches</option>
              <option value="Karaikal">Karaikal</option>
              <option value="Pondicherry">Pondicherry</option>
              {branches.filter(b => !['Karaikal', 'Pondicherry'].includes(b.name)).map(b => (
                <option key={b.id} value={b.name}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Payment Mode */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '3px' }}>PAYMENT METHOD</label>
            <select
              className="form-control"
              style={{ padding: '6px 10px', fontSize: '0.85rem', height: '36px' }}
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
            >
              <option value="ALL">All Payment Modes</option>
              <option value="CASH">CASH</option>
              <option value="UPI">UPI / GPay / PhonePe</option>
              <option value="BANK_TRANSFER">BANK TRANSFER</option>
              <option value="PETTY_CASH">PETTY CASH</option>
              <option value="CHEQUE">CHEQUE</option>
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '3px' }}>SEARCH</label>
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '4px' }}>
              <input
                type="text"
                placeholder="Search title, payee, voucher, vehicle..."
                className="form-control"
                style={{ padding: '6px 10px', fontSize: '0.85rem', height: '36px' }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="submit" className="btn btn-outline btn-sm" style={{ padding: '0 10px', height: '36px' }}>
                <Search size={15} />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafbfc' }}>
          <div>
            <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>Daily Expense Records</span>
            <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: '8px' }}>
              ({expenses.length} entries found)
            </span>
          </div>
          <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1d4ed8' }}>
            Filtered Total: ₹{filteredSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569', fontWeight: 700 }}>
                <th style={{ padding: '12px 16px' }}>DATE / VOUCHER</th>
                <th style={{ padding: '12px 16px' }}>CATEGORY</th>
                <th style={{ padding: '12px 16px' }}>PURPOSE / TITLE</th>
                <th style={{ padding: '12px 16px' }}>PAID TO / VENDOR</th>
                <th style={{ padding: '12px 16px' }}>VEHICLE / DRIVER</th>
                <th style={{ padding: '12px 16px' }}>BRANCH</th>
                <th style={{ padding: '12px 16px' }}>PAYMENT</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>AMOUNT (₹)</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', width: '110px' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                      <RefreshCw size={20} className="spin" />
                      <span>Loading daily expenses...</span>
                    </div>
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '50px 20px', color: '#94a3b8' }}>
                    <Wallet size={40} style={{ margin: '0 auto 12px', strokeWidth: 1.5, opacity: 0.5 }} />
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#475569' }}>No expense records found</div>
                    <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                      {hasPermission('expenses', 'add') ? 'Click "Record Expense" above to add your first expense entry.' : 'No expenses match the current filter criteria.'}
                    </div>
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => {
                  const catConfig = EXPENSE_CATEGORIES.find(c => c.id === exp.category) || { color: '#64748b', bg: '#f1f5f9' };
                  return (
                    <tr key={exp.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>
                          {exp.expense_date ? new Date(exp.expense_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                        </div>
                        {exp.voucher_no && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            Ref: #{exp.voucher_no}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: catConfig.bg,
                          color: catConfig.color
                        }}>
                          {exp.category}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{exp.title}</div>
                        {exp.notes && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {exp.notes}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#334155' }}>
                        {exp.paid_to || <span style={{ color: '#94a3b8' }}>-</span>}
                      </td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        {exp.vehicle_no && (
                          <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.8rem' }}>
                            🚛 {exp.vehicle_no}
                          </div>
                        )}
                        {exp.driver_name && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            👤 {exp.driver_name}
                          </div>
                        )}
                        {!exp.vehicle_no && !exp.driver_name && (
                          <span style={{ color: '#94a3b8' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                          {exp.branch || 'Karaikal'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: exp.payment_mode === 'CASH' ? '#dcfce7' : (exp.payment_mode === 'UPI' ? '#ede9fe' : '#e0f2fe'),
                          color: exp.payment_mode === 'CASH' ? '#166534' : (exp.payment_mode === 'UPI' ? '#5b21b6' : '#075985')
                        }}>
                          {exp.payment_mode}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>
                          ₹{parseFloat(exp.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          {hasPermission('expenses', 'edit') && (
                            <button
                              onClick={() => handleOpenEdit(exp)}
                              className="btn btn-outline btn-xs"
                              title="Edit Expense"
                              style={{ padding: '4px 8px', color: '#0284c7', borderColor: '#bae6fd', background: '#f0f9ff' }}
                            >
                              <Edit2 size={13} />
                            </button>
                          )}
                          {hasPermission('expenses', 'delete') && (
                            <button
                              onClick={() => setDeleteConfirm(exp)}
                              className="btn btn-outline btn-xs"
                              title="Delete Expense"
                              style={{ padding: '4px 8px', color: '#ef4444', borderColor: '#fecaca', background: '#fef2f2' }}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
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

      {/* ============================================================= */}
      {/* RECORD / EDIT EXPENSE MODAL */}
      {/* ============================================================= */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div
            className="modal-box"
            style={{ maxWidth: '640px', width: '95%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 34, height: 34, borderRadius: '8px', background: 'rgba(234, 88, 12, 0.15)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Wallet size={18} />
                </div>
                <h3>{editingExpense ? 'Edit Daily Expense' : 'Record New Daily Expense'}</h3>
              </div>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitExpense}>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', padding: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '14px' }}>
                  {/* Expense Date */}
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      EXPENSE DATE <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="date"
                      required
                      className="form-control"
                      value={form.expense_date}
                      onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      EXPENSE CATEGORY <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      className="form-control"
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                    >
                      {EXPENSE_CATEGORIES.map(c => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* If Diesel / Fuel is selected: Fuel Calculator Helper */}
                {form.category === 'Fuel / Diesel' && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#92400e', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Fuel size={15} />
                      <span>Fuel Calculation Helper (Auto-calculates Amount)</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#78350f', fontWeight: 600 }}>Diesel Litres</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="e.g. 50"
                          className="form-control"
                          style={{ background: '#ffffff' }}
                          value={fuelLitres}
                          onChange={(e) => handleLitresOrRateChange(e.target.value, fuelRate)}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#78350f', fontWeight: 600 }}>Rate / Litre (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="e.g. 94.50"
                          className="form-control"
                          style={{ background: '#ffffff' }}
                          value={fuelRate}
                          onChange={(e) => handleLitresOrRateChange(fuelLitres, e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Purpose / Title */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    EXPENSE TITLE / PURPOSE <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Diesel 45L for Karaikal-Pondicherry run, Toll at Arumathapuram"
                    className="form-control"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '14px' }}>
                  {/* Amount (₹) */}
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      TOTAL AMOUNT (₹) <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      className="form-control"
                      style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    />
                  </div>

                  {/* Payment Mode */}
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      PAYMENT MODE <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      className="form-control"
                      value={form.payment_mode}
                      onChange={(e) => setForm({ ...form, payment_mode: e.target.value })}
                    >
                      <option value="CASH">CASH</option>
                      <option value="UPI">UPI / GPay / PhonePe</option>
                      <option value="BANK_TRANSFER">BANK TRANSFER</option>
                      <option value="PETTY_CASH">PETTY CASH</option>
                      <option value="CHEQUE">CHEQUE</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '14px' }}>
                  {/* Paid To / Payee */}
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      PAID TO / VENDOR NAME
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Indian Oil Petrol Bunk, Driver Mathi"
                      className="form-control"
                      value={form.paid_to}
                      onChange={(e) => setForm({ ...form, paid_to: e.target.value })}
                    />
                  </div>

                  {/* Voucher / Bill Number */}
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      VOUCHER / BILL NO / INVOICE REF
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. IOC-8891, VCH-102"
                      className="form-control"
                      value={form.voucher_no}
                      onChange={(e) => setForm({ ...form, voucher_no: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '14px' }}>
                  {/* Vehicle Selector */}
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      ASSOCIATED VEHICLE (OPTIONAL)
                    </label>
                    <select
                      className="form-control"
                      value={form.vehicle_id}
                      onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}
                    >
                      <option value="">-- No Vehicle Linked --</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.vehicle_no} ({v.model_name || v.vehicle_type || 'Vehicle'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Driver Selector */}
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      ASSOCIATED DRIVER (OPTIONAL)
                    </label>
                    <select
                      className="form-control"
                      value={form.driver_id}
                      onChange={(e) => setForm({ ...form, driver_id: e.target.value })}
                    >
                      <option value="">-- No Driver Linked --</option>
                      {drivers.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.name} {d.phone ? `(${d.phone})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '14px' }}>
                  {/* Branch */}
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      BRANCH
                    </label>
                    <select
                      className="form-control"
                      value={form.branch}
                      onChange={(e) => setForm({ ...form, branch: e.target.value })}
                    >
                      <option value="Karaikal">Karaikal (Head Office)</option>
                      <option value="Pondicherry">Pondicherry (Branch Office)</option>
                      {branches.filter(b => !['Karaikal', 'Pondicherry'].includes(b.name)).map(b => (
                        <option key={b.id} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Additional Notes */}
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    REMARKS / NOTES
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter additional details, odometer readings, or cash breakdown..."
                    className="form-control"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '16px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                  style={{ minWidth: '120px' }}
                >
                  {saving ? 'Saving...' : (editingExpense ? 'Update Expense' : 'Save Expense')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ============================================================= */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div
            className="modal-box"
            style={{ maxWidth: '420px', textAlign: 'center', padding: '28px 24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Trash2 size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
              Delete Expense Record?
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '20px', lineHeight: 1.5 }}>
              Are you sure you want to permanently delete <strong>"{deleteConfirm.title}"</strong> (₹{parseFloat(deleteConfirm.amount || 0).toFixed(2)})? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{ flex: 1 }}
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{ flex: 1 }}
                onClick={handleDeleteExpense}
              >
                Delete Expense
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyExpensesView;
