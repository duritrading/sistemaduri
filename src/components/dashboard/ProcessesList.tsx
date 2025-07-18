// src/components/dashboard/ProcessesList.tsx
'use client';

import { Ship, Package, Clock, User, MapPin, Building2 } from 'lucide-react';

interface ProcessCardProps {
  process: any;
  onViewDetails: (id: string) => void;
}

function ProcessCard({ process, onViewDetails }: ProcessCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Concluído': return 'bg-green-100 text-green-800 border-green-200';
      case 'Em Progresso': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-sm text-gray-900">{process.title}</h3>
        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(process.status)}`}>
          {process.status}
        </span>
      </div>
      
      <div className="space-y-2 text-xs text-gray-600">
        {process.transport?.vessel && (
          <div className="flex items-center">
            <Ship className="w-3 h-3 mr-2 text-blue-600" />
            <span className="font-medium">Navio:</span>
            <span className="ml-1">{process.transport.vessel}</span>
          </div>
        )}
        
        {process.transport?.company && (
          <div className="flex items-center">
            <Building2 className="w-3 h-3 mr-2 text-orange-600" />
            <span className="font-medium">Armador:</span>
            <span className="ml-1">{process.transport.company}</span>
          </div>
        )}
        
        {process.transport?.exporter && (
          <div className="flex items-center">
            <Package className="w-3 h-3 mr-2 text-green-600" />
            <span className="font-medium">Exportador:</span>
            <span className="ml-1">{process.transport.exporter}</span>
          </div>
        )}
        
        {process.schedule?.responsible && (
          <div className="flex items-center">
            <User className="w-3 h-3 mr-2 text-purple-600" />
            <span className="font-medium">Responsável:</span>
            <span className="ml-1">{process.schedule.responsible}</span>
          </div>
        )}
        
        {process.schedule?.eta && (
          <div className="flex items-center">
            <Clock className="w-3 h-3 mr-2 text-red-600" />
            <span className="font-medium">ETA:</span>
            <span className="ml-1">{process.schedule.eta}</span>
          </div>
        )}
        
        {process.transport?.terminal && (
          <div className="flex items-center">
            <MapPin className="w-3 h-3 mr-2 text-indigo-600" />
            <span className="font-medium">Terminal:</span>
            <span className="ml-1">{process.transport.terminal}</span>
          </div>
        )}
      </div>
      
      <div className="mt-4 flex justify-between items-center">
        <span className="text-xs text-gray-400">
          Atualizado: {process.lastUpdate}
        </span>
        <button
          onClick={() => onViewDetails(process.id)}
          className="text-blue-600 hover:text-blue-800 text-xs font-medium"
        >
          Ver Detalhes →
        </button>
      </div>
    </div>
  );
}

export function ProcessesList({ processes }: { processes: any[] }) {
  const handleViewDetails = (id: string) => {
    window.open(`/tracking/${id}`, '_blank');
  };

  return (
    <div className="bg-white rounded-lg shadow border">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <Ship className="mr-3 text-blue-600" size={24} />
          Seus Processos de Importação ({processes.length})
        </h2>
        <button className="text-sm text-gray-500 hover:text-gray-700">
          Ocultar Métricas
        </button>
      </div>
      
      <div className="p-6">
        {processes.length === 0 ? (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum processo encontrado
            </h3>
            <p className="text-gray-500">
              Não há processos de importação no momento.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {processes.map((process) => (
              <ProcessCard
                key={process.id}
                process={process}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}