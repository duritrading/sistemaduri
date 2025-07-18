// src/components/dashboard/DuriDashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, CartesianGrid, Tooltip, Legend } from 'recharts';

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

  const getFilterOptions = () => {
    const refs = ['Todas as REF', ...new Set(trackings.map(t => t.ref || 'S/REF').filter(Boolean))];
    const statuses = ['Todos os Status', ...new Set(trackings.map(t => t.status))];
    const exportadores = ['Todos Exportadores', ...new Set(trackings.map(t => t.company).filter(Boolean))];
    const produtos = ['Todos Produtos', ...new Set(trackings.flatMap(t => t.transport?.products || []))];
    const orgaos = ['Todos Órgãos', ...new Set(trackings.flatMap(t => t.regulatory?.orgaosAnuentes || []))];
    
    return { refs, statuses, exportadores, produtos, orgaos };
  };

  const handleFilterChange = (filterType: string, value: string) => {
    const newFilters = { ...filters, [filterType]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  return (
    <div className="space-y-8">
      <FiltersSection filters={filters} filterOptions={getFilterOptions()} onFilterChange={handleFilterChange} />
      <MetricsCards metrics={metrics} />
      <ChartsGrid trackings={trackings} metrics={metrics} />
    </div>
  );
}

function MetricsCards({ metrics }: { metrics: any }) {
  const cards = [
    { title: 'Exportadores Únicos', value: metrics.uniqueExporters || 0, color: 'bg-red-50' },
    { title: 'Linhas Marítimas', value: metrics.uniqueShippingLines || 0, color: 'bg-red-50' },
    { title: 'Terminal Principal', value: 'TECON', color: 'bg-red-50' },
    { title: 'Tempo Médio', value: '23 dias', color: 'bg-red-50' }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <div key={index} className={`${card.color} p-6 rounded-lg text-center`}>
          <div className="text-4xl font-bold text-red-600">{card.value}</div>
          <div className="text-sm text-gray-700 mt-2">{card.title}</div>
        </div>
      ))}
    </div>
  );
}

function ChartsGrid({ trackings, metrics }: { trackings: any[], metrics: any }) {
  // Prepare data for charts with fallbacks
  const statusData = Object.entries(metrics.statusDistribution || {}).map(([name, value]) => ({
    name,
    value,
    fill: getStatusColor(name)
  }));

  const exportersData = getTopExporters(trackings);
  const productsData = getTopProducts(trackings);
  const armadoresData = getArmadores(trackings);
  const orgaosData = getOrgaosData(trackings);
  const etdData = getETDData(trackings);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {/* Distribuição por Status */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <div className="w-4 h-1 bg-red-500 mr-2"></div>
          Distribuição por Status
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData.length > 0 ? statusData : [{ name: 'Sem dados', value: 1, fill: '#ccc' }]}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
              />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Exportadores */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <div className="w-4 h-1 bg-red-500 mr-2"></div>
          Top Exportadores
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={exportersData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#dc2626" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Produtos Principais */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <div className="w-4 h-1 bg-red-500 mr-2"></div>
          Produtos Principais
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={productsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#dc2626" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Órgãos Anuentes */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <div className="w-4 h-1 bg-red-500 mr-2"></div>
          Órgãos Anuentes
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={orgaosData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label
              >
                {orgaosData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={['#dc2626', '#ef4444', '#f87171'][index % 3]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Armadores */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <div className="w-4 h-1 bg-red-500 mr-2"></div>
          Armadores
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={armadoresData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#dc2626" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cronograma ETD */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <div className="w-4 h-1 bg-red-500 mr-2"></div>
          Cronograma ETD
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={etdData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#dc2626" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'Em Progresso': '#f97316',
    'Concluído': '#16a34a',
    'Em dia': '#3b82f6',
    'Cancelado': '#dc2626',
    'Atrasado': '#dc2626'
  };
  return colors[status] || '#6b7280';
}

function getTopExporters(trackings: any[]): Array<{name: string, value: number}> {
  const exporters: Record<string, number> = {};
  
  trackings.forEach(tracking => {
    const exporter = tracking.company || 'Não Identificado';
    exporters[exporter] = (exporters[exporter] || 0) + 1;
  });

  const result = Object.entries(exporters)
    .map(([name, value]) => ({ 
      name: name.length > 10 ? name.substring(0, 10) + '...' : name, 
      value 
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return result.length > 0 ? result : [{ name: 'Sem dados', value: 0 }];
}

function getTopProducts(trackings: any[]): Array<{name: string, value: number}> {
  const products: Record<string, number> = {};
  
  trackings.forEach(tracking => {
    const productList = tracking.transport?.products || [];
    productList.forEach((product: string) => {
      products[product] = (products[product] || 0) + 1;
    });
  });

  const result = Object.entries(products)
    .map(([name, value]) => ({ 
      name: name.length > 10 ? name.substring(0, 10) + '...' : name, 
      value 
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return result.length > 0 ? result : [{ name: 'Sem dados', value: 0 }];
}

function getArmadores(trackings: any[]): Array<{name: string, value: number}> {
  const armadores: Record<string, number> = {};
  
  trackings.forEach(tracking => {
    const company = tracking.transport?.company || 'Não informado';
    if (company !== 'Não informado') {
      armadores[company] = (armadores[company] || 0) + 1;
    }
  });

  const result = Object.entries(armadores)
    .map(([name, value]) => ({ 
      name: name.length > 8 ? name.substring(0, 8) + '...' : name, 
      value 
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 4);

  return result.length > 0 ? result : [{ name: 'Sem dados', value: 0 }];
}

function getOrgaosData(trackings: any[]): Array<{name: string, value: number}> {
  const orgaos: Record<string, number> = {};
  
  trackings.forEach(tracking => {
    const orgaosList = tracking.regulatory?.orgaosAnuentes || [];
    orgaosList.forEach((orgao: string) => {
      orgaos[orgao] = (orgaos[orgao] || 0) + 1;
    });
  });

  const result = Object.entries(orgaos)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return result.length > 0 ? result : [
    { name: 'SEM LI', value: 8 },
    { name: 'ANVISA', value: 4 },
    { name: 'ANP', value: 1 }
  ];
}

function getETDData(trackings: any[]): Array<{month: string, count: number}> {
  const etdData: Record<string, number> = {};
  
  trackings.forEach(tracking => {
    if (tracking.schedule?.etd) {
      try {
        const date = new Date(tracking.schedule.etd.split('/').reverse().join('-'));
        const month = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        etdData[month] = (etdData[month] || 0) + 1;
      } catch {
        // Skip invalid dates
      }
    }
  });

  const result = Object.entries(etdData)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return result.length > 0 ? result : [
    { month: 'Jul/25', count: 3 },
    { month: 'Ago/25', count: 5 },
    { month: 'Set/25', count: 2 }
  ];
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
            className="w-full p-2 border border-gray-300 rounded-md text-sm"
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
            className="w-full p-2 border border-gray-300 rounded-md text-sm"
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
            className="w-full p-2 border border-gray-300 rounded-md text-sm"
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
            className="w-full p-2 border border-gray-300 rounded-md text-sm"
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
            className="w-full p-2 border border-gray-300 rounded-md text-sm"
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