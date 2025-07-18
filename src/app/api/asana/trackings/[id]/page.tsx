// src/app/tracking/[id]/page.tsx - Página individual do tracking (protegida)
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentCompany, filterTrackingsByCompany } from '@/lib/auth';
import { TrackingDashboard } from '@/components/TrackingDashboard';

interface Props {
  params: { id: string };
}

export default function TrackingPage({ params }: Props) {
  const [trackingData, setTrackingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const company = getCurrentCompany();
    if (!company) {
      router.push('/login');
      return;
    }
    
    fetchAndValidateTracking(company);
  }, [params.id, router]);

  const fetchAndValidateTracking = async (company: any) => {
    try {
      setLoading(true);
      
      // Buscar todos os trackings
      const response = await fetch('/api/asana/trackings');
      const result = await response.json();
      
      if (!result.success) {
        setError(result.error);
        return;
      }

      // Filtrar por empresa
      const companyTrackings = filterTrackingsByCompany(result.data, company.name);
      
      // Verificar se o tracking pertence à empresa
      const tracking = companyTrackings.find(t => t.id === params.id);
      
      if (!tracking) {
        setError('Processo não encontrado ou você não tem acesso a ele');
        return;
      }

      setTrackingData(tracking);
      setAuthorized(true);
      
    } catch (err) {
      setError('Erro ao carregar processo');
      console.error('Error fetching tracking:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Carregando processo...</p>
        </div>
      </div>
    );
  }

  if (error || !authorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Acesso Negado</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <TrackingDashboard data={trackingData} />;
}