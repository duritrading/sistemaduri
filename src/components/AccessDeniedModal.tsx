// CRIAR: src/components/AccessDeniedModal.tsx
// Modal bonito para substituir alert() feio

'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, X, LogOut } from 'lucide-react';

interface AccessDeniedModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  autoCloseSeconds?: number;
}

export function AccessDeniedModal({ 
  isOpen, 
  title, 
  message, 
  onConfirm,
  autoCloseSeconds = 5 
}: AccessDeniedModalProps) {
  const [countdown, setCountdown] = useState(autoCloseSeconds);

  // ✅ COUNTDOWN AUTOMÁTICO
  useEffect(() => {
    if (!isOpen) {
      setCountdown(autoCloseSeconds);
      return;
    }

    if (countdown <= 0) {
      onConfirm();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [isOpen, countdown, onConfirm, autoCloseSeconds]);

  if (!isOpen) return null;

  return (
    <>
      {/* ✅ BACKDROP */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        {/* ✅ MODAL */}
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in duration-200">
          
          {/* ✅ HEADER */}
          <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <AlertTriangle size={24} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{title}</h2>
                  <p className="text-red-100 text-sm">Acesso negado</p>
                </div>
              </div>
              
              <button
                onClick={onConfirm}
                className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* ✅ BODY */}
          <div className="p-6">
            <p className="text-gray-700 leading-relaxed mb-6">
              {message}
            </p>

            {/* ✅ COUNTDOWN */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span>
                  Redirecionamento automático em <strong>{countdown}s</strong>
                </span>
              </div>
              
              {/* ✅ PROGRESS BAR */}
              <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
                <div 
                  className="bg-red-500 h-1 rounded-full transition-all duration-1000 ease-linear"
                  style={{ 
                    width: `${((autoCloseSeconds - countdown) / autoCloseSeconds) * 100}%` 
                  }}
                ></div>
              </div>
            </div>

            {/* ✅ ACTIONS */}
            <div className="flex space-x-3">
              <button
                onClick={onConfirm}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <LogOut size={18} />
                <span>Ir para Login</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ STYLES PARA ANIMAÇÕES */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes zoom-in {
          from {
            transform: scale(0.95);
          }
          to {
            transform: scale(1);
          }
        }

        .animate-in {
          animation: fade-in 0.2s ease-out, zoom-in 0.2s ease-out;
        }
      `}</style>
    </>
  );
}