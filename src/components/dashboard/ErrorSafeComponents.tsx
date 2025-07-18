// src/components/dashboard/ErrorSafeComponents.tsx - Padrão para prevenir erros
'use client';

import { safeAccess } from '@/utils/defensive';

// Example: Safe Dashboard component that prevents undefined errors
export function SafeDashboard({ trackings, metrics }: { trackings?: any[], metrics?: any }) {
  // Apply null safety at component entry
  const safeTrackings = safeAccess.array(trackings);
  const safeMetrics = safeAccess.object(metrics);

  return (
    <div className="space-y-6">
      {/* Safe access to array length */}
      <h1>Total Processes: {safeTrackings.length}</h1>
      
      {/* Safe access to object properties */}
      <div>
        Active: {safeAccess.number(safeMetrics.activeOperations)}
        Completed: {safeAccess.number(safeMetrics.completedOperations)}
      </div>

      {/* Safe map operation */}
      {safeTrackings.map((tracking, index) => (
        <div key={tracking?.id || index}>
          {safeAccess.string(tracking?.title, 'Untitled Process')}
        </div>
      ))}
    </div>
  );
}

// Pattern for handling async data loading states
export function DataSafeComponent({ data, loading, error }: { 
  data?: any[], 
  loading?: boolean, 
  error?: string 
}) {
  // Loading state protection
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3">Carregando dados...</span>
      </div>
    );
  }

  // Error state protection
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
        <strong>Erro:</strong> {error}
      </div>
    );
  }

  // Data validation with fallback
  const safeData = safeAccess.array(data);
  
  if (safeData.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        Nenhum dado disponível
      </div>
    );
  }

  return (
    <div>
      {safeData.map((item, index) => (
        <div key={item?.id || index}>
          {safeAccess.string(item?.name, `Item ${index + 1}`)}
        </div>
      ))}
    </div>
  );
}

// Type-safe prop interface pattern
interface TypeSafeProps {
  trackings: any[];  // Required array
  company?: any;     // Optional object
  metrics?: {        // Optional typed object
    total: number;
    active: number;
  };
}

export function TypeSafeComponent({ trackings, company, metrics }: TypeSafeProps) {
  // Validate required props at entry
  if (!Array.isArray(trackings)) {
    console.error('TypeSafeComponent: trackings prop must be an array');
    return <div>Erro: dados inválidos</div>;
  }

  // Safe optional prop access
  const companyName = company?.name || 'N/A';
  const totalMetrics = metrics?.total || 0;

  return (
    <div>
      <h2>{companyName} - {trackings.length} Processes</h2>
      <p>Total Metrics: {totalMetrics}</p>
    </div>
  );
}