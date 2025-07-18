// src/app/page.tsx - Updated para buscar dados reais do Asana
import { Suspense } from 'react';
import { TrackingGrid } from '@/components/TrackingGrid';
import { HeroSection } from '@/components/HeroSection';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <HeroSection />
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
          Trackings Marítimos
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