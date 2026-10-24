import React, { useState, useEffect } from 'react';
import { api } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  CalendarCheck, Users, CheckCircle, XCircle, Clock,
  Calendar, Download, Printer, Search, Filter, RefreshCw,
  AlertCircle, ShieldAlert, Check, HelpCircle, UserCheck, Eye, X
} from 'lucide-react';

const ATTENDANCE_STATUSES = [
  { id: 'PRESENT', label: 'Present', color: '#16a34a', bg: '#dcfce7', icon: CheckCircle },
  { id: 'ABSENT', label: 'Absent', color: '#dc2626', bg: '#fee2e2', icon: XCircle },
  { id: 'HALF_DAY', label: 'Half Day', color: '#d97706', bg: '#fef3c7', icon: Clock }
];

const AttendanceView = () => {
  const { hasPermission, user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('daily'); // 'daily' | 'monthly'
  const [branches, setBranches] = useState([]);

  // Daily Mode State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [roster, setRoster] = useState([]);
  const [stats, setStats] = useState(null);
  const [loadingDaily, setLoadingDaily] = useState(true);
  const [savingDaily, setSavingDaily] = useState(false);
  const [savingUserId, setSavingUserId] = useState(null);
  const [savedUsers, setSavedUsers] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Monthly Register State
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // 'YYYY-MM'
  const [monthlyBranchFilter, setMonthlyBranchFilter] = useState('ALL');
  const [monthlySummaries, setMonthlySummaries] = useState([]);
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const [detailModalStaff, setDetailModalStaff] = useState(null);
  const [userMonthRecords, setUserMonthRecords] = useState([]);
  const [loadingUserRecords, setLoadingUserRecords] = useState(false);

  // Load branches
  useEffect(() => {
    loadBranches();
  }, []);

  // Fetch daily roster when date/filters change
  useEffect(() => {
    if (activeTab === 'daily') {
      fetchDailyAttendance();
    }
  }, [selectedDate, branchFilter, statusFilter, activeTab]);

  // Fetch monthly data when month or tab changes
  useEffect(() => {
    if (activeTab === 'monthly') {
      fetchMonthlySummary();
    }
  }, [selectedMonth, monthlyBranchFilter, activeTab]);

  const loadBranches = async () => {
    try {
      const res = await api.getBranches();
      if (res.success) setBranches(res.branches || []);
    } catch (err) {
      console.warn('Failed to load branches:', err);
    }
  };

  const fetchDailyAttendance = async () => {
    setLoadingDaily(true);
    setHasUnsavedChanges(false);
    try {
      const res = await api.getAttendance({
        date: selectedDate,
        branch: branchFilter,
        status: statusFilter,
        search
      });
      if (res.success) {
        setRoster(res.records || []);
        setStats(res.stats || null);
        const initialSaved = {};
        (res.records || []).forEach(r => {
          if (r.status && r.status !== 'UNMARKED') {
            initialSaved[r.user_id] = true;
          }
        });
        setSavedUsers(initialSaved);
      }
    } catch (err) {
      console.error('Fetch daily attendance error:', err);
      showToast(err.message || 'Failed to load attendance', 'error');
    } finally {
      setLoadingDaily(false);
    }
  };

  const fetchMonthlySummary = async () => {
    setLoadingMonthly(true);
    try {
      const res = await api.getMonthlyAttendanceSummary({
        month: selectedMonth,
        branch: monthlyBranchFilter
      });
      if (res.success) {
        setMonthlySummaries(res.staffSummaries || []);
      }
    } catch (err) {
      console.error('Fetch monthly summary error:', err);
      showToast(err.message || 'Failed to load monthly register', 'error');
    } finally {
      setLoadingMonthly(false);
    }
  };

  // Change individual staff status from the dropdown
  const handleStatusChange = (userId, newStatus) => {
    if (!hasPermission('attendance', 'edit') && !hasPermission('attendance', 'add')) {
      showToast('You do not have permission to modify attendance records.', 'error');
      return;
    }

    setRoster(prev => prev.map(item => {
      if (item.user_id === userId) {
        let nextCheckIn = item.check_in;
        let nextCheckOut = item.check_out;

        if (newStatus === 'PRESENT') {
          nextCheckIn = item.check_in || '09:00';
          nextCheckOut = item.check_out || '18:00';
        } else if (newStatus === 'HALF_DAY') {
          nextCheckIn = item.check_in || '09:00';
          nextCheckOut = item.check_out || '13:30';
        } else if (newStatus === 'ABSENT') {
          nextCheckIn = '';
          nextCheckOut = '';
        }

        return {
          ...item,
          status: newStatus,
          check_in: nextCheckIn,
          check_out: nextCheckOut
        };
      }
      return item;
    }));
    setSavedUsers(prev => ({ ...prev, [userId]: false }));
    setHasUnsavedChanges(true);
  };

  // Update check-in or check-out time
  const handleTimeChange = (userId, field, value) => {
    setRoster(prev => prev.map(item => {
      if (item.user_id === userId) {
        return { ...item, [field]: value };
      }
      return item;
    }));
    setSavedUsers(prev => ({ ...prev, [userId]: false }));
    setHasUnsavedChanges(true);
  };

  // Save single staff member attendance ("OK" button)
  const handleSaveSingleStaff = async (userId) => {
    if (!hasPermission('attendance', 'edit') && !hasPermission('attendance', 'add')) {
      showToast('You do not have permission to save attendance records.', 'error');
      return;
    }

    const staffItem = roster.find(r => r.user_id === userId);
    if (!staffItem) return;
    if (!staffItem.status || staffItem.status === 'UNMARKED') {
      showToast(`Please select Present, Absent, or Half Day for ${staffItem.name}`, 'warning');
      return;
    }

    setSavingUserId(userId);
    try {
      await api.markAttendance({
        attendance_date: selectedDate,
        user_id: userId,
        status: staffItem.status,
        check_in: staffItem.status === 'ABSENT' ? null : (staffItem.check_in || null),
        check_out: staffItem.status === 'ABSENT' ? null : (staffItem.check_out || null),
        branch: staffItem.branch || 'Karaikal'
      });

      setSavedUsers(prev => ({ ...prev, [userId]: true }));
      const statusLabel = staffItem.status === 'HALF_DAY' ? 'Half Day' : staffItem.status === 'PRESENT' ? 'Present' : 'Absent';
      showToast(`OK: ${staffItem.name} marked as ${statusLabel}`, 'success');

      // Check if all roster items are saved
      const hasOtherUnsaved = roster.some(r => r.user_id !== userId && !savedUsers[r.user_id] && r.status && r.status !== 'UNMARKED');
      if (!hasOtherUnsaved) {
        setHasUnsavedChanges(false);
      }
    } catch (err) {
      console.error('Save attendance error:', err);
      showToast(err.message || 'Failed to save attendance', 'error');
    } finally {
      setSavingUserId(null);
    }
  };

  // Quick 1-Click "Mark All Present"
  const handleMarkAllPresent = () => {
    if (!hasPermission('attendance', 'edit') && !hasPermission('attendance', 'add')) {
      showToast('You do not have permission to mark attendance.', 'error');
      return;
    }

    setRoster(prev => prev.map(item => ({
      ...item,
      status: 'PRESENT',
      check_in: item.check_in || '09:00',
      check_out: item.check_out || '18:00'
    })));
    setSavedUsers({});
    setHasUnsavedChanges(true);
    showToast('All staff marked as Present (09:00 - 18:00). Click "Save All" or "OK" to confirm.', 'info');
  };

  // Save Daily Attendance
  const handleSaveDailyAttendance = async () => {
    if (!hasPermission('attendance', 'edit') && !hasPermission('attendance', 'add')) {
      showToast('You do not have permission to save attendance records.', 'error');
      return;
    }

    setSavingDaily(true);
    try {
      const recordsToSave = roster.map(r => ({
        user_id: r.user_id,
        status: r.status,
        check_in: r.status === 'ABSENT' ? null : (r.check_in || null),
        check_out: r.status === 'ABSENT' ? null : (r.check_out || null),
        branch: r.branch
      }));

      await api.markAttendance({
        attendance_date: selectedDate,
        records: recordsToSave
      });

      showToast(`Daily attendance saved successfully for ${selectedDate}!`, 'success');
      const allSaved = {};
      roster.forEach(r => {
        if (r.status && r.status !== 'UNMARKED') allSaved[r.user_id] = true;
      });
      setSavedUsers(allSaved);
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Save attendance error:', err);
      showToast(err.message || 'Failed to save attendance records', 'error');
    } finally {
      setSavingDaily(false);
    }
  };

  // Open detailed user attendance history modal for the month
  const handleOpenUserDetail = async (staff) => {
    setDetailModalStaff(staff);
    setLoadingUserRecords(true);
    try {
      const res = await api.getUserMonthAttendanceRecords({
        user_id: staff.user_id,
        month: selectedMonth
      });
      if (res.success) {
        setUserMonthRecords(res.records || []);
      }
    } catch (err) {
      console.error('Fetch user month records error:', err);
      showToast('Failed to load user records', 'error');
    } finally {
      setLoadingUserRecords(false);
    }
  };

  // Export Monthly Register CSV
  const handleExportMonthlyCSV = () => {
    if (monthlySummaries.length === 0) {
      showToast('No monthly attendance data to export', 'error');
      return;
    }

    const headers = ['#', 'Staff Name', 'Total Recorded Days', 'Present Days', 'Absent Days', 'Half Days', 'Avg Check In', 'Avg Check Out', 'Attendance %'];
    const rows = monthlySummaries.map((s, idx) => [
      idx + 1,
      `"${s.name || ''}"`,
      s.total_recorded_days || 0,
      s.present_days || 0,
      s.absent_days || 0,
      s.half_days || 0,
      s.avg_check_in || '--:--',
      s.avg_check_out || '--:--',
      `${s.attendance_percentage || 0}%`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Staff_Attendance_Report_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Monthly attendance exported to CSV!', 'success');
  };

  // Print Daily Attendance Sheet
  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* View Switcher Tabs: Daily vs Monthly */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '10px', gap: '4px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('daily')}
            style={{
              padding: '8px 18px',
              fontSize: '0.875rem',
              fontWeight: 700,
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'daily' ? '#ffffff' : 'transparent',
              color: activeTab === 'daily' ? '#0f172a' : '#64748b',
              boxShadow: activeTab === 'daily' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <CalendarCheck size={16} />
            <span>Daily Attendance Roster</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('monthly')}
            style={{
              padding: '8px 18px',
              fontSize: '0.875rem',
              fontWeight: 700,
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'monthly' ? '#ffffff' : 'transparent',
              color: activeTab === 'monthly' ? '#0f172a' : '#64748b',
              boxShadow: activeTab === 'monthly' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Calendar size={16} />
            <span>Monthly Register &amp; Reports</span>
          </button>
        </div>

        {/* Action buttons on top right */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={handlePrint}
            className="btn btn-outline btn-sm"
            style={{ padding: '6px 12px' }}
          >
            <Printer size={15} />
            <span className="desktop-only">Print</span>
          </button>
          {activeTab === 'monthly' && (
            <button
              onClick={handleExportMonthlyCSV}
              className="btn btn-outline btn-sm"
              style={{ padding: '6px 12px' }}
            >
              <Download size={15} />
              <span className="desktop-only">Export Register CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* ============================================================= */}
      {/* TAB 1: DAILY ATTENDANCE ROSTER */}
      {/* ============================================================= */}
      {activeTab === 'daily' && (
        <>
          {/* Live Daily Attendance KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
            {/* Total Staff */}
            <div className="card" style={{ padding: '16px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Staff</span>
                <Users size={16} color="#64748b" />
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Outfit' }}>
                {stats?.total_staff || roster.length || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                Registered team members
              </div>
            </div>

            {/* Present */}
            <div className="card" style={{ padding: '16px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>Present</span>
                <CheckCircle size={16} color="#16a34a" />
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#15803d', fontFamily: 'Outfit' }}>
                {roster.filter(r => r.status === 'PRESENT').length}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#166534', marginTop: '2px' }}>
                Marked present today
              </div>
            </div>

            {/* Absent */}
            <div className="card" style={{ padding: '16px', background: '#fef2f2', borderRadius: '12px', border: '1px solid #fecaca' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#991b1b', textTransform: 'uppercase' }}>Absent</span>
                <XCircle size={16} color="#dc2626" />
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#b91c1c', fontFamily: 'Outfit' }}>
                {roster.filter(r => r.status === 'ABSENT').length}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#991b1b', marginTop: '2px' }}>
                Marked absent today
              </div>
            </div>

            {/* Half Day */}
            <div className="card" style={{ padding: '16px', background: '#fffbeb', borderRadius: '12px', border: '1px solid #fde68a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>Half Day</span>
                <Clock size={16} color="#d97706" />
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#b45309', fontFamily: 'Outfit' }}>
                {roster.filter(r => r.status === 'HALF_DAY').length}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#92400e', marginTop: '2px' }}>
                Marked half day today
              </div>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              {/* Date Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#334155' }}>ATTENDANCE DATE:</span>
                <input
                  type="date"
                  className="form-control"
                  style={{ width: 'auto', padding: '6px 12px', fontSize: '0.9rem', fontWeight: 700 }}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                  className="btn btn-outline btn-xs"
                  style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                >
                  Today
                </button>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {(hasPermission('attendance', 'add') || hasPermission('attendance', 'edit')) && (
                  <>
                    <button
                      onClick={handleMarkAllPresent}
                      className="btn btn-outline btn-sm"
                      style={{ padding: '6px 12px', color: '#15803d', borderColor: '#86efac', background: '#f0fdf4' }}
                    >
                      <UserCheck size={15} />
                      <span>Mark All Present</span>
                    </button>
                    <button
                      onClick={handleSaveDailyAttendance}
                      disabled={savingDaily}
                      className="btn btn-accent btn-sm"
                      style={{ padding: '6px 16px', fontWeight: 700 }}
                    >
                      {savingDaily ? (
                        <>
                          <RefreshCw size={15} className="spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Check size={16} />
                          <span>Save Attendance</span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Unsaved changes notice banner */}
            {hasUnsavedChanges && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '8px 12px', borderRadius: '8px', fontSize: '0.825rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={16} color="#d97706" />
                  <span>You have unsaved changes in today's attendance roster.</span>
                </div>
                <button
                  onClick={handleSaveDailyAttendance}
                  className="btn btn-xs"
                  style={{ background: '#d97706', color: '#ffffff', border: 'none', padding: '4px 8px', fontWeight: 700 }}
                >
                  Save Now
                </button>
              </div>
            )}

            {/* Filters Row: Branch, Status, Search */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', alignItems: 'center' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '3px' }}>BRANCH</label>
                <select
                  className="form-control"
                  style={{ padding: '6px 10px', fontSize: '0.85rem', height: '36px' }}
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                >
                  <option value="ALL">All Branches</option>
                  <option value="Karaikal">Karaikal (Head Office)</option>
                  <option value="Pondicherry">Pondicherry</option>
                  {branches.filter(b => !['Karaikal', 'Pondicherry'].includes(b.name)).map(b => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '3px' }}>STATUS FILTER</label>
                <select
                  className="form-control"
                  style={{ padding: '6px 10px', fontSize: '0.85rem', height: '36px' }}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="ALL">All Staff</option>
                  <option value="PRESENT">Present</option>
                  <option value="ABSENT">Absent</option>
                  <option value="HALF_DAY">Half Day</option>
                  <option value="UNMARKED">Unmarked / Pending</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '3px' }}>SEARCH STAFF</label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input
                    type="text"
                    placeholder="Search name, phone, designation..."
                    className="form-control"
                    style={{ padding: '6px 10px', fontSize: '0.85rem', height: '36px' }}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <button onClick={fetchDailyAttendance} className="btn btn-outline btn-sm" style={{ padding: '0 10px', height: '36px' }}>
                    <Search size={15} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Staff Roster Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafbfc' }}>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
                Attendance Register for {new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </div>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                {roster.length} Staff Listed
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', textAlign: 'left', color: '#475569', fontWeight: 700 }}>
                    <th style={{ padding: '12px 16px', width: '50px' }}>#</th>
                    <th style={{ padding: '12px 16px' }}>STAFF NAME</th>
                    <th style={{ padding: '12px 16px', width: '180px' }}>STATUS</th>
                    <th style={{ padding: '12px 16px', width: '135px' }}>CHECK IN</th>
                    <th style={{ padding: '12px 16px', width: '135px' }}>CHECK OUT</th>
                    <th style={{ padding: '12px 16px', width: '110px', textAlign: 'center' }}>OK</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingDaily ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                          <RefreshCw size={20} className="spin" />
                          <span>Loading attendance records...</span>
                        </div>
                      </td>
                    </tr>
                  ) : roster.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '50px 20px', color: '#94a3b8' }}>
                        <Users size={40} style={{ margin: '0 auto 12px', strokeWidth: 1.5, opacity: 0.5 }} />
                        <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#475569' }}>No staff members found</div>
                        <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>Check branch filters or search terms.</div>
                      </td>
                    </tr>
                  ) : (
                    roster.map((s, index) => {
                      const isUnmarked = !s.status || s.status === 'UNMARKED';
                      const isRowSaved = Boolean(savedUsers[s.user_id]);
                      const isAbsent = s.status === 'ABSENT';
                      return (
                        <tr key={s.user_id} style={{ borderBottom: '1px solid #f1f5f9', background: isUnmarked ? '#fffdfa' : '#ffffff' }}>
                          {/* S.No */}
                          <td style={{ padding: '12px 16px', color: '#64748b', fontWeight: 600 }}>
                            {index + 1}
                          </td>

                          {/* 1. Just Name */}
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>
                              {s.name}
                            </div>
                          </td>

                          {/* 3. Status Dropdown (Present, Absent, Half Day) */}
                          <td style={{ padding: '12px 16px' }}>
                            <select
                              className="form-control"
                              value={s.status || 'UNMARKED'}
                              onChange={(e) => handleStatusChange(s.user_id, e.target.value)}
                              style={{
                                padding: '6px 10px',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                height: '36px',
                                borderRadius: '8px',
                                border: s.status === 'PRESENT' ? '2px solid #16a34a' :
                                        s.status === 'ABSENT' ? '2px solid #dc2626' :
                                        s.status === 'HALF_DAY' ? '2px solid #d97706' : '1px solid #cbd5e1',
                                background: s.status === 'PRESENT' ? '#f0fdf4' :
                                            s.status === 'ABSENT' ? '#fef2f2' :
                                            s.status === 'HALF_DAY' ? '#fffbeb' : '#ffffff',
                                color: s.status === 'PRESENT' ? '#15803d' :
                                       s.status === 'ABSENT' ? '#b91c1c' :
                                       s.status === 'HALF_DAY' ? '#b45309' : '#475569',
                                cursor: 'pointer',
                                width: '100%',
                                maxWidth: '170px'
                              }}
                            >
                              <option value="UNMARKED">-- Select Status --</option>
                              <option value="PRESENT">Present</option>
                              <option value="ABSENT">Absent</option>
                              <option value="HALF_DAY">Half Day</option>
                            </select>
                          </td>

                          {/* Check In Time */}
                          <td style={{ padding: '12px 16px' }}>
                            <input
                              type="time"
                              className="form-control"
                              value={s.check_in || ''}
                              disabled={isAbsent}
                              placeholder="09:00"
                              onChange={(e) => handleTimeChange(s.user_id, 'check_in', e.target.value)}
                              style={{
                                padding: '5px 8px',
                                fontSize: '0.85rem',
                                height: '36px',
                                borderRadius: '8px',
                                fontWeight: 600,
                                width: '100%',
                                maxWidth: '125px',
                                background: isAbsent ? '#f1f5f9' : '#ffffff',
                                color: isAbsent ? '#94a3b8' : '#0f172a',
                                cursor: isAbsent ? 'not-allowed' : 'text'
                              }}
                            />
                          </td>

                          {/* Check Out Time */}
                          <td style={{ padding: '12px 16px' }}>
                            <input
                              type="time"
                              className="form-control"
                              value={s.check_out || ''}
                              disabled={isAbsent}
                              placeholder="18:00"
                              onChange={(e) => handleTimeChange(s.user_id, 'check_out', e.target.value)}
                              style={{
                                padding: '5px 8px',
                                fontSize: '0.85rem',
                                height: '36px',
                                borderRadius: '8px',
                                fontWeight: 600,
                                width: '100%',
                                maxWidth: '125px',
                                background: isAbsent ? '#f1f5f9' : '#ffffff',
                                color: isAbsent ? '#94a3b8' : '#0f172a',
                                cursor: isAbsent ? 'not-allowed' : 'text'
                              }}
                            />
                          </td>

                          {/* 2. OK Button */}
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleSaveSingleStaff(s.user_id)}
                              disabled={savingUserId === s.user_id || isUnmarked}
                              className="btn btn-sm"
                              style={{
                                padding: '6px 16px',
                                fontWeight: 800,
                                fontSize: '0.85rem',
                                borderRadius: '6px',
                                background: isRowSaved ? '#16a34a' : '#2563eb',
                                color: '#ffffff',
                                border: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '5px',
                                minWidth: '76px',
                                cursor: isUnmarked ? 'not-allowed' : 'pointer',
                                opacity: isUnmarked ? 0.5 : 1,
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {savingUserId === s.user_id ? (
                                <>
                                  <RefreshCw size={13} className="spin" />
                                  <span>...</span>
                                </>
                              ) : isRowSaved ? (
                                <>
                                  <Check size={15} strokeWidth={3} />
                                  <span>OK</span>
                                </>
                              ) : (
                                <>
                                  <Check size={14} />
                                  <span>OK</span>
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom floating save bar when modified */}
            {hasUnsavedChanges && (
              <div style={{ padding: '14px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Unsaved attendance changes present:</span>
                <button
                  onClick={handleSaveDailyAttendance}
                  disabled={savingDaily}
                  className="btn btn-accent btn-sm"
                  style={{ padding: '6px 20px', fontWeight: 800 }}
                >
                  {savingDaily ? 'Saving Changes...' : 'Save All Attendance'}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ============================================================= */}
      {/* TAB 2: MONTHLY REGISTER & SUMMARY */}
      {/* ============================================================= */}
      {activeTab === 'monthly' && (
        <>
          {/* Monthly Control Bar */}
          <div className="card" style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#334155' }}>SELECT MONTH:</span>
                <input
                  type="month"
                  className="form-control"
                  style={{ width: 'auto', padding: '6px 12px', fontSize: '0.9rem', fontWeight: 700 }}
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#334155' }}>BRANCH:</span>
                <select
                  className="form-control"
                  style={{ width: 'auto', padding: '6px 12px', fontSize: '0.85rem' }}
                  value={monthlyBranchFilter}
                  onChange={(e) => setMonthlyBranchFilter(e.target.value)}
                >
                  <option value="ALL">All Branches</option>
                  <option value="Karaikal">Karaikal</option>
                  <option value="Pondicherry">Pondicherry</option>
                  {branches.filter(b => !['Karaikal', 'Pondicherry'].includes(b.name)).map(b => (
                    <option key={b.id} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={fetchMonthlySummary}
              className="btn btn-outline btn-sm"
              style={{ padding: '6px 12px' }}
            >
              <RefreshCw size={15} />
              <span>Refresh Summary</span>
            </button>
          </div>

          {/* Monthly Register Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafbfc' }}>
              <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
                Monthly Attendance Register ({selectedMonth})
              </span>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                {monthlySummaries.length} Staff Members Tracked
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', textAlign: 'left', color: '#475569', fontWeight: 700 }}>
                    <th style={{ padding: '12px 16px', width: '50px' }}>#</th>
                    <th style={{ padding: '12px 16px' }}>STAFF NAME</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', width: '110px' }}>TOTAL DAYS</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', width: '90px' }}>PRESENT</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', width: '90px' }}>ABSENT</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', width: '95px' }}>HALF DAY</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', width: '120px' }}>CHECK IN (AVG)</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', width: '120px' }}>CHECK OUT (AVG)</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', width: '140px' }}>ATTENDANCE RATE</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', width: '90px' }}>LOGS</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingMonthly ? (
                    <tr>
                      <td colSpan="10" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                          <RefreshCw size={20} className="spin" />
                          <span>Compiling monthly attendance summary...</span>
                        </div>
                      </td>
                    </tr>
                  ) : monthlySummaries.length === 0 ? (
                    <tr>
                      <td colSpan="10" style={{ textAlign: 'center', padding: '50px 20px', color: '#94a3b8' }}>
                        <Calendar size={40} style={{ margin: '0 auto 12px', strokeWidth: 1.5, opacity: 0.5 }} />
                        <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#475569' }}>No attendance data for {selectedMonth}</div>
                        <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>Switch to the Daily Attendance tab to record staff attendance.</div>
                      </td>
                    </tr>
                  ) : (
                    monthlySummaries.map((s, index) => {
                      const pct = s.attendance_percentage || 0;
                      const badgeColor = pct >= 90 ? '#16a34a' : (pct >= 75 ? '#d97706' : '#dc2626');
                      const badgeBg = pct >= 90 ? '#dcfce7' : (pct >= 75 ? '#fef3c7' : '#fee2e2');

                      return (
                        <tr key={s.user_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          {/* S.No */}
                          <td style={{ padding: '12px 16px', color: '#64748b', fontWeight: 600 }}>
                            {index + 1}
                          </td>

                          {/* 1. Just Name */}
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>
                              {s.name}
                            </div>
                          </td>

                          {/* Total Days */}
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: '#334155' }}>
                            {s.total_recorded_days || 0}
                          </td>

                          {/* Present Days */}
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800, color: '#16a34a' }}>
                            <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 9px', borderRadius: '6px' }}>
                              {s.present_days || 0}
                            </span>
                          </td>

                          {/* Absent Days */}
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800, color: '#dc2626' }}>
                            <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '3px 9px', borderRadius: '6px' }}>
                              {s.absent_days || 0}
                            </span>
                          </td>

                          {/* Half Days */}
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: '#d97706' }}>
                            <span style={{ background: '#fffbeb', color: '#b45309', padding: '3px 9px', borderRadius: '6px' }}>
                              {s.half_days || 0}
                            </span>
                          </td>

                          {/* Avg Check In */}
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#0f172a' }}>
                            {s.avg_check_in || '--:--'}
                          </td>

                          {/* Avg Check Out */}
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#0f172a' }}>
                            {s.avg_check_out || '--:--'}
                          </td>

                          {/* Attendance Rate */}
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                              <div style={{ width: '45px', height: '6px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: badgeColor, borderRadius: '4px' }} />
                              </div>
                              <span style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                background: badgeBg,
                                color: badgeColor
                              }}>
                                {pct}%
                              </span>
                            </div>
                          </td>

                          {/* Logs Button */}
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenUserDetail(s)}
                              className="btn btn-outline btn-xs"
                              style={{ padding: '4px 8px', fontSize: '0.75rem', fontWeight: 700 }}
                            >
                              <Eye size={13} style={{ marginRight: 4 }} />
                              <span>Logs</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Staff Monthly Log Detail Modal */}
      {detailModalStaff && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => setDetailModalStaff(null)}
        >
          <div
            className="modal-box"
            style={{
              maxWidth: '620px',
              width: '100%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
              overflow: 'hidden',
              background: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.08)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {detailModalStaff.name} — Attendance Log
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                  Month: {selectedMonth}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalStaff(null)}
                className="btn btn-outline btn-xs"
                style={{ padding: '6px', borderRadius: '8px', border: '1px solid #cbd5e1', color: '#64748b', background: '#ffffff', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body - Solid White Background */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', background: '#ffffff' }}>
              {loadingUserRecords ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b', background: '#ffffff' }}>
                  <RefreshCw size={24} className="spin" style={{ margin: '0 auto 10px', color: '#2563eb' }} />
                  <div style={{ fontWeight: 600 }}>Loading attendance records...</div>
                </div>
              ) : userMonthRecords.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b', background: '#ffffff' }}>
                  <Calendar size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#334155' }}>No attendance records recorded</div>
                  <div style={{ fontSize: '0.825rem', marginTop: '4px', color: '#94a3b8' }}>
                    There are no recorded attendance entries for this staff member in {selectedMonth}.
                  </div>
                </div>
              ) : (
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', background: '#ffffff' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', textAlign: 'left', color: '#475569', fontWeight: 700 }}>
                      <th style={{ padding: '10px 14px' }}>DATE</th>
                      <th style={{ padding: '10px 14px' }}>STATUS</th>
                      <th style={{ padding: '10px 14px' }}>CHECK IN</th>
                      <th style={{ padding: '10px 14px' }}>CHECK OUT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userMonthRecords.map(rec => {
                      const isPresent = rec.status === 'PRESENT';
                      const isHalf = rec.status === 'HALF_DAY';

                      return (
                        <tr key={rec.id} style={{ borderBottom: '1px solid #f1f5f9', background: '#ffffff' }}>
                          <td style={{ padding: '12px 14px', fontWeight: 700, color: '#334155' }}>
                            {new Date(rec.attendance_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', weekday: 'short' })}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{
                              padding: '3px 10px',
                              borderRadius: '6px',
                              fontWeight: 800,
                              fontSize: '0.75rem',
                              background: isPresent ? '#dcfce7' : (isHalf ? '#fffbeb' : '#fee2e2'),
                              color: isPresent ? '#15803d' : (isHalf ? '#b45309' : '#b91c1c')
                            }}>
                              {rec.status === 'HALF_DAY' ? 'Half Day' : rec.status === 'PRESENT' ? 'Present' : 'Absent'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', color: '#0f172a', fontWeight: 600 }}>
                            {rec.check_in ? rec.check_in.slice(0, 5) : '--:--'}
                          </td>
                          <td style={{ padding: '12px 14px', color: '#0f172a', fontWeight: 600 }}>
                            {rec.check_out ? rec.check_out.slice(0, 5) : '--:--'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '14px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setDetailModalStaff(null)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '8px 20px', fontWeight: 700 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceView;
