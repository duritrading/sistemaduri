// src/components/CustomFieldsDashboard.tsx - Dashboard de Campos Personalizados
'use client';

import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, ScatterChart, Scatter
} from 'recharts';
import { CustomFieldsAnalyzer, CustomFieldsAnalysis, CustomFieldInsight } from '@/lib/custom-fields-analyzer';

interface CustomFieldsDashboardProps {
  trackings: any[];
  companyFilter?: string;
}

export function CustomFieldsDashboard({ trackings, companyFilter }: CustomFieldsDashboardProps) {
  const analysis = React.useMemo(() => {
    console.log('🔍 Analisando custom fields para dashboard...');
    return CustomFieldsAnalyzer.analyzeCustomFields(trackings);
  }, [trackings]);

  if (analysis.totalFields === 0) {
    return (
      <div className="bg-white p-8 rounded-lg shadow border text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">📊 Custom Fields Analysis</h2>
        <p className="text-gray-500">Nenhum campo personalizado encontrado nos dados.</p>
        <p className="text-sm text-gray-400 mt-2">
          Os campos serão exibidos automaticamente quando estiverem disponíveis no Asana.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com métricas gerais */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
          📊 Análise de Campos Personalizados
          {companyFilter && (
            <span className="ml-3 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
              {companyFilter}
            </span>
          )}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            title="Total de Campos"
            value={analysis.totalFields}
            icon="📋"
            color="blue"
          />
          <MetricCard
            title="Taxa de Preenchimento"
            value={`${analysis.metrics.averageFillRate.toFixed(1)}%`}
            icon="✅"
            color="green"
          />
          <MetricCard
            title="Valores Únicos"
            value={analysis.metrics.totalUniqueValues}
            icon="🔢"
            color="purple"
          />
          <MetricCard
            title="Insights Gerados"
            value={analysis.insights.length}
            icon="💡"
            color="orange"
          />
        </div>
      </div>

      {/* Insights Automáticos */}
      {analysis.insights.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {analysis.insights.map((insight, index) => (
            <InsightChart
              key={`${insight.fieldName}-${index}`}
              insight={insight}
            />
          ))}
        </div>
      )}

      {/* Análise de Preenchimento dos Campos */}
      <FieldCompletionAnalysis analysis={analysis} />

      {/* Tipos de Campos */}
      <FieldTypesDistribution analysis={analysis} />

      {/* Lista Detalhada dos Campos */}
      <DetailedFieldsList analysis={analysis} />
    </div>
  );
}

// Componente para cada insight/gráfico
function InsightChart({ insight }: { insight: CustomFieldInsight }) {
  const renderChart = () => {
    const commonProps = {
      width: '100%',
      height: 300,
      data: insight.data
    };

    switch (insight.chartType) {
      case 'pie':
        return (
          <ResponsiveContainer {...commonProps}>
            <PieChart>
              <Pie
                data={insight.data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                dataKey="value"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {insight.data.map((_: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer {...commonProps}>
            <BarChart data={insight.data} margin={{ left: 20, right: 20, top: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={100}
                fontSize={12}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer {...commonProps}>
            <LineChart data={insight.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer {...commonProps}>
            <AreaChart data={insight.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        );

      default:
        return (
          <div className="flex items-center justify-center h-64 text-gray-400">
            Tipo de gráfico não suportado: {insight.chartType}
          </div>
        );
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow border">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{insight.title}</h3>
        <p className="text-sm text-gray-600">{insight.description}</p>
        <span className="inline-block mt-2 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
          {insight.type}
        </span>
      </div>
      {renderChart()}
    </div>
  );
}

// Análise de preenchimento dos campos
function FieldCompletionAnalysis({ analysis }: { analysis: CustomFieldsAnalysis }) {
  const completionData = analysis.fieldDefinitions
    .sort((a, b) => b.fillRate - a.fillRate)
    .slice(0, 15) // Top 15 campos
    .map(field => ({
      name: field.name.length > 25 ? field.name.substring(0, 25) + '...' : field.name,
      fillRate: field.fillRate,
      filled: field.filledCount,
      total: field.totalCount
    }));

  return (
    <div className="bg-white p-6 rounded-lg shadow border">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        📈 Taxa de Preenchimento por Campo
      </h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={completionData} layout="horizontal">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" domain={[0, 100]} />
          <YAxis dataKey="name" type="category" width={200} fontSize={11} />
          <Tooltip 
            formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, 'Taxa de Preenchimento']}
            labelFormatter={(label) => `Campo: ${label}`}
          />
          <Bar dataKey="fillRate" fill="#059669">
            {completionData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.fillRate > 80 ? '#059669' : entry.fillRate > 50 ? '#F59E0B' : '#EF4444'} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Distribuição de tipos de campos
function FieldTypesDistribution({ analysis }: { analysis: CustomFieldsAnalysis }) {
  const typeData = Object.entries(analysis.metrics.fieldsByType).map(([type, count]) => ({
    name: TYPE_LABELS[type] || type,
    value: count
  }));

  return (
    <div className="bg-white p-6 rounded-lg shadow border">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        🎯 Tipos de Campos
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={typeData}
              cx="50%"
              cy="50%"
              outerRadius={100}
              dataKey="value"
              label={({ name, value }) => `${name}: ${value}`}
            >
              {typeData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700">Resumo por Tipo:</h4>
          {typeData.map((item, index) => (
            <div key={item.name} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center">
                <div 
                  className="w-4 h-4 rounded mr-3" 
                  style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                ></div>
                <span className="text-sm font-medium">{item.name}</span>
              </div>
              <span className="text-sm text-gray-600">{item.value} campos</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Lista detalhada dos campos
function DetailedFieldsList({ analysis }: { analysis: CustomFieldsAnalysis }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow border">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        📋 Detalhamento dos Campos
      </h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Preenchimento</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valores Únicos</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {analysis.fieldDefinitions.slice(0, 20).map((field) => (
              <tr key={field.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{field.name}</div>
                  {field.description && (
                    <div className="text-sm text-gray-500">{field.description}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(field.type)}`}>
                    {TYPE_LABELS[field.type] || field.type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {field.filledCount} / {field.totalCount}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div
                      className={`h-2 rounded-full ${
                        field.fillRate > 80 ? 'bg-green-500' : 
                        field.fillRate > 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${field.fillRate}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500">{field.fillRate.toFixed(1)}%</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {field.possibleValues?.length || '-'}
                  {field.possibleValues && field.possibleValues.length > 0 && (
                    <div className="text-xs text-gray-400 mt-1">
                      {field.possibleValues.slice(0, 3).join(', ')}
                      {field.possibleValues.length > 3 && '...'}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    field.fillRate > 80 ? 'bg-green-100 text-green-800' :
                    field.fillRate > 50 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {field.fillRate > 80 ? 'Excelente' : 
                     field.fillRate > 50 ? 'Bom' : 'Precisa Atenção'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Componente de métrica
function MetricCard({ title, value, icon, color }: {
  title: string;
  value: string | number;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600'
  };

  return (
    <div className="bg-white rounded-lg shadow border overflow-hidden">
      <div className={`bg-gradient-to-r ${colorClasses[color]} px-4 py-3`}>
        <div className="flex items-center justify-between text-white">
          <span className="text-2xl">{icon}</span>
          <span className="text-xs opacity-90">CAMPO</span>
        </div>
      </div>
      <div className="p-4">
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-500">{title}</div>
      </div>
    </div>
  );
}

// Constantes e helpers
const PIE_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
];

const TYPE_LABELS: Record<string, string> = {
  'text': 'Texto',
  'number': 'Número',
  'enum': 'Seleção',
  'date': 'Data',
  'boolean': 'Sim/Não',
  'multi_enum': 'Multi-seleção',
  'currency': 'Moeda'
};

function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    'text': 'bg-blue-100 text-blue-800',
    'number': 'bg-green-100 text-green-800',
    'enum': 'bg-purple-100 text-purple-800',
    'date': 'bg-orange-100 text-orange-800',
    'boolean': 'bg-gray-100 text-gray-800',
    'multi_enum': 'bg-pink-100 text-pink-800',
    'currency': 'bg-yellow-100 text-yellow-800'
  };
  
  return colors[type] || 'bg-gray-100 text-gray-800';
}