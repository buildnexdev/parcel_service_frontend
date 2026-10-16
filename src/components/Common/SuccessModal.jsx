import React from 'react';
import { CheckCircle2, X } from 'lucide-react';

const SuccessModal = ({
  isOpen,
  onClose,
  title = 'Success!',
  message = 'Operation completed successfully.',
  details = null,
  primaryButtonText = 'OK',
  onPrimaryClick,
  secondaryButtonText = null,
  onSecondaryClick
}) => {
  if (!isOpen) return null;

  const handlePrimary = () => {
    if (onPrimaryClick) onPrimaryClick();
    else onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '460px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.05)',
          overflow: 'hidden',
          transform: 'scale(1)',
          animation: 'modalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          position: 'relative'
        }}
      >
        {/* Close cross top right */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            border: 'none',
            background: 'transparent',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        {/* Content Body */}
        <div style={{ padding: '32px 28px 24px', textAlign: 'center' }}>
          {/* Animated Success Badge */}
          <div
            style={{
              width: '68px',
              height: '68px',
              margin: '0 auto 18px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
              border: '2px solid #a7f3d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669',
              boxShadow: '0 8px 16px -4px rgba(16, 185, 129, 0.25)'
            }}
          >
            <CheckCircle2 size={38} strokeWidth={2.5} />
          </div>

          <h3
            style={{
              fontSize: '1.35rem',
              fontWeight: 800,
              color: '#0f172a',
              marginBottom: '8px',
              fontFamily: 'Outfit, sans-serif'
            }}
          >
            {title}
          </h3>

          <p
            style={{
              fontSize: '0.925rem',
              color: '#475569',
              lineHeight: 1.5,
              marginBottom: details ? '16px' : '24px'
            }}
          >
            {message}
          </p>

          {/* Details Card (Key-Value pairs or list) */}
          {details && (
            <div
              style={{
                background: '#f8fafc',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                padding: '14px 16px',
                marginBottom: '24px',
                textAlign: 'left',
                fontSize: '0.85rem'
              }}
            >
              {typeof details === 'object' && !Array.isArray(details) ? (
                Object.entries(details).map(([key, val]) => (
                  <div
                    key={key}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '5px 0',
                      borderBottom: '1px dashed #e2e8f0'
                    }}
                  >
                    <span style={{ color: '#64748b', fontWeight: 600 }}>{key}:</span>
                    <span style={{ color: '#0f172a', fontWeight: 700, fontFamily: key.toLowerCase().includes('vehicle') || key.toLowerCase().includes('lr') ? 'monospace' : 'inherit' }}>
                      {String(val || '—')}
                    </span>
                  </div>
                ))
              ) : (
                details
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center'
            }}
          >
            {secondaryButtonText && (
              <button
                type="button"
                onClick={() => {
                  if (onSecondaryClick) onSecondaryClick();
                  else onClose();
                }}
                style={{
                  flex: 1,
                  padding: '12px 18px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#334155',
                  fontWeight: 600,
                  fontSize: '0.925rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {secondaryButtonText}
              </button>
            )}

            <button
              type="button"
              onClick={handlePrimary}
              style={{
                flex: 1,
                padding: '12px 22px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
                transition: 'all 0.15s'
              }}
            >
              {primaryButtonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;
