// src/components/TrackingDashboard.tsx - Add refresh button
import { useState } from 'react';

interface Props {
  data: any;
}

export function TrackingDashboard({ data }: Props) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      window.location.reload(); // Simple refresh for now
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-blue-500">
      <div className="bg-gradient-to-r from-slate-700 to-slate-600 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-2">{data.title}</h1>
          <p className="text-lg opacity-90 flex items-center justify-center gap-2">
            🚢 Processo de Importação Marítima Internacional
          </p>
          <div className="mt-4 flex justify-center gap-4">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {isRefreshing ? '🔄 Atualizando...' : '🔄 Atualizar do Asana'}
            </button>
            <span className="bg-green-500/20 px-3 py-2 rounded-lg text-sm">
              📊 Dados do projeto Operacional
            </span>
          </div>
        </div>
      </div>

      {/* Rest of the component... */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Existing content... */}
        </div>
      </div>
    </div>
  );
}