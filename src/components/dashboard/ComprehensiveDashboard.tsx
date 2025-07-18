// src/components/dashboard/ComprehensiveDashboard.tsx
'use client';

import { Ship, Package, Clock, User, MapPin, Building2, Calendar, AlertTriangle, CheckCircle, FileText, TrendingUp } from 'lucide-react';

interface ComprehensiveDashboardProps {
  trackings: any[];
  metrics: any;
}

export function ComprehensiveDashboard({ trackings, metrics }: ComprehensiveDashboardProps) {
  return (
    <div className="space-y-8">
      {/* Operational Summary Cards - Layout da Imagem 2 */}
      <OperationalSummaryCards metrics={metrics} />
      
      {/* Status Distribution Chart */}
      <StatusDistributionCard metrics={metrics} />
      
      {/* ETD Chronogram */}
      <ETDChronogramCard metrics={metrics} />
      
      {/* Products Chart */}
      <ProductsCard metrics={metrics} />
      
      {/* Top Exporters */}
      <TopExportersCard trackings={trackings} />
      
      {/* Armadores */}
      <ArmadoresCard trackings={trackings} />
      
      {/* Órgãos Anuentes */}
      <OrgaosAnuentesCard metrics={metrics} />
    </div>
  );
}

function OperationalSummaryCards({ metrics }: { metrics: any }) {
  const cards = [
    {
      title: 'Total de Operações',
      value: metrics.totalOperations,
      icon: Package,
      color: 'from-orange-500 to-orange-600'
    },
    {
      title: 'Taxa de Efetividade',
      value: `${metrics.effectiveRate}%`,
      icon: CheckCircle,
      color: 'from-orange-500 to-orange-600'
    },
    {
      title: 'Total de Containers',
      value: metrics.totalContainers,
      icon: Package,
      color: 'from-orange-500 to-orange-600'
    },
    {
      title: 'Com Adiantamento',
      value: metrics.withDelays,
      icon: AlertTriangle,
      color: 'from-orange-500 to-orange-600'
    },
    {
      title: 'Operações Ativas',
      value: metrics.activeOperations,
      icon: TrendingUp,
      color: 'from-orange-500 to-orange-600'
    },
    {
      title: 'Embarques Jul/25',
      value: metrics.embarquesThisMonth,
      icon: Ship,
      color: 'from-orange-500 to-orange-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div key={index} className={`bg-gradient-to-br ${card.color} rounded-xl p-6 text-white shadow-lg`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">{card.title}</p>
                <p className="text-3xl font-bold mt-2">{card.value}</p>
              </div>
              <Icon className="h-8 w-8 text-orange-200" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatusDistributionCard({ metrics }: { metrics: any }) {
  const statusData = Object.entries(metrics.statusDistribution).map(([name, value]) => ({
    name,
    value,
    color: getStatusColor(name)
  }));

  const statusCards = [
    { name: 'A Embarcar', count: statusData.find(s => s.name === 'A Embarcar')?.value || 0, color: 'border-l-orange-500', description: 'Aguardando documentação e booking' },
    { name: 'Em Trânsito', count: statusData.find(s => s.name === 'Em Trânsito')?.value || 0, color: 'border-l-blue-500', description: 'Cargas navegando para o Brasil' },
    { name: 'No Porto', count: statusData.find(s => s.name === 'No Porto')?.value || 0, color: 'border-l-gray-500', description: 'Aguardando desembarque' },
    { name: 'Em Fechamento', count: statusData.find(s => s.name === 'Em Fechamento')?.value || 0, color: 'border-l-yellow-500', description: 'Finalizando documentação' },
    { name: 'Cancelado', count: statusData.find(s => s.name === 'Cancelado')?.value || 0, color: 'border-l-red-500', description: 'Processo cancelado' }
  ];

  return (
    <div className="bg-white rounded-lg shadow border">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <FileText className="mr-3 text-blue-600" size={20} />
          Distribuição por Status
        </h3>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {statusCards.map((status, index) => (
            <div key={index} className={`bg-white border-l-4 ${status.color} p-4 rounded-r-lg shadow-sm`}>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{status.count}</div>
                <div className="text-sm font-medium text-gray-700 mt-1">{status.name}</div>
                <div className="text-xs text-gray-500 mt-2">{status.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ETDChronogramCard({ metrics }: { metrics: any }) {
  const etdData = Object.entries(metrics.etdChronogram)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return (
    <div className="bg-white rounded-lg shadow border">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Calendar className="mr-3 text-green-600" size={20} />
          Cronograma ETD
        </h3>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {etdData.map((item, index) => (
            <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{item.count}</div>
              <div className="text-sm text-gray-600">{item.month}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductsCard({ metrics }: { metrics: any }) {
  const topProducts = Object.entries(metrics.products)
    .map(([name, count]) => ({ name, count }))
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 8);

  return (
    <div className="bg-white rounded-lg shadow border">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Package className="mr-3 text-purple-600" size={20} />
          Produtos Principais
        </h3>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {topProducts.map((product: any, index) => (
            <div key={index} className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <span className="text-sm font-medium text-gray-900">{product.name}</span>
              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full font-medium">
                {product.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TopExportersCard({ trackings }: { trackings: any[] }) {
  const exporters: Record<string, number> = {};
  
  trackings.forEach(tracking => {
    const exporter = tracking.transport?.exporter || 'Não informado';
    if (exporter && exporter !== 'Não informado') {
      exporters[exporter] = (exporters[exporter] || 0) + 1;
    }
  });

  const topExporters = Object.entries(exporters)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return (
    <div className="bg-white rounded-lg shadow border">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Building2 className="mr-3 text-green-600" size={20} />
          Top Exportadores
        </h3>
      </div>
      <div className="p-6">
        <div className="space-y-3">
          {topExporters.map((exporter, index) => (
            <div key={index} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="text-sm font-medium text-gray-900">{exporter.name}</span>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                {exporter.count} operações
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ArmadoresCard({ trackings }: { trackings: any[] }) {
  const companies: Record<string, { count: number, vessels: Set<string> }> = {};
  
  trackings.forEach(tracking => {
    const company = tracking.transport?.company;
    const vessel = tracking.transport?.vessel;
    
    if (company && company !== '' && company !== 'Não informado') {
      if (!companies[company]) {
        companies[company] = { count: 0, vessels: new Set() };
      }
      companies[company].count++;
      
      if (vessel && vessel !== '') {
        companies[company].vessels.add(vessel);
      }
    }
  });

  const topCompanies = Object.entries(companies)
    .map(([name, data]) => ({ 
      name, 
      count: data.count,
      vessels: Array.from(data.vessels).slice(0, 3)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return (
    <div className="bg-white rounded-lg shadow border">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Ship className="mr-3 text-blue-600" size={20} />
          Armadores
        </h3>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {topCompanies.map((company, index) => (
            <div key={index} className="p-4 bg-blue-50 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <span className="font-medium text-gray-900">{company.name}</span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                  {company.count}
                </span>
              </div>
              {company.vessels.length > 0 && (
                <div className="text-xs text-gray-600">
                  Navios: {company.vessels.join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OrgaosAnuentesCard({ metrics }: { metrics: any }) {
  const orgaos = Object.entries(metrics.orgaosAnuentes)
    .map(([name, count]) => ({ name, count }))
    .sort((a: any, b: any) => b.count - a.count);

  return (
    <div className="bg-white rounded-lg shadow border">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <FileText className="mr-3 text-red-600" size={20} />
          Órgãos Anuentes
        </h3>
      </div>
      <div className="p-6">
        {orgaos.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p>Nenhum órgão anuente identificado</p>
            <p className="text-xs mt-1">Configure os campos no Asana para capturar essas informações</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {orgaos.map((orgao: any, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                <span className="text-sm font-medium text-gray-900">{orgao.name}</span>
                <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full font-medium">
                  {orgao.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'A Embarcar': '#f97316',
    'Em Trânsito': '#3b82f6',
    'No Porto': '#6b7280',
    'Em Fechamento': '#eab308',
    'Concluído': '#16a34a',
    'Cancelado': '#dc2626',
    'Em Progresso': '#f97316',
    'Em dia': '#f97316'
  };
  return colors[status] || '#6b7280';
}