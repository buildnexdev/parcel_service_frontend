import React, { useState, useEffect } from 'react';
import { api } from '../api/api';
import { useToast } from '../context/ToastContext';
import SuccessModal from './Common/SuccessModal';
import { 
  Search, Phone, MapPin, ShieldCheck, Truck, CheckCircle2, 
  Clock, Package, FileText, ArrowRight, ExternalLink, MessageSquare 
} from 'lucide-react';

const WebsiteView = ({ onOpenLogin, onGoToPortal, isAuthenticated }) => {
  const { showToast } = useToast();
  const [trackQuery, setTrackQuery] = useState('');
  const [trackResult, setTrackResult] = useState(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState('');

  const [branches, setBranches] = useState([]);
  const [inquiryData, setInquiryData] = useState({
    name: '',
    phone: '',
    from_station: 'Pondicherry',
    to_station: 'Karaikal',
    message: ''
  });
  const [inquirySubmitting, setInquirySubmitting] = useState(false);
  const [inquirySuccessModal, setInquirySuccessModal] = useState(null);

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      const res = await api.getBranches();
      if (res.success && res.branches) {
        setBranches(res.branches);
      }
    } catch (err) {
      console.error('Failed to load branches:', err);
    }
  };

  const handleTrackSubmit = async (e) => {
    e.preventDefault();
    if (!trackQuery.trim()) return;

    setTrackLoading(true);
    setTrackError('');
    setTrackResult(null);

    try {
      const res = await api.trackParcel(trackQuery.trim());
      if (res.success && res.order) {
        setTrackResult(res);
      }
    } catch (err) {
      setTrackError(err.message || 'No parcel found matching this LR or Phone number.');
    } finally {
      setTrackLoading(false);
    }
  };

  const handleInquirySubmit = async (e) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(inquiryData.phone)) {
      showToast('Phone number must be exactly 10 digits.', 'error');
      return;
    }
    setInquirySubmitting(true);
    try {
      const res = await api.submitInquiry(inquiryData);
      showToast('Booking inquiry submitted successfully!', 'success');
      setInquirySuccessModal({
        title: 'Booking Inquiry Received!',
        message: 'Thank you for contacting ES Transporters. Our booking team will contact you shortly.',
        details: {
          'Name': inquiryData.name,
          'Contact Phone': inquiryData.phone,
          'Route': `${inquiryData.from_station} ➔ ${inquiryData.to_station}`,
          'Reference': res.inquiry_id ? `#INQ-${res.inquiry_id}` : 'Confirmed'
        }
      });
      setInquiryData({
        name: '',
        phone: '',
        from_station: 'Pondicherry',
        to_station: 'Karaikal',
        message: ''
      });
    } catch (err) {
      showToast(err.message || 'Failed to submit inquiry. Please call directly.', 'error');
    } finally {
      setInquirySubmitting(false);
    }
  };

  return (
    <div className="website-root">
      {/* Top Hotline Bar */}
      <div style={{ background: '#0a192f', color: '#94a3b8', fontSize: '0.85rem', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="container flex justify-between items-center" style={{ flexWrap: 'wrap', gap: '8px' }}>
          <div className="flex items-center gap-4">
            <span>📍 <strong>Head Office:</strong> Karaikal</span>
            <span>🏢 <strong>Branch Office:</strong> Pondicherry</span>
            <span>📋 <strong>GSTIN:</strong> 34BJCPM0785J1Z3</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="tel:9442485296" style={{ color: '#cbd5e1' }}>📞 94424 85296</a>
            <a href="tel:9360427527" style={{ color: '#cbd5e1' }}>93604 27527</a>
            {isAuthenticated ? (
              <button onClick={onGoToPortal} className="btn btn-sm btn-accent">
                Open Portal ➔
              </button>
            ) : (
              <button onClick={onOpenLogin} className="btn btn-sm btn-outline" style={{ color: '#f59e0b', borderColor: '#f59e0b' }}>
                Staff Login
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <header style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border-color)', padding: '14px 0' }}>
        <div className="container flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg, var(--primary), var(--accent))', color: '#fff', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.35rem' }}>
              ES
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', color: 'var(--primary-dark)', lineHeight: 1.1 }}>ES TRANSPORTERS</h2>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--secondary-hover)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                IGR QUICK PARCEL SERVICE
              </span>
            </div>
          </div>

          <nav style={{ display: 'flex', gap: '24px' }}>
            <a href="#home" style={{ color: 'var(--text-main)', fontWeight: 600 }}>Home</a>
            <a href="#track" style={{ color: 'var(--text-main)', fontWeight: 600 }}>Track Parcel</a>
            <a href="#branches" style={{ color: 'var(--text-main)', fontWeight: 600 }}>12 Branches</a>
            <a href="#credentials" style={{ color: 'var(--text-main)', fontWeight: 600 }}>Company & GST</a>
            <a href="#contact" style={{ color: 'var(--text-main)', fontWeight: 600 }}>Contact</a>
          </nav>

          <button onClick={isAuthenticated ? onGoToPortal : onOpenLogin} className="btn btn-accent">
            {isAuthenticated ? 'Go to Management Portal' : 'Staff Portal Login'}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section id="home" style={{ position: 'relative', background: 'linear-gradient(135deg, #0a192f 0%, #0f3460 50%, #1a365d 100%)', color: '#fff', padding: '70px 0 90px' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '48px', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(243,156,18,0.15)', border: '1px solid rgba(243,156,18,0.35)', color: '#fbd38d', padding: '6px 14px', borderRadius: 'var(--radius-full)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '18px' }}>
              ⚡ Daily Regular Scheduled Cargo Service
            </div>
            <h1 style={{ fontSize: '3rem', lineHeight: 1.15, color: '#fff', marginBottom: '20px' }}>
              Fast, Reliable Parcel Service Across <span style={{ color: '#f59e0b' }}>Karaikal, Pondicherry & Delta</span>
            </h1>
            <p style={{ fontSize: '1.1rem', color: '#cbd5e1', marginBottom: '30px', maxWidth: '560px' }}>
              Scheduled daily truck runs connecting Pondicherry, Cuddalore, Chidambaram, Karaikal, Nagapattinam, Thiruvarur, and 12 strategic network hubs with same-day & next-day delivery.
            </p>

            <div className="flex items-center gap-3">
              <a href="#branches" className="btn btn-accent btn-lg">Explore 12 Branches</a>
              <a href="#contact" className="btn btn-white btn-lg" style={{ color: '#000000', fontWeight: 700 }}>Book Cargo</a>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginTop: '36px', paddingTop: '28px', borderTop: '1px solid rgba(255,255,255,0.12)' }}>
              <div>
                <h3 style={{ fontSize: '1.75rem', color: '#fbd38d', marginBottom: 4 }}>12 Hubs</h3>
                <p style={{ fontSize: '0.825rem', color: '#94a3b8' }}>Direct Network Stations</p>
              </div>
              <div>
                <h3 style={{ fontSize: '1.75rem', color: '#fbd38d', marginBottom: 4 }}>Daily</h3>
                <p style={{ fontSize: '0.825rem', color: '#94a3b8' }}>Regular Scheduled Runs</p>
              </div>
              <div>
                <h3 style={{ fontSize: '1.75rem', color: '#fbd38d', marginBottom: 4 }}>100%</h3>
                <p style={{ fontSize: '0.825rem', color: '#94a3b8' }}>Safe & Insured Cargo</p>
              </div>
            </div>
          </div>

          {/* Quick Tracking Card */}
          <div id="track" style={{ background: '#ffffff', borderRadius: 'var(--radius-xl)', padding: '32px', boxShadow: 'var(--shadow-xl)', color: 'var(--text-main)' }}>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.45rem', color: 'var(--primary-dark)' }}>Track Your Order / Parcel</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Enter your Waybill / LR number or phone number for live status.</p>
            </div>

            <form onSubmit={handleTrackSubmit}>
              <div style={{ display: 'flex', background: 'var(--bg-surface-alt)', border: '2px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '6px' }}>
                <input
                  type="text"
                  placeholder="Enter LR Number (e.g. 17963, 18001)"
                  value={trackQuery}
                  onChange={(e) => setTrackQuery(e.target.value)}
                  style={{ flex: 1, border: 'none', background: 'transparent', padding: '10px 14px', fontSize: '1rem', outline: 'none' }}
                  required
                />
                <button type="submit" className="btn btn-primary" disabled={trackLoading}>
                  {trackLoading ? 'Tracking...' : 'Track'}
                </button>
              </div>
            </form>

            {trackError && (
              <div style={{ marginTop: '16px', padding: '12px', background: '#fee2e2', color: '#991b1b', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                {trackError}
              </div>
            )}

            {trackResult && trackResult.order && (
              <div style={{ marginTop: '20px', background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Waybill / LR</span>
                    <h4 style={{ fontSize: '1.3rem', color: 'var(--primary-dark)' }}>#{trackResult.order.lr_number}</h4>
                  </div>
                  <span className={`badge ${trackResult.order.delivery_status === 'DELIVERED' ? 'badge-delivered' : 'badge-in-transit'}`}>
                    {trackResult.order.delivery_status}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem', marginBottom: '14px' }}>
                  <div><strong>Route:</strong> {trackResult.order.from_station} ➔ {trackResult.order.to_station}</div>
                  <div><strong>Pieces:</strong> {trackResult.order.pieces} Pcs ({trackResult.order.weight_kg} Kg)</div>
                  <div><strong>Date:</strong> {new Date(trackResult.order.booking_date).toLocaleDateString()}</div>
                  <div><strong>Payment:</strong> {trackResult.order.payment_mode} ({trackResult.order.payment_status})</div>
                </div>

                <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>Checkpoints Timeline:</div>
                <div className="timeline">
                  {(trackResult.checkpoints || []).map((cp, idx) => (
                    <div key={idx} className="timeline-step">
                      <div className="timeline-dot"></div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--primary-dark)' }}>{cp.status} - {cp.location}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{cp.note}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-light)' }}>{new Date(cp.created_at).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 12 Branches Network */}
      <section id="branches" style={{ padding: '80px 0', background: '#ffffff' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: 650, margin: '0 auto 50px' }}>
            <span style={{ background: 'var(--warning-bg)', color: '#b45309', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', padding: '4px 12px', borderRadius: 'var(--radius-full)' }}>
              Network Stations
            </span>
            <h2 style={{ fontSize: '2.3rem', color: 'var(--primary-dark)', margin: '12px 0' }}>Our 12 Connected Hubs</h2>
            <p style={{ color: 'var(--text-muted)' }}>
              Head Office located in Karaikal with Branch Office in Pondicherry, offering complete corridor logistics coverage across coastal Tamil Nadu and Puducherry.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {branches.map(b => (
              <div
                key={b.id}
                style={{
                  background: 'var(--bg-surface)',
                  border: b.is_head_office ? '2px solid var(--secondary)' : '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '24px',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <div style={{ width: 40, height: 40, background: 'var(--bg-surface-alt)', color: 'var(--primary)', fontWeight: 800, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                  {b.code}
                </div>
                <h4 style={{ fontSize: '1.25rem', marginBottom: '6px', color: 'var(--primary-dark)' }}>
                  {b.name} {b.is_head_office && <span className="badge badge-topay" style={{ fontSize: '0.65rem' }}>HEAD OFFICE</span>}
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '14px', minHeight: 45 }}>
                  {b.address || 'Town / Junction Hub'}
                </p>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Phone size={14} />
                  <a href={`tel:${b.phone.split('/')[0].trim()}`}>{b.phone}</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Verified Credentials & GST */}
      <section id="credentials" style={{ padding: '80px 0', background: 'var(--bg-body)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: 650, margin: '0 auto 50px' }}>
            <span style={{ background: 'var(--warning-bg)', color: '#b45309', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', padding: '4px 12px', borderRadius: 'var(--radius-full)' }}>
              Verified Business
            </span>
            <h2 style={{ fontSize: '2.3rem', color: 'var(--primary-dark)', margin: '12px 0' }}>Government Registered Transporter</h2>
            <p style={{ color: 'var(--text-muted)' }}>Operating under the Goods and Services Tax Act with transparent order tracking and accountability.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            <div style={{ background: '#fff', border: '2px solid var(--secondary)', borderRadius: 'var(--radius-lg)', padding: '30px' }}>
              <div style={{ width: 50, height: 50, borderRadius: 'var(--radius-md)', background: 'rgba(243,156,18,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: '16px' }}>🏛️</div>
              <h3 style={{ fontSize: '1.35rem', marginBottom: '12px', color: 'var(--primary-dark)' }}>GST Registration Details</h3>
              <ul style={{ listStyle: 'none', fontSize: '0.95rem', lineHeight: '1.9', color: 'var(--text-main)' }}>
                <li><strong>Trade Name:</strong> ES TRANSPORTERS</li>
                <li><strong>Service Name:</strong> IGR QUICK PARCEL SERVICE</li>
                <li><strong>Proprietor:</strong> MATHAVAN</li>
                <li><strong>GSTIN:</strong> <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>34BJCPM0785J1Z3</span></li>
                <li><strong>Type:</strong> Regular Proprietorship</li>
                <li><strong>Registered Place:</strong> 32, Church Street, Karaikal, Puducherry - 609 602</li>
              </ul>
              <div style={{ marginTop: '20px' }}>
                <a href="/assets/images/gst_certificate.pdf" target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                  <ExternalLink size={14} />
                  <span>View Official GST Certificate (PDF)</span>
                </a>
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '30px' }}>
              <div style={{ width: 50, height: 50, borderRadius: 'var(--radius-md)', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: '16px' }}>📍</div>
              <h3 style={{ fontSize: '1.35rem', marginBottom: '12px', color: 'var(--primary-dark)' }}>Head Office (Karaikal)</h3>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                <strong>Operational Hub:</strong> No. 18, Sastha Nagar, Near Radio Station, Karaikal - 609 602<br />
                <strong>Registered Office:</strong> 32, Church Street, Karaikal - 609 602
              </p>
              <div style={{ fontSize: '0.95rem', lineHeight: 1.8 }}>
                <div>📞 <strong>Phone:</strong> <a href="tel:9360427527">93604 27527</a> / <a href="tel:9655566060">96555 66060</a></div>
                <div>⏰ <strong>Working Hours:</strong> Mon - Sat: 8:00 AM - 9:30 PM</div>
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '30px' }}>
              <div style={{ width: 50, height: 50, borderRadius: 'var(--radius-md)', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: '16px' }}>🏢</div>
              <h3 style={{ fontSize: '1.35rem', marginBottom: '12px', color: 'var(--primary-dark)' }}>Branch Office (Pondicherry)</h3>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                <strong>Hub Address:</strong> No. 9, Throwpathi Amman Kovil Street, Arumathapuram, Puducherry - 605 110
              </p>
              <div style={{ fontSize: '0.95rem', lineHeight: 1.8 }}>
                <div>📞 <strong>Phone:</strong> <a href="tel:9442485296">94424 85296</a> / <a href="tel:9360427527">93604 27527</a></div>
                <div>🚚 <strong>Regular Scheduled Dispatch:</strong> Daily Morning & Evening</div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Contact & Inquiry Section */}
      <section id="contact" style={{ padding: '80px 0', background: 'var(--bg-body)' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', alignItems: 'center' }}>
          <div>
            <span style={{ background: 'var(--warning-bg)', color: '#b45309', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', padding: '4px 12px', borderRadius: 'var(--radius-full)' }}>
              Direct Contact
            </span>
            <h2 style={{ fontSize: '2.3rem', color: 'var(--primary-dark)', margin: '12px 0' }}>Book Your Parcel Today</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
              Contact our stations directly or submit a booking request online. We offer counter drop-off and door delivery service across all 12 stations.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Phone size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>DIRECT HOTLINES</div>
                  <div style={{ fontWeight: 700, color: 'var(--primary-dark)' }}>
                    <a href="tel:9442485296">94424 85296</a> / <a href="tel:9360427527">93604 27527</a> / <a href="tel:9655566060">96555 66060</a>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MessageSquare size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>WHATSAPP QUICK CHAT</div>
                  <a href="https://wa.me/919360427527" target="_blank" rel="noreferrer" style={{ fontWeight: 700, color: '#15803d' }}>
                    Click to Message on WhatsApp (+91 93604 27527)
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '32px', boxShadow: 'var(--shadow-md)' }}>
            <h3 style={{ fontSize: '1.35rem', marginBottom: '16px', color: 'var(--primary-dark)' }}>Send a Booking Request</h3>
            <form onSubmit={handleInquirySubmit}>
              <div className="form-group">
                <label className="form-label">Your Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Aravind"
                  value={inquiryData.name}
                  onChange={(e) => setInquiryData({ ...inquiryData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number (10 Digits) *</label>
                <input
                  type="tel"
                  className="form-control"
                  placeholder="e.g. 9840123456"
                  value={inquiryData.phone}
                  maxLength={10}
                  onChange={(e) => setInquiryData({ ...inquiryData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">From Station</label>
                  <select
                    className="form-control"
                    value={inquiryData.from_station}
                    onChange={(e) => setInquiryData({ ...inquiryData, from_station: e.target.value })}
                  >
                    {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">To Station</label>
                  <select
                    className="form-control"
                    value={inquiryData.to_station}
                    onChange={(e) => setInquiryData({ ...inquiryData, to_station: e.target.value })}
                  >
                    {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Parcel / Cargo Description</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="e.g. 3 boxes of textiles, approx 15 kg"
                  value={inquiryData.message}
                  onChange={(e) => setInquiryData({ ...inquiryData, message: e.target.value })}
                ></textarea>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={inquirySubmitting}>
                {inquirySubmitting ? 'Sending Request...' : 'Send Booking Request'}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#0a192f', color: '#cbd5e1', padding: '60px 0 30px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1.2fr', gap: '40px', marginBottom: '40px' }}>
          <div>
            <div className="flex items-center gap-3" style={{ marginBottom: '16px' }}>
              <div style={{ width: 38, height: 38, background: 'linear-gradient(135deg, var(--primary), var(--accent))', color: '#fff', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                ES
              </div>
              <div>
                <h3 style={{ color: '#fff', fontSize: '1.15rem' }}>ES TRANSPORTERS</h3>
                <span style={{ color: '#fbd38d', fontSize: '0.75rem', fontWeight: 700 }}>IGR QUICK PARCEL SERVICE</span>
              </div>
            </div>
            <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
              Premier parcel and freight logistics service connecting Pondicherry, Karaikal, and Delta region with daily scheduled dispatches.
            </p>
          </div>

          <div>
            <h4 style={{ color: '#fff', marginBottom: '16px' }}>Quick Links</h4>
            <ul style={{ listStyle: 'none', fontSize: '0.9rem', lineHeight: '2' }}>
              <li><a href="#track" style={{ color: '#94a3b8' }}>Live Parcel Tracking</a></li>
              <li><a href="#branches" style={{ color: '#94a3b8' }}>12 Stations Network</a></li>
              <li><a href="#credentials" style={{ color: '#94a3b8' }}>GST Verification</a></li>
              <li><a href="#contact" style={{ color: '#94a3b8' }}>Book Parcel</a></li>
            </ul>
          </div>

          <div>
            <h4 style={{ color: '#fff', marginBottom: '16px' }}>Network Corridor</h4>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.8' }}>
              Pondicherry • Cuddalore • Chidambaram • Parangipettai • Sirkali • Mayiladuthurai • Karaikal • Nagore • Nagapattinam • Thiruvarur • Thiruthuraipoondi • Vedaranyam
            </p>
          </div>

          <div>
            <h4 style={{ color: '#fff', marginBottom: '16px' }}>Station Inquiries</h4>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}><strong>Karaikal:</strong> 32, Church St / Sastha Nagar</p>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: 4 }}><strong>Pondicherry:</strong> No. 9, Throwpathi Amman Kovil St</p>
            <p style={{ fontSize: '0.9rem', color: '#fbd38d', marginTop: 8, fontWeight: 'bold' }}>📞 94424 85296 / 93604 27527</p>
          </div>
        </div>

        <div className="container" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b' }}>
          <div>© 2026 ES TRANSPORTERS (IGR Quick Parcel Service). All rights reserved. GSTIN: 34BJCPM0785J1Z3</div>
          <div>Proprietor: MATHAVAN</div>
        </div>
      </footer>

      {/* Inquiry Confirmation Modal */}
      <SuccessModal
        isOpen={!!inquirySuccessModal}
        onClose={() => setInquirySuccessModal(null)}
        title={inquirySuccessModal?.title || 'Inquiry Sent!'}
        message={inquirySuccessModal?.message || 'We will reach out to you.'}
        details={inquirySuccessModal?.details}
        primaryButtonText="OK"
      />
    </div>
  );
};

export default WebsiteView;
