// src/app/page.tsx - Versão client-side simples
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const [trackings, setTrackings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTrackings();
  }, []);

  const fetchTrackings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/asana/trackings');
      const result = await response.json();
      
      if (result.success) {
        setTrackings(result.data);
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 text-white py-24">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-6">
            Sistema de Tracking Marítimo
          </h1>
          <p className="text-xl opacity-90 mb-8">
            Dados sincronizados do projeto Operacional no Asana
          </p>
          <div className="flex justify-center gap-4 text-sm">
            <span className="bg-white/20 px-4 py-2 rounded-full">
              🔄 Sincronização automática
            </span>
            <span className="bg-white/20 px-4 py-2 rounded-full">
              📊 Projeto Operacional
            </span>
          </div>
        </div>
      </section>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gray-900">
            Portfolio
          </Link>
          <div className="flex space-x-6">
            <Link href="/" className="text-blue-600 font-medium">
              Home
            </Link>
            <Link href="/15porcelanosa" className="text-gray-600 hover:text-gray-900">
              15 Porcelanosa
            </Link>
            <Link href="/645univar" className="text-gray-600 hover:text-gray-900">
              645 Univar
            </Link>
            <a 
              href="/api/test-asana" 
              target="_blank" 
              className="text-blue-600 text-sm hover:text-blue-800"
            >
              🔧 Debug
            </a>
            <button 
              onClick={fetchTrackings}
              className="text-green-600 text-sm hover:text-green-800"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Trackings Marítimos
            </h2>
            
            {loading && (
              <p className="text-gray-600">Carregando dados do Asana...</p>
            )}
            
            {error && (
              <div className="bg-red-100 border border-red-200 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-red-800 font-medium">❌ Erro:</p>
                <p className="text-red-700">{error}</p>
                <div className="mt-3 space-x-2">
                  <button 
                    onClick={fetchTrackings}
                    className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                  >
                    Tentar Novamente
                  </button>
                  <a 
                    href="/api/test-asana" 
                    target="_blank"
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 inline-block"
                  >
                    Testar Asana
                  </a>
                </div>
              </div>
            )}

            {!loading && !error && trackings.length === 0 && (
              <div className="bg-yellow-100 border border-yellow-200 rounded-lg p-6 max-w-md mx-auto">
                <p className="text-yellow-800 font-medium">📦 Nenhum tracking encontrado</p>
                <p className="text-yellow-700 text-sm mt-2">
                  Adicione tasks no projeto "Operacional" do Asana
                </p>
                <a 
                  href="https://app.asana.com" 
                  target="_blank"
                  className="mt-3 bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700 inline-block"
                >
                  Abrir Asana
                </a>
              </div>
            )}
          </div>

          {/* Trackings Grid */}
          {!loading && !error && trackings.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {trackings.map((tracking) => (
                <Link
                  key={tracking.id}
                  href={`/${tracking.id}`}
                  className="bg-white p-6 rounded-lg shadow border hover:shadow-lg transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {tracking.title}
                    </h3>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                      {tracking.status}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 mb-4 text-sm">
                    {tracking.description || 'Sem descrição'}
                  </p>
                  
                  <div className="space-y-1 text-xs text-gray-500">
                    {tracking.transport?.vessel && (
                      <div>🚢 {tracking.transport.vessel}</div>
                    )}
                    {tracking.transport?.company && (
                      <div>🏢 {tracking.transport.company}</div>
                    )}
                    {tracking.schedule?.eta && (
                      <div>📅 ETA: {tracking.schedule.eta}</div>
                    )}
                  </div>
                  
                  <div className="mt-4 pt-3 border-t text-right">
                    <span className="text-blue-600 text-sm font-medium">
                      Ver Detalhes →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}