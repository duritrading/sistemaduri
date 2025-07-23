// src/components/NotificationsStatusIndicator.tsx - INDICADOR DE SAÚDE DO SISTEMA
'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';

interface NotificationSystemStatus {
  isHealthy: boolean;
  lastCheck: string;
  errorCount: number;
  message: string;
}

export function NotificationsStatusIndicator() {
  const [status, setStatus] = useState<NotificationSystemStatus>({
    isHealthy: true,
    lastCheck: new Date().toISOString(),
    errorCount: 0,
    message: 'Sistema funcionando'
  });

  const [isVisible, setIsVisible] = useState(false);

  // ✅ Verificar status do sistema periodicamente
  useEffect(() => {
    const checkSystemHealth = async () => {
      try {
        const response = await fetch('/api/notifications?userId=health-check', {
          signal: AbortSignal.timeout(5000)
        });

        const result = await response.json();
        
        if (result.success || result.data !== undefined) {
          setStatus({
            isHealthy: true,
            lastCheck: new Date().toISOString(),
            errorCount: 0,
            message: 'Sistema funcionando'
          });
          setIsVisible(false); // Esconder quando está tudo bem
        } else {
          setStatus(prev => ({
            isHealthy: false,
            lastCheck: new Date().toISOString(),
            errorCount: prev.errorCount + 1,
            message: result.error || 'Sistema indisponível'
          }));
          setIsVisible(true); // Mostrar quando há problemas
        }

      } catch (error) {
        setStatus(prev => ({
          isHealthy: false,
          lastCheck: new Date().toISOString(),
          errorCount: prev.errorCount + 1,
          message: 'Erro de conexão'
        }));
        setIsVisible(true);
      }
    };

    // Verificar imediatamente
    checkSystemHealth();

    // Verificar a cada 60 segundos
    const interval = setInterval(checkSystemHealth, 60000);

    return () => clearInterval(interval);
  }, []);

  // ✅ Auto-esconder após 30 segundos se sistema voltar ao normal
  useEffect(() => {
    if (status.isHealthy && isVisible) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 30000);

      return () => clearTimeout(timer);
    }
  }, [status.isHealthy, isVisible]);

  // ✅ Não renderizar se está tudo bem e não precisa mostrar
  if (!isVisible && status.isHealthy) {
    return null;
  }

  return (
    <div className={`
      fixed bottom-4 right-4 z-50 max-w-sm
      transform transition-all duration-500 ease-in-out
      ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}
    `}>
      <div className={`
        rounded-xl shadow-lg border p-4
        ${status.isHealthy 
          ? 'bg-green-50 border-green-200' 
          : 'bg-amber-50 border-amber-200'
        }
      `}>
        <div className="flex items-start space-x-3">
          {/* Ícone */}
          <div className={`
            flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
            ${status.isHealthy 
              ? 'bg-green-100' 
              : 'bg-amber-100'
            }
          `}>
            {status.isHealthy ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600" />
            )}
          </div>

          {/* Conteúdo */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className={`
                text-sm font-medium
                ${status.isHealthy ? 'text-green-800' : 'text-amber-800'}
              `}>
                {status.isHealthy ? 'Sistema Restaurado' : 'Sistema de Notificações'}
              </h4>
              
              <button
                onClick={() => setIsVisible(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ×
              </button>
            </div>
            
            <p className={`
              text-xs mt-1
              ${status.isHealthy ? 'text-green-600' : 'text-amber-600'}
            `}>
              {status.message}
            </p>

            {!status.isHealthy && (
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs text-amber-600">
                  <Clock className="w-3 h-3" />
                  <span>Tentativas: {status.errorCount}</span>
                </div>
                
                <div className="flex items-center space-x-1 text-xs text-amber-600">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Reconectando...</span>
                </div>
              </div>
            )}

            {status.isHealthy && (
              <p className="text-xs text-green-500 mt-1">
                As notificações voltaram a funcionar normalmente
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}