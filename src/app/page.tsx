// src/app/page.tsx - Versão sem Navigation
import { Suspense } from 'react';
import { TrackingGrid } from '@/components/TrackingGrid';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero inline */}
      <section className="bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 text-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold sm:text-6xl mb-6">
            Sistema de Tracking Marítimo
          </h1>
          <p className="text-xl opacity-90 max-w-3xl mx-auto mb-8">
            Acompanhe suas importações em tempo real com dados sincronizados diretamente do Asana
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <div className="bg-white/20 px-4 py-2 rounded-full">
              🔄 Sincronização automática
            </div>
            <div className="bg-white/20 px-4 py-2 rounded-full">
              📊 Projeto Operacional
            </div>
            <div className="bg-white/20 px-4 py-2 rounded-full">
              ⚡ Tempo real
            </div>
          </div>
        </div>
      </section>

      <Suspense fallback={<LoadingTrackings />}>
        <TrackingGrid />
      </Suspense>
    </div>
  );
}

function LoadingTrackings() {
  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Carregando Trackings...
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-sm border animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}