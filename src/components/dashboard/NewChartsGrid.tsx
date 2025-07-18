// src/components/dashboard/NewChartsGrid.tsx - Layout baseado na Imagem 3
'use client';

import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Sector
} from 'recharts';

interface NewChartsGridProps {
  metrics: any;
}

export function NewChartsGrid({ metrics }: NewChartsGridProps) {
  if (!metrics) {
    return (
      <div className="bg-white p-6 rounded-lg shadow border">
        <div className="text-center text-gray-500">Carregando gráficos...</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Linha Superior */}
      
      {/* 1. Distribuição por Status - Donut Chart */}
      <ChartCard title="Distribuição por Status">
        <DonutChart data={prepareStatusData(metrics.statusDistribution)} />
      </ChartCard>

      {/* 2. Top Exportadores - Vertical Bar Chart */}
      <ChartCard title="Top Exportadores">
        <VerticalBarChart data={prepareTopData(metrics.exporterDistribution, 5)} />
      </ChartCard>

      {/* 3. Produtos Principais - Vertical Bar Chart */}
      <ChartCard title="Produtos Principais">
        <VerticalBarChart data={prepareTopData(metrics.productDistribution, 8)} />
      </ChartCard>

      {/* Linha Inferior */}

      {/* 4. Órgãos Anuentes - Pie Chart */}
      <ChartCard title="Órgãos Anuentes">
        <PieChartComponent data={prepareTopData(metrics.orgaosAnuentesDistribution, 3)} />
      </ChartCard>

      {/* 5. Armadores - Horizontal Bar Chart */}
      <ChartCard title="Armadores">
        <HorizontalBarChart data={prepareTopData(metrics.armadorDistribution, 4)} />
      </ChartCard>

      {/* 6. Cronograma ETD - Area/Line Chart */}
      <ChartCard title="Cronograma ETD">
        <TimelineChart data={prepareTimelineData(metrics.etdTimeline)} />
      </ChartCard>
    </div>
  );
}

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
}

function ChartCard({ title, children }: ChartCardProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow border">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <div className="w-4 h-1 bg-orange-500 mr-2"></div>
        {title}
      </h3>
      <div className="h-64">
        {children}
      </div>
    </div>
  );
}

// 1. Donut Chart para Status
function DonutChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-full text-gray-500">Sem dados</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getStatusColor(entry.name, index)} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

// 2. Vertical Bar Chart
function VerticalBarChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-full text-gray-500">Sem dados</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="name" 
          angle={-45} 
          textAnchor="end" 
          height={80} 
          fontSize={11}
          interval={0}
        />
        <YAxis fontSize={11} />
        <Tooltip />
        <Bar dataKey="value" fill="#ea580c" />
      </BarChart>
    </ResponsiveContainer>
  );
}

// 3. Pie Chart para Órgãos Anuentes
function PieChartComponent({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-full text-gray-500">Sem dados</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          outerRadius={80}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getDefaultColor(index)} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

// 4. Horizontal Bar Chart
function HorizontalBarChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-full text-gray-500">Sem dados</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="horizontal" margin={{ left: 80 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" fontSize={11} />
        <YAxis 
          dataKey="name" 
          type="category" 
          width={80} 
          fontSize={11}
        />
        <Tooltip />
        <Bar dataKey="value" fill="#f97316" />
      </BarChart>
    </ResponsiveContainer>
  );
}

// 5. Timeline Chart (Area Chart)
function TimelineChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-full text-gray-500">Sem dados</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" fontSize={11} />
        <YAxis fontSize={11} />
        <Tooltip />
        <Area 
          type="monotone" 
          dataKey="value" 
          stroke="#ea580c" 
          fill="#fed7aa" 
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Helper Functions
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
      name: name.length > 12 ? name.substring(0, 12) + '...' : name,
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
    'A Embarcar': '#fed7aa',
    'Em Trânsito': '#ea580c',
    'No Porto': '#6b7280',
    'Em Fechamento': '#9ca3af',
    'Cancelado': '#dc2626',
    'Concluído': '#10b981',
    'Em Progresso': '#f59e0b'
  };

  return colors[status as keyof typeof colors] || getDefaultColor(index);
}

function getDefaultColor(index: number): string {
  const colors = [
    '#ea580c', '#fed7aa', '#6b7280', '#9ca3af', '#dc2626',
    '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'
  ];
  return colors[index % colors.length];
}