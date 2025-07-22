// src/components/ChartsDashboard.tsx - COMPONENTE ISOLADO PARA GRÁFICOS
'use client';

import { ChartsSection } from './ChartsSection';

// ✅ INTERFACES - Mesmas do KPIDashboard
interface Tracking {
  id: string;
  title: string;
  company: string;
  ref: string;
  status: string;
  maritimeStatus: string;
  transport: {
    exporter: string | null;
    company: string | null;
    vessel: string | null;
    blAwb: string | null;
    containers: string[];
    terminal: string | null;
    products: string[];
    transportadora: string | null;
    despachante: string | null;
  };
  schedule: {
    etd: string | null;
    eta: string | null;
    fimFreetime: string | null;
    fimArmazenagem: string | null;
    responsible: string | null;
  };
  business: {
    empresa: string | null;
    servicos: string | null;
    beneficioFiscal: string | null;
    canal: string | null;
    prioridade: string | null;
    adiantamento: string | null;
  };
  documentation: {
    invoice: string | null;
    blAwb: string | null;
  };
  regulatory: {
    orgaosAnuentes: string[];
  };
  customFields: Record<string, any>;
}

// ✅ PROPS DO COMPONENTE CHARTS
interface ChartsDashboardProps {
  filteredTrackings: Tracking[];
  loading?: boolean;
}

export function ChartsDashboard({ 
  filteredTrackings, 
  loading = false 
}: ChartsDashboardProps) {

  if (loading) {
    return (
      <div id="graficos" className="scroll-mt-16">
        <div className="mb-6">
          <div className="h-8 bg-gray-200 rounded mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white border rounded-lg p-6">
              <div className="h-6 bg-gray-200 rounded mb-4 animate-pulse"></div>
              <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div id="graficos" className="scroll-mt-16">
      {/* ✅ HEADER da seção Gráficos */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Gráficos Operacionais</h2>
        <p className="text-gray-600">
          Visualização dos dados de tracking marítimo • {filteredTrackings.length} operações
        </p>
      </div>
      
      {/* ✅ SEÇÃO DE GRÁFICOS */}
      {filteredTrackings.length > 0 ? (
        <ChartsSection trackings={filteredTrackings} />
      ) : (
        <div className="bg-white border rounded-lg p-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhum dado para exibir
            </h3>
            <p className="text-gray-600 mb-4">
              Não há operações para gerar os gráficos. Verifique os filtros aplicados.
            </p>
            <div className="text-sm text-gray-500">
              Os gráficos serão exibidos automaticamente quando houver dados disponíveis
            </div>
          </div>
        </div>
      )}
    </div>
  );
}