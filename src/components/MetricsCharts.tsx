// src/components/MetricsCharts.tsx
'use client';

import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';

interface MetricsChartsProps {
  trackings: any[];
  metrics: any;
}

export function MetricsCharts({ trackings, metrics }: MetricsChartsProps) {
  const statusData = Object.entries(metrics.statusBreakdown).map(([name, value]) => ({
    name,
    value,
    color: getStatusColor(name)
  }));

  const exporterData = getTopExporters(trackings);
  const shippingCompanyData = getShippingCompanies(trackings);
  const responsibleData = getResponsibles(trackings);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
      {/* Status Distribution */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          📊 Distribuição por Status
        </h3>
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
        <div className="mt-4 space-y-2">
          {statusData.map((item) => (
            <div key={item.name} className="flex items-center text-sm">
              <div 
                className="w-3 h-3 rounded-full mr-2" 
                style={{ backgroundColor: item.color }}
              />
              <span className="flex-1">{item.name}</span>
              <span className="font-medium">{item.value} ({Math.round((item.value / trackings.length) * 100)}%)</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Exporters */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          🏭 Top Exportadores
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={exporterData}>
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={12}
              />
              <YAxis />
              <Bar dataKey="value" fill="#ea580c" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Shipping Companies */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          🚢 Armadores/Navios
        </h3>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {shippingCompanyData.map((company, index) => (
            <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span className="text-sm font-medium">{company.name}</span>
              <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                {company.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Responsibles */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          👥 Responsáveis
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={responsibleData} layout="horizontal">
              <XAxis type="number" />
              <YAxis 
                dataKey="name" 
                type="category" 
                fontSize={12}
                width={100}
              />
              <Bar dataKey="value" fill="#ea580c" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'Em Progresso': '#ea580c',
    'Concluído': '#16a34a',
    'Planejamento': '#eab308',
    'Atrasado': '#dc2626',
    'Em dia': '#ea580c'
  };
  return colors[status] || '#6b7280';
}

function getTopExporters(trackings: any[]): Array<{name: string, value: number}> {
  const exporters: Record<string, number> = {};
  
  trackings.forEach(tracking => {
    const exporter = tracking.transport?.exporter || 
                    extractExporterFromTitle(tracking.title) || 
                    'Não informado';
    exporters[exporter] = (exporters[exporter] || 0) + 1;
  });

  return Object.entries(exporters)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}

function getShippingCompanies(trackings: any[]): Array<{name: string, count: number}> {
  const companies: Record<string, number> = {};
  
  trackings.forEach(tracking => {
    const company = tracking.transport?.company || 'Não informado';
    companies[company] = (companies[company] || 0) + 1;
  });

  return Object.entries(companies)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function getResponsibles(trackings: any[]): Array<{name: string, value: number}> {
  const responsibles: Record<string, number> = {};
  
  trackings.forEach(tracking => {
    const responsible = tracking.schedule?.responsible || 'Não atribuído';
    responsibles[responsible] = (responsibles[responsible] || 0) + 1;
  });

  return Object.entries(responsibles)
    .map(([name, value]) => ({ name: name.length > 15 ? name.substring(0, 15) + '...' : name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

function extractExporterFromTitle(title: string): string {
  const match = title.match(/^\d+º?\s+(.+?)(\s*\(|$)/);
  return match ? match[1].trim() : '';
}