// src/components/dashboard/DuriDashboard.tsx - Remove ALL fallbacks
'use client';

import { useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, CartesianGrid, Tooltip } from 'recharts';

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
    const refsSet = new Set(['Todas as REF']);
    const statusesSet = new Set(['Todos os Status']);
    const exportadoresSet = new Set(['Todos Exportadores']);
    const produtosSet = new Set(['Todos Produtos']);
    const orgaosSet = new Set(['Todos Órgãos']);

    if (trackings && Array.isArray(trackings)) {
      trackings.forEach(t => {
        if (t?.ref && t.ref.trim()) refsSet.add(t.ref);
        if (t?.status && t.status.trim()) statusesSet.add(t.status);
        if (t?.company && t.company.trim()) exportadoresSet.add(t.company);
        
        if (t?.transport?.products && Array.isArray(t.transport.products)) {
          t.transport.products.forEach((p: string) => {
            if (p && p.trim()) produtosSet.add(p);
          });
        }
        
        if (t?.regulatory?.orgaosAnuentes && Array.isArray(t.regulatory.orgaosAnuentes)) {
          t.regulatory.orgaosAnuentes.forEach((o: string) => {
            if (o && o.trim()) orgaosSet.add(o);
          });
        }
      });
    }

    return {
      refs: Array.from(refsSet),
      statuses: Array.from(statusesSet),
      exportadores: Array.from(exportadoresSet),
      produtos: Array.from(produtosSet),
      orgaos: Array.from(orgaosSet)
    };
  };

  const handleFilterChange = (filterType: string, value: string) => {
    const newFilters = { ...filters, [filterType]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  return (
    <div className="space-y-8">
      <FiltersSection filters={filters} filterOptions={getFilterOptions()} onFilterChange={handleFilterChange} />
      <MetricsCards metrics={metrics} trackings={trackings} />
      <ChartsGrid trackings={trackings} metrics={metrics} />
    </div>
  );
}

function MetricsCards({ metrics, trackings }: { metrics: any, trackings: any[] }) {
  const cards = [
    { 
      title: 'Exportadores Únicos', 
      value: metrics?.uniqueExporters || 0, 
      color: 'bg-red-50' 
    },
    { 
      title: 'Linhas Marítimas', 
      value: metrics?.uniqueShippingLines || 0, 
      color: 'bg-red-50' 
    },
    { 
      title: 'Terminais', 
      value: metrics?.uniqueTerminals || 0, 
      color: 'bg-red-50' 
    },
    { 
      title: 'Total Containers', 
      value: metrics?.totalContainers || 0, 
      color: 'bg-red-50' 
    }
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
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {/* Status Distribution - ONLY real data */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <div className="w-4 h-1 bg-red-500 mr-2"></div>
          Distribuição por Status
        </h3>
        <div className="h-64">
          {prepareStatusData(metrics?.statusDistribution).length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={prepareStatusData(metrics.statusDistribution)}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {prepareStatusData(metrics.statusDistribution).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Sem dados de status
            </div>
          )}
        </div>
      </div>

      {/* Top Exportadores - ONLY real data */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <div className="w-4 h-1 bg-red-500 mr-2"></div>
          Top Exportadores
        </h3>
        <div className="h-64">
          {prepareExportersData(trackings).length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={prepareExportersData(trackings)} margin={{ bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#dc2626" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Sem dados de exportadores
            </div>
          )}
        </div>
      </div>

      {/* Produtos Principais - ONLY real data */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <div className="w-4 h-1 bg-red-500 mr-2"></div>
          Produtos Principais
        </h3>
        <div className="h-64">
          {prepareProductsData(trackings).length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={prepareProductsData(trackings)} margin={{ bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#dc2626" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Sem dados de produtos
            </div>
          )}
        </div>
      </div>

      {/* Órgãos Anuentes - ONLY real data */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <div className="w-4 h-1 bg-red-500 mr-2"></div>
          Órgãos Anuentes
        </h3>
        <div className="h-64">
          {prepareOrgaosData(trackings).length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={prepareOrgaosData(trackings)}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {prepareOrgaosData(trackings).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getOrgaoColor(index)} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Sem dados de órgãos anuentes
            </div>
          )}
        </div>
      </div>

      {/* Armadores - ONLY real data */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <div className="w-4 h-1 bg-red-500 mr-2"></div>
          Armadores
        </h3>
        <div className="h-64">
          {prepareArmadoresData(trackings).length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={prepareArmadoresData(trackings)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#dc2626" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Sem dados de armadores
            </div>
          )}
        </div>
      </div>

      {/* Cronograma ETD - ONLY real data */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <div className="w-4 h-1 bg-red-500 mr-2"></div>
          Cronograma ETD
        </h3>
        <div className="h-64">
          {prepareETDData(trackings).length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={prepareETDData(trackings)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#dc2626" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Sem dados de ETD
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper functions that return EMPTY arrays if no real data
function prepareStatusData(statusDistribution: Record<string, number> | undefined) {
  if (!statusDistribution || Object.keys(statusDistribution).length === 0) {
    return [];
  }
  return Object.entries(statusDistribution).map(([name, value]) => ({
    name, value, fill: getStatusColor(name)
  }));
}

function prepareExportersData(trackings: any[]) {
  const exporters: Record<string, number> = {};
  trackings.forEach(tracking => {
    if (tracking?.company && tracking.company.trim()) {
      exporters[tracking.company] = (exporters[tracking.company] || 0) + 1;
    }
  });
  return Object.entries(exporters)
    .map(([name, value]) => ({ name: name.length > 12 ? name.substring(0, 12) + '...' : name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

function prepareProductsData(trackings: any[]) {
  const products: Record<string, number> = {};
  trackings.forEach(tracking => {
    if (tracking?.transport?.products && Array.isArray(tracking.transport.products)) {
      tracking.transport.products.forEach((product: string) => {
        if (product && product.trim()) {
          products[product] = (products[product] || 0) + 1;
        }
      });
    }
  });
  return Object.entries(products)
    .map(([name, value]) => ({ name: name.length > 12 ? name.substring(0, 12) + '...' : name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

function prepareArmadoresData(trackings: any[]) {
  const armadores: Record<string, number> = {};
  trackings.forEach(tracking => {
    if (tracking?.transport?.company && tracking.transport.company.trim()) {
      armadores[tracking.transport.company] = (armadores[tracking.transport.company] || 0) + 1;
    }
  });
  return Object.entries(armadores)
    .map(([name, value]) => ({ name: name.length > 10 ? name.substring(0, 10) + '...' : name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}

function prepareOrgaosData(trackings: any[]) {
  const orgaos: Record<string, number> = {};
  trackings.forEach(tracking => {
    if (tracking?.regulatory?.orgaosAnuentes && Array.isArray(tracking.regulatory.orgaosAnuentes)) {
      tracking.regulatory.orgaosAnuentes.forEach((orgao: string) => {
        if (orgao && orgao.trim()) {
          orgaos[orgao] = (orgaos[orgao] || 0) + 1;
        }
      });
    }
  });
  return Object.entries(orgaos)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}

function prepareETDData(trackings: any[]) {
  const etdData: Record<string, number> = {};
  trackings.forEach(tracking => {
    if (tracking?.schedule?.etd) {
      try {
        let date: Date;
        const etd = tracking.schedule.etd;
        
        if (etd.includes('/')) {
          const parts = etd.split('/');
          if (parts.length === 3) {
            date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          } else return;
        } else {
          date = new Date(etd);
        }
        
        if (!isNaN(date.getTime())) {
          const month = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
          etdData[month] = (etdData[month] || 0) + 1;
        }
      } catch (error) {
        // Skip invalid dates
      }
    }
  });
  return Object.entries(etdData)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'Em Progresso': '#3b82f6', 'Em dia': '#16a34a', 'Em atraso': '#dc2626',
    'Em risco': '#f59e0b', 'Concluído': '#10b981', 'Baixa': '#16a34a',
    'Alta': '#dc2626', 'Média': '#f59e0b'
  };
  return colors[status] || '#6b7280';
}

function getOrgaoColor(index: number): string {
  const colors = ['#dc2626', '#ef4444', '#f87171', '#fca5a5', '#fecaca'];
  return colors[index % colors.length];
}

function FiltersSection({ filters, filterOptions, onFilterChange }: any) {
  return (
    <div className="bg-gray-100 rounded-lg p-4">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {Object.entries(filters).map(([key, value]) => {
          const options = filterOptions[key === 'ref' ? 'refs' : 
                                     key === 'status' ? 'statuses' :
                                     key === 'exportador' ? 'exportadores' :
                                     key === 'produto' ? 'produtos' : 'orgaos'] || [];
          
          return (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {key.toUpperCase()}
              </label>
              <select 
                value={value as string}
                onChange={(e) => onFilterChange(key, e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
              >
                {options.map((option: string) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}