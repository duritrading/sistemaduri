// src/components/dashboard/DuriDashboard.tsx - Dashboard corrigido com dados reais
'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface DuriDashboardProps {
  trackings: any[];
  metrics: any;
}

export function DuriDashboard({ trackings, metrics }: DuriDashboardProps) {
  if (!metrics) {
    return (
      <div className="bg-white p-6 rounded-lg shadow border">
        <div className="text-center text-gray-500">
          Carregando métricas...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Exportadores Únicos"
          value={metrics.uniqueExporters || 0}
          color="red"
        />
        <MetricCard
          title="Linhas Marítimas"
          value={metrics.uniqueShippingLines || 0}
          color="red"
        />
        <MetricCard
          title="Terminais"
          value={metrics.uniqueTerminals || 0}
          color="red"
        />
        <MetricCard
          title="Total Containers"
          value={metrics.totalContainers || 0}
          color="green"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <ChartCard
          title="Distribuição por Status"
          data={prepareStatusData(metrics.statusDistribution)}
          type="pie"
        />

        {/* Top Exportadores */}
        <ChartCard
          title="Top Exportadores"
          data={prepareTopData(metrics.exporterDistribution, 5)}
          type="bar"
        />

        {/* Produtos Principais */}
        <ChartCard
          title="Produtos Principais"
          data={prepareTopData(metrics.productDistribution, 6)}
          type="bar"
        />

        {/* Órgãos Anuentes */}
        <ChartCard
          title="Órgãos Anuentes"
          data={prepareTopData(metrics.orgaosAnuentesDistribution, 5)}
          type="bar"
        />

        {/* Armadores */}
        <ChartCard
          title="Armadores"
          data={prepareTopData(metrics.armadorDistribution, 5)}
          type="bar"
        />

        {/* Cronograma ETD */}
        <ChartCard
          title="Cronograma ETD"
          data={prepareTimelineData(metrics.etdTimeline)}
          type="line"
        />
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: number;
  color: 'red' | 'green' | 'blue';
}

function MetricCard({ title, value, color }: MetricCardProps) {
  const colorClasses = {
    red: 'text-red-600',
    green: 'text-green-600',
    blue: 'text-blue-600'
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow border text-center">
      <div className={`text-3xl font-bold ${colorClasses[color]}`}>
        {value}
      </div>
      <div className="text-sm text-gray-600 mt-1">
        {title}
      </div>
    </div>
  );
}

interface ChartCardProps {
  title: string;
  data: any[];
  type: 'bar' | 'pie' | 'line';
}

function ChartCard({ title, data, type }: ChartCardProps) {
  const renderChart = () => {
    if (!data || data.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-500">
          Sem dados disponíveis
        </div>
      );
    }

    switch (type) {
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getStatusColor(entry.name, index)} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#dc2626" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'bar':
      default:
        return (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data} margin={{ bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                height={80} 
                fontSize={12}
                interval={0}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#dc2626" />
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow border">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <div className="w-4 h-1 bg-red-500 mr-2"></div>
        {title}
      </h3>
      <div className="h-64">
        {renderChart()}
      </div>
    </div>
  );
}

// Helper functions
function prepareStatusData(statusDistribution: Record<string, number> | undefined) {
  if (!statusDistribution || Object.keys(statusDistribution).length === 0) {
    return [];
  }

  return Object.entries(statusDistribution).map(([name, value]) => ({
    name: name,
    value: value
  }));
}

function prepareTopData(distribution: Record<string, number> | undefined, limit: number = 5) {
  if (!distribution || Object.keys(distribution).length === 0) {
    return [];
  }

  return Object.entries(distribution)
    .sort(([,a], [,b]) => b - a)
    .slice(0, limit)
    .map(([name, value]) => ({
      name: name.length > 15 ? name.substring(0, 15) + '...' : name,
      value: value,
      fullName: name
    }));
}

function prepareTimelineData(timeline: Record<string, number> | undefined) {
  if (!timeline || Object.keys(timeline).length === 0) {
    return [];
  }

  return Object.entries(timeline)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => ({
      name: name,
      value: value
    }));
}

function getStatusColor(status: string, index: number): string {
  const colors = {
    'Concluído': '#10b981',
    'Em Progresso': '#f59e0b',
    'Em dia': '#10b981',
    'Em atraso': '#ef4444',
    'Em risco': '#f59e0b',
    'Atrasado': '#ef4444',
    'Pendente': '#6b7280'
  };

  return colors[status as keyof typeof colors] || getDefaultColor(index);
}

function getDefaultColor(index: number): string {
  const defaultColors = [
    '#dc2626', '#ea580c', '#d97706', '#ca8a04', '#65a30d',
    '#16a34a', '#059669', '#0891b2', '#0284c7', '#2563eb',
    '#4f46e5', '#7c3aed', '#9333ea', '#c026d3', '#db2777'
  ];
  return defaultColors[index % defaultColors.length];
}