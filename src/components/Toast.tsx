// CRIAR: src/components/Toast.tsx
// Toast bonito para erros de login e outras notificações

'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, XCircle, X } from 'lucide-react';

type ToastType = 'success' | 'warning' | 'error';

interface ToastProps {
  isOpen: boolean;
  type: ToastType;
  title: string;
  message: string;
  onClose: () => void;
  autoCloseSeconds?: number;
}

const toastConfig = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-500',
    borderColor: 'border-green-200',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600'
  },
  warning: {
    icon: AlertCircle,
    bgColor: 'bg-yellow-500',
    borderColor: 'border-yellow-200', 
    iconBg: 'bg-yellow-100',
    iconColor: 'text-yellow-600'
  },
  error: {
    icon: XCircle,
    bgColor: 'bg-red-500',
    borderColor: 'border-red-200',
    iconBg: 'bg-red-100', 
    iconColor: 'text-red-600'
  }
};

export function Toast({ 
  isOpen, 
  type, 
  title, 
  message, 
  onClose,
  autoCloseSeconds = 4
}: ToastProps) {
  const [countdown, setCountdown] = useState(autoCloseSeconds);
  const config = toastConfig[type];
  const Icon = config.icon;

  // ✅ AUTO CLOSE
  useEffect(() => {
    if (!isOpen) {
      setCountdown(autoCloseSeconds);
      return;
    }

    if (countdown <= 0) {
      onClose();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [isOpen, countdown, onClose, autoCloseSeconds]);

  if (!isOpen) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full">
      <div className={`bg-white border-l-4 ${config.borderColor} rounded-lg shadow-lg overflow-hidden animate-slide-in`}>
        
        {/* ✅ PROGRESS BAR */}
        <div className="h-1 bg-gray-100">
          <div 
            className={`h-full ${config.bgColor} transition-all duration-1000 ease-linear`}
            style={{ 
              width: `${((autoCloseSeconds - countdown) / autoCloseSeconds) * 100}%` 
            }}
          ></div>
        </div>

        {/* ✅ CONTENT */}
        <div className="p-4">
          <div className="flex items-start space-x-3">
            
            {/* ✅ ICON */}
            <div className={`w-8 h-8 ${config.iconBg} rounded-full flex items-center justify-center flex-shrink-0`}>
              <Icon size={18} className={config.iconColor} />
            </div>

            {/* ✅ TEXT */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-gray-900 mb-1">
                {title}
              </h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                {message}
              </p>
            </div>

            {/* ✅ CLOSE BUTTON */}
            <button
              onClick={onClose}
              className="flex-shrink-0 w-6 h-6 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ✅ STYLES */}
      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

// ✅ HOOK PARA USAR TOAST FACILMENTE
export function useToast() {
  const [toast, setToast] = useState({
    isOpen: false,
    type: 'error' as ToastType,
    title: '',
    message: ''
  });

  const showToast = (type: ToastType, title: string, message: string) => {
    setToast({
      isOpen: true,
      type,
      title,
      message
    });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, isOpen: false }));
  };

  const showError = (title: string, message: string) => {
    showToast('error', title, message);
  };

  const showSuccess = (title: string, message: string) => {
    showToast('success', title, message);
  };

  const showWarning = (title: string, message: string) => {
    showToast('warning', title, message);
  };

  return {
    toast,
    showToast,
    hideToast,
    showError,
    showSuccess,
    showWarning,
    // Componente para renderizar
    ToastComponent: () => (
      <Toast
        isOpen={toast.isOpen}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={hideToast}
      />
    )
  };
}