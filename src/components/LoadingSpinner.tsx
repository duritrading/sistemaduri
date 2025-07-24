// CRIAR: src/components/LoadingSpinner.tsx
// Spinner bonito para substituir loading genérico

'use client';

import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  fullScreen?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6', 
  lg: 'w-8 h-8',
  xl: 'w-12 h-12'
};

const textSizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg', 
  xl: 'text-xl'
};

export function LoadingSpinner({ 
  size = 'md', 
  text = 'Carregando...', 
  fullScreen = false,
  className = ''
}: LoadingSpinnerProps) {
  
  const spinnerContent = (
    <div className={`flex flex-col items-center justify-center space-y-3 ${className}`}>
      {/* ✅ SPINNER */}
      <div className="relative">
        <Loader2 
          className={`${sizeClasses[size]} text-red-500 animate-spin`} 
        />
        
        {/* ✅ PULSE RING EFFECT */}
        <div className={`absolute inset-0 ${sizeClasses[size]} border-2 border-red-200 rounded-full animate-ping opacity-20`}></div>
      </div>
      
      {/* ✅ TEXT */}
      {text && (
        <p className={`${textSizeClasses[size]} text-gray-600 font-medium animate-pulse`}>
          {text}
        </p>
      )}
    </div>
  );

  // ✅ FULL SCREEN VERSION
  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 border">
          {spinnerContent}
        </div>
      </div>
    );
  }

  // ✅ INLINE VERSION
  return spinnerContent;
}

// ✅ VARIANTES PRÉ-CONFIGURADAS
export function PageLoadingSpinner() {
  return (
    <LoadingSpinner 
      size="lg" 
      text="Carregando página..." 
      fullScreen 
    />
  );
}

export function ButtonLoadingSpinner({ text = 'Processando...' }: { text?: string }) {
  return (
    <LoadingSpinner 
      size="sm" 
      text={text}
      className="py-1"
    />
  );
}

export function DataLoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <LoadingSpinner 
        size="md" 
        text="Carregando dados..."
      />
    </div>
  );
}