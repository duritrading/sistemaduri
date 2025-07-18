// src/app/dashboard/page.tsx - Dashboard por empresa
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentCompany, clearCurrentCompany, filterTrackingsByCompany, type Company } from '@/lib/auth';

export default function DashboardPage() {
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [trackings, setTrackings] = useState<any[]>([]);
  const [allTrackings, setAllTrackings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const company = getCurrentCompany();
    if (!company) {
      router.push('/login');
      return;
    }
    setCurrentCompany(company);
    fetchTrackings();
  }, [router]);

  const fetchTrackings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/asana/trackings');
      const result = await response.json();
      
      if (result.success) {
        setAllTrackings(result.data);
        
        const company = getCurrentCompany();
        if (company) {
          const filteredTrackings = filterTrackingsByCompany(result.data, company.name);
          setTrackings(filteredTrackings);
        }
      } else {
        setError(result.error || 'Erro ao carregar trackings');
      }
    } catch (err) {
      setError('Erro de conexão');
      console.error('Error fetching trackings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearCurrentCompany();
    router.push('/login');
  };

  if (!currentCompany) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {currentCompany.displayName}
            </h1>
            <p className="text-sm text-gray-500">
              Sistema de Tracking Marítimo
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={fetchTrackings}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              🔄 Atualizar
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Seus Processos de Importação
          </h2>
          <p className="text-gray-600">
            Acompanhe o status dos seus processos em tempo real
          </p>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Carregando seus processos...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-200 rounded-lg p-6 mb-8">
            <p className="text-red-800 font-medium">❌ Erro:</p>
            <p className="text-red-700">{error}</p>
            <button 
              onClick={fetchTrackings}
              className="mt-3 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Tentar Novamente
            </button>
          </div>
        )}

        {!loading && !error && trackings.length === 0 && (
          <div className="bg-yellow-100 border border-yellow-200 rounded-lg p-8 text-center">
            <h3 className="text-xl font-semibold text-yellow-800 mb-2">
              📦 Nenhum processo encontrado
            </h3>
            <p className="text-yellow-700">
              Não há processos para <strong>{currentCompany.displayName}</strong> no momento.
            </p>
          </div>
        )}

        {!loading && !error && trackings.length > 0 && (
          <>
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800">
                📊 <strong>{trackings.length}</strong> processo{trackings.length !== 1 ? 's' : ''} encontrado{trackings.length !== 1 ? 's' : ''} para <strong>{currentCompany.displayName}</strong>
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {trackings.map((tracking) => (
                <Link
                  key={tracking.id}
                  href={`/tracking/${tracking.id}`}
                  className="bg-white p-6 rounded-lg shadow border hover:shadow-lg transition-all duration-200 hover:scale-105 group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {tracking.title}
                    </h3>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                      {tracking.status}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 mb-4 text-sm line-clamp-2">
                    {tracking.description || 'Processo de importação marítima'}
                  </p>
                  
                  <div className="space-y-2 text-xs text-gray-500">
                    {tracking.transport?.vessel && (
                      <div className="flex items-center gap-2">
                        🚢 <span>Navio: {tracking.transport.vessel}</span>
                      </div>
                    )}
                    
                    {tracking.transport?.company && (
                      <div className="flex items-center gap-2">
                        🏢 <span>Armador: {tracking.transport.company}</span>
                      </div>
                    )}
                    
                    {tracking.schedule?.eta && (
                      <div className="flex items-center gap-2">
                        📅 <span>ETA: {tracking.schedule.eta}</span>
                      </div>
                    )}
                    
                    {tracking.schedule?.responsible && (
                      <div className="flex items-center gap-2">
                        👤 <span>Responsável: {tracking.schedule.responsible}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-xs text-gray-400">
                      Atualizado: {tracking.lastUpdate}
                    </span>
                    <span className="text-blue-600 font-medium text-sm group-hover:text-blue-800 transition-colors">
                      Ver Detalhes →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}