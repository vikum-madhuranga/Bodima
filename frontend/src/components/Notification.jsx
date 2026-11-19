import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Notification({ notifications, onDismiss }) {
  if (!notifications || notifications.length === 0) return null;

  return (
    <div className="toast-container">
      {notifications.map((n) => (
        <div key={n.id} className={`toast toast-${n.type || 'info'}`}>
          <div style={{ flexShrink: 0 }}>
            {n.type === 'success' && <CheckCircle2 size={18} />}
            {n.type === 'error' && <AlertCircle size={18} />}
            {(!n.type || n.type === 'info') && <Info size={18} />}
          </div>
          <div style={{ flex: 1, wordBreak: 'break-word' }}>
            {n.message}
          </div>
          <button 
            onClick={() => onDismiss(n.id)} 
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'inherit', 
              cursor: 'pointer', 
              opacity: 0.8,
              display: 'flex',
              alignItems: 'center',
              padding: '2px'
            }}
          >
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
