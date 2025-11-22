import React, { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose?: () => void;
}

/**
 * Toast notification component for displaying temporary messages
 */
export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 5000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      if (onClose) {
        onClose();
      }
    }, 300); // Match animation duration
  };

  if (!isVisible) {
    return null;
  }

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: '#4caf50',
          icon: '✓',
        };
      case 'error':
        return {
          backgroundColor: '#f44336',
          icon: '✕',
        };
      case 'warning':
        return {
          backgroundColor: '#ff9800',
          icon: '⚠',
        };
      case 'info':
      default:
        return {
          backgroundColor: '#2196f3',
          icon: 'ℹ',
        };
    }
  };

  const typeStyles = getTypeStyles();

  return (
    <div
      style={{
        ...styles.container,
        backgroundColor: typeStyles.backgroundColor,
        animation: isExiting ? 'slideOut 0.3s ease-out' : 'slideIn 0.3s ease-out',
      }}
    >
      <span style={styles.icon}>{typeStyles.icon}</span>
      <span style={styles.message}>{message}</span>
      <button onClick={handleClose} style={styles.closeButton}>
        ×
      </button>
      <style>{keyframes}</style>
    </div>
  );
};

const styles = {
  container: {
    position: 'fixed' as const,
    top: '20px',
    right: '20px',
    minWidth: '300px',
    maxWidth: '500px',
    padding: '16px 20px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    color: 'white',
    fontSize: '14px',
    zIndex: 9999,
  },
  icon: {
    fontSize: '20px',
    fontWeight: 'bold' as const,
  },
  message: {
    flex: 1,
    lineHeight: '1.4',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '0',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.8,
    transition: 'opacity 0.2s',
  },
};

const keyframes = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;

/**
 * Toast container for managing multiple toasts
 */
interface ToastContainerProps {
  toasts: Array<ToastProps & { id: string }>;
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  return (
    <div style={containerStyles.wrapper}>
      {toasts.map((toast, index) => (
        <div key={toast.id} style={{ ...containerStyles.item, top: `${20 + index * 80}px` }}>
          <Toast {...toast} onClose={() => onRemove(toast.id)} />
        </div>
      ))}
    </div>
  );
};

const containerStyles = {
  wrapper: {
    position: 'fixed' as const,
    top: 0,
    right: 0,
    zIndex: 9999,
  },
  item: {
    position: 'absolute' as const,
    right: 0,
  },
};
