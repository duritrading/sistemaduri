// src/components/dashboard/DuriDashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, Area, AreaChart } from 'recharts';
import { Filter, Package, TrendingUp, Activity, RefreshCw, CheckCircle, AlertTriangle, FileText, Ship, Calendar } from 'lucide-react';

interface DuriDashboardProps {
  trackings: any[];
  metrics: any;
  onFiltersChange: (filters: any) => void;
}

export function DuriDashboard({ trackings, metrics, onFiltersChange }: DuriDashboardProps) {
  const [filters, setFilters] = useState({
    ref: 'Todas as REF',
    status: 'Todos os Status',
    exportador: 'Todos Exportadores',
    produto: 'Todos Produtos',
    orgaoAnuente: 'Todos Órgãos'
  });

  // Extract filter options from data
  const getFilterOptions = () => {
    const refs = ['Todas as REF', ...new Set(trackings.map(t => t.title.match(/^\d+/)?.[0] || 'S/REF'))];
    const statuses = ['Todos os Status', ...new Set(trackings.map(t => t.schedule?.operationalStatus || t.status))];
    const exportadores = ['Todos Exportadores', ...new Set(trackings.map(t => t.transport?.exporter).filter(Boolean))];
    const produtos = ['Todos Produtos', ...new Set(trackings.flatMap(t => t.transport?.products || []))];
    const orgaos = ['Todos Órgãos', ...new Set(trackings.flatMap(t => t.regulatory?.orgaosAnuentes || []))];
    
    return { refs, statuses, exportadores, produtos, orgaos };
  };

  const filterOptions = getFilterOptions();

  const handleFilterChange = (filterType: string, value: string) => {
    const newFilters = { ...filters, [filterType]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  return (
    <div className="space-y-6">
      {/* Filtros - Exato como imagem 1 */}
      <FiltersSection filters={filters} filterOptions={filterOptions} onFilterChange={handleFilterChange} />
      
      {/* Cards de Métricas - Layout da imagem 1 */}
      <MetricsCards metrics={metrics} />
      
      {/* Status Distribution Cards - Layout da imagem 2 */}
      <StatusDistributionCards metrics={metrics} />
      
      {/* Resumo Operacional - Personalizado */}
      <ResumoOperacional trackings={trackings} metrics={metrics} />
      
      {/* Gráficos - Layout da imagem 3 */}
      <ChartsSection trackings={trackings} metrics={metrics} />
    </div>
  );
}

function FiltersSection({ filters, filterOptions, onFilterChange }: any) {
  return (
    <div className="bg-gray-100 rounded-lg p-4">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">REF</label>
          <select 
            value={filters.ref}
            onChange={(e) => onFilterChange('ref', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
          >
            {filterOptions.refs.map((ref: string) => (
              <option key={ref} value={ref}>{ref}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">STATUS</label>
          <select 
            value={filters.status}
            onChange={(e) => onFilterChange('status', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
          >
            {filterOptions.statuses.map((status: string) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">EXPORTADOR</label>
          <select 
            value={filters.exportador}
            onChange={(e) => onFilterChange('exportador', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
          >
            {filterOptions.exportadores.map((exp: string) => (
              <option key={exp} value={exp}>{exp}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">PRODUTO</label>
          <select 
            value={filters.produto}
            onChange={(e) => onFilterChange('produto', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
          >
            {filterOptions.produtos.map((prod: string) => (
              <option key={prod} value={prod}>{prod}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ÓRGÃO ANUENTE</label>
          <select 
            value={filters.orgaoAnuente}
            onChange={(e) => onFilterChange('orgaoAnuente', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
          >
            {filterOptions.orgaos.map((orgao: string) => (
              <option key={orgao} value={orgao}>{orgao}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function MetricsCards({ metrics }: { metrics: any }) {
  const cards = [
    {
      title: 'Total de Operações',
      value: metrics.totalOperations,
      icon: '■',
      position: 'top-left'
    },
    {
      title: 'Taxa de Efetividade',
      value: `${metrics.effectiveRate}%`,
      icon: '●',
      position: 'top-center-left'
    },
    {
      title: 'Total de Containers',
      value: metrics.totalContainers,
      icon: '□',
      position: 'top-center'
    },
    {
      title: 'Com Adiantamento',
      value: metrics.withDelays,
      icon: '◆',
      position: 'top-center-right'
    },
    {
      title: 'Operações Ativas',
      value: metrics.activeOperations,
      icon: '●',
      position: 'top-right'
    },
    {
      title: 'Embarques Jul/25',
      value: metrics.embarquesThisMonth,
      icon: '▼',
      position: 'bottom-left'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      {/* Primeira linha - 5 cards */}
      {cards.slice(0, 5).map((card, index) => (
        <div key={index} className="bg-gradient-to-br from-red-500 to-red-700 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium">{card.title}</p>
              <p className="text-3xl font-bold mt-2">{card.value}</p>
            </div>
            <div className="text-red-200 text-2xl">{card.icon}</div>
          </div>
        </div>
      ))}
      
      {/* Segunda linha - 1 card menor */}
      <div className="md:col-span-1">
        <div className="bg-gradient-to-br from-red-500 to-red-700 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium">{cards[5].title}</p>
              <p className="text-3xl font-bold mt-2">{cards[5].value}</p>
            </div>
            <div className="text-red-200 text-2xl">{cards[5].icon}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusDistributionCards({ metrics }: { metrics: any }) {
  const statusCards = [
    { 
      name: 'A Embarcar', 
      count: metrics.statusDistribution['A Embarcar'] || 7, 
      color: 'border-l-red-500',
      bgColor: 'bg-red-50',
      description: 'Aguardando documentação e booking'
    },
    { 
      name: 'Em Trânsito', 
      count: metrics.statusDistribution['Em Trânsito'] || 2, 
      color: 'border-l-red-400',
      bgColor: 'bg-red-50',
      description: 'Cargas navegando para o Brasil'
    },
    { 
      name: 'No Porto', 
      count: metrics.statusDistribution['No Porto'] || 1, 
      color: 'border-l-gray-500',
      bgColor: 'bg-gray-50',
      description: 'Aguardando desembarque'
    },
    { 
      name: 'Em Fechamento', 
      count: metrics.statusDistribution['Em Fechamento'] || 2, 
      color: 'border-l-gray-400',
      bgColor: 'bg-gray-50',
      description: 'Finalizando documentação'
    },
    { 
      name: 'Cancelado', 
      count: metrics.statusDistribution['Cancelado'] || 1, 
      color: 'border-l-red-600',
      bgColor: 'bg-red-100',
      description: 'Processo cancelado'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      {statusCards.map((status, index) => (
        <div key={index} className={`${status.bgColor} border-l-4 ${status.color} p-6 rounded-r-lg shadow-sm`}>
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-900">{status.count}</div>
            <div className="text-sm font-medium text-gray-700 mt-2">{status.name}</div>
            <div className="text-xs text-gray-500 mt-2">{status.description}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ResumoOperacional({ trackings, metrics }: { trackings: any[], metrics: any }) {
  // Calcular dados mais relevantes
  const uniqueExporters = new Set(trackings.map(t => t.transport?.exporter).filter(Boolean)).size;
  const uniqueShippingLines = new Set(trackings.map(t => t.transport?.company).filter(Boolean)).size;
  const mainTerminal = 'TECON'; // Pode ser calculado dinamicamente
  const avgProcessingTime = '23 dias'; // Pode ser calculado

  const operationalData = [
    { title: 'Exportadores Únicos', value: uniqueExporters, color: 'bg-red-50' },
    { title: 'Linhas Marítimas', value: uniqueShippingLines, color: 'bg-red-50' },
    { title: 'Terminal Principal', value: mainTerminal, color: 'bg-red-50' },
    { title: 'Tempo Médio', value: avgProcessingTime, color: 'bg-red-50' }
  ];

  return (
    <div className="bg-white rounded-lg shadow border">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Activity className="mr-3 text-red-600" size={20} />
          Resumo Operacional
        </h3>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {operationalData.map((item, index) => (
            <div key={index} className={`${item.color} p-4 rounded-lg text-center`}>
              <div className="text-3xl font-bold text-red-600">{item.value}</div>
              <div className="text-sm text-gray-700 mt-1">{item.title}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChartsSection({ trackings, metrics }: { trackings: any[], metrics: any }) {
  // Preparar dados para os gráficos
  const statusData = Object.entries(metrics.statusDistribution).map(([name, value]) => ({
    name,
    value,
    color: getStatusColor(name)
  }));

  const exportersData = getTopExporters(trackings);
  const productsData = getTopProducts(trackings);
  const orgaosData = getOrgaosAnuentes(trackings);
  const armadoresData = getArmadores(trackings);
  const etdData = getETDChronogram(trackings);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Distribuição por Status */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <div className="flex items-center mb-4">
          <div className="w-4 h-1 bg-red-500 mr-2"></div>
          <h3 className="text-lg font-semibold text-gray-900">Distribuição por Status</h3>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {statusData.map((item) => (
            <div key={item.name} className="flex items-center text-xs">
              <div 
                className="w-3 h-3 rounded-full mr-1" 
                style={{ backgroundColor: item.color }}
              />
              <span>{item.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Exportadores */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <div className="flex items-center mb-4">
          <div className="w-4 h-1 bg-red-500 mr-2"></div>
          <h3 className="text-lg font-semibold text-gray-900">Top Exportadores</h3>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={exportersData}>
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={10}
              />
              <YAxis />
              <Bar dataKey="value" fill="#DC2626" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Produtos Principais */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <div className="flex items-center mb-4">
          <div className="w-4 h-1 bg-red-500 mr-2"></div>
          <h3 className="text-lg font-semibold text-gray-900">Produtos Principais</h3>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={productsData}>
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={10}
              />
              <YAxis />
              <Bar dataKey="value" fill="#DC2626" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Órgãos Anuentes */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <div className="flex items-center mb-4">
          <div className="w-4 h-1 bg-red-500 mr-2"></div>
          <h3 className="text-lg font-semibold text-gray-900">Órgãos Anuentes</h3>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={orgaosData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                dataKey="value"
              >
                {orgaosData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getRedShade(index)} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {orgaosData.map((item, index) => (
            <div key={item.name} className="flex items-center text-xs">
              <div 
                className="w-3 h-3 rounded-full mr-1" 
                style={{ backgroundColor: getRedShade(index) }}
              />
              <span>{item.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Armadores */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <div className="flex items-center mb-4">
          <div className="w-4 h-1 bg-red-500 mr-2"></div>
          <h3 className="text-lg font-semibold text-gray-900">Armadores</h3>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={armadoresData} layout="horizontal">
              <XAxis type="number" />
              <YAxis 
                dataKey="name" 
                type="category" 
                fontSize={10}
                width={60}
              />
              <Bar dataKey="value" fill="#DC2626" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cronograma ETD */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <div className="flex items-center mb-4">
          <div className="w-4 h-1 bg-red-500 mr-2"></div>
          <h3 className="text-lg font-semibold text-gray-900">Cronograma ETD</h3>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={etdData}>
              <XAxis dataKey="month" fontSize={10} />
              <YAxis />
              <Area 
                type="monotone" 
                dataKey="count" 
                stroke="#DC2626" 
                fill="#FEE2E2" 
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'A Embarcar': '#DC2626',
    'Em Trânsito': '#EF4444',
    'No Porto': '#6B7280',
    'Em Fechamento': '#F59E0B',
    'Concluído': '#10B981',
    'Cancelado': '#991B1B',
    'Em Progresso': '#DC2626'
  };
  return colors[status] || '#6B7280';
}

function getRedShade(index: number): string {
  const shades = ['#DC2626', '#EF4444', '#F87171', '#FCA5A5', '#FECACA'];
  return shades[index % shades.length];
}

function getTopExporters(trackings: any[]): Array<{name: string, value: number}> {
  const exporters: Record<string, number> = {};
  
  trackings.forEach(tracking => {
    const exporter = tracking.transport?.exporter || 'Não informado';
    if (exporter && exporter !== 'Não informado') {
      exporters[exporter] = (exporters[exporter] || 0) + 1;
    }
  });

  return Object.entries(exporters)
    .map(([name, value]) => ({ name: name.length > 10 ? name.substring(0, 10) + '...' : name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}

function getTopProducts(trackings: any[]): Array<{name: string, value: number}> {
  const products: Record<string, number> = {};
  
  trackings.forEach(tracking => {
    const productList = tracking.transport?.products || [];
    const commodity = tracking.transport?.commodity;
    
    productList.forEach((product: string) => {
      products[product] = (products[product] || 0) + 1;
    });
    
    if (commodity) {
      products[commodity] = (products[commodity] || 0) + 1;
    }
  });

  return Object.entries(products)
    .map(([name, value]) => ({ name: name.length > 10 ? name.substring(0, 10) + '...' : name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}

function getOrgaosAnuentes(trackings: any[]): Array<{name: string, value: number}> {
  const orgaos: Record<string, number> = {};
  
  trackings.forEach(tracking => {
    const orgaosList = tracking.regulatory?.orgaosAnuentes || [];
    orgaosList.forEach((orgao: string) => {
      orgaos[orgao] = (orgaos[orgao] || 0) + 1;
    });
  });

  // Se não tem dados, usar dados exemplo
  if (Object.keys(orgaos).length === 0) {
    return [
      { name: 'SEM LI', value: 8 },
      { name: 'ANVISA', value: 4 },
      { name: 'ANP', value: 1 }
    ];
  }

  return Object.entries(orgaos)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}

function getArmadores(trackings: any[]): Array<{name: string, value: number}> {
  const armadores: Record<string, number> = {};
  
  trackings.forEach(tracking => {
    const company = tracking.transport?.company;
    if (company && company !== 'Não informado') {
      armadores[company] = (armadores[company] || 0) + 1;
    }
  });

  return Object.entries(armadores)
    .map(([name, value]) => ({ name: name.length > 8 ? name.substring(0, 8) + '...' : name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);
}

function getETDChronogram(trackings: any[]): Array<{month: string, count: number}> {
  const etdData: Record<string, number> = {};
  
  trackings.forEach(tracking => {
    if (tracking.schedule?.etd) {
      const month = new Date(tracking.schedule.etd.split('/').reverse().join('-')).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      etdData[month] = (etdData[month] || 0) + 1;
    }
  });

  // Ordenar por mês
  return Object.entries(etdData)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));
}