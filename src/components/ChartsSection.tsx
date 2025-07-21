// src/components/ChartsSection.tsx - VERSÃO CORRIGIDA PARA EXIBIÇÃO DOS DADOS
'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

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

interface ChartsSectionProps {
  trackings: Tracking[];
}

// ✅ Cores otimizadas para gráficos
const CHART_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
];

// ✅ FUNÇÕES DE EXTRAÇÃO MELHORADAS
const extractDataFromAllSources = (tracking: Tracking, fieldName: string): string | null => {
  // Lista COMPLETA de possíveis fontes para cada campo
  const fieldMappings: Record<string, string[]> = {
    'Exportador': ['Exportador', 'EXPORTADOR', 'exportador'],
    'PRODUTO': ['PRODUTO', 'Produto', 'produto', 'PRODUCTS', 'Products'],
    'CIA DE TRANSPORTE': ['CIA DE TRANSPORTE', 'Cia de Transporte', 'COMPANHIA', 'Companhia'],
    'Órgãos Anuentes': ['Órgãos Anuentes', 'ÓRGÃOS ANUENTES', 'Orgaos Anuentes', 'ORGAOS_ANUENTES'],
    'ETD': ['ETD', 'etd', 'Data ETD', 'DATA_ETD']
  };

  const possibleFields = fieldMappings[fieldName] || [fieldName];
  
  // 1. Tentar customFields primeiro (todas as variações)
  for (const field of possibleFields) {
    const value = tracking.customFields?.[field];
    if (value && typeof value === 'string' && value.trim() !== '') {
      return value.trim();
    }
  }

  // 2. Tentar campos estruturados
  switch (fieldName) {
    case 'Exportador':
      return tracking.transport?.exporter;
    case 'CIA DE TRANSPORTE':
      return tracking.transport?.company;
    case 'ETD':
      return tracking.schedule?.etd;
  }

  return null;
};

const extractArrayFromAllSources = (tracking: Tracking, fieldName: string): string[] => {
  // 1. Tentar arrays estruturados primeiro
  switch (fieldName) {
    case 'PRODUTO':
      if (tracking.transport?.products && tracking.transport.products.length > 0) {
        return tracking.transport.products.filter(p => p && p.trim() !== '');
      }
      break;
    case 'Órgãos Anuentes':
      if (tracking.regulatory?.orgaosAnuentes && tracking.regulatory.orgaosAnuentes.length > 0) {
        return tracking.regulatory.orgaosAnuentes.filter(o => o && o.trim() !== '');
      }
      break;
  }

  // 2. Tentar extrair de customFields como string
  const stringValue = extractDataFromAllSources(tracking, fieldName);
  if (stringValue) {
    return stringValue
      .split(/[,;|\/]/)  // Split por múltiplos separadores
      .map(item => item.trim())
      .filter(item => item !== '' && item.length > 1); // Filtrar strings muito curtas
  }

  return [];
};

const parseETDDate = (etdString: string | null): { year: number; month: number } | null => {
  if (!etdString) return null;
  
  try {
    // Limpar string de espaços e caracteres especiais
    const cleanEtd = etdString.trim().replace(/[^\d\/\-\.]/g, '');
    
    // Múltiplos formatos de data
    const dateFormats = [
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/,    // YYYY-MM-DD
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,  // DD/MM/YYYY
      /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/,  // YYYY/MM/DD
      /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,  // DD.MM.YYYY
      /^(\d{4})\.(\d{1,2})\.(\d{1,2})$/   // YYYY.MM.DD
    ];
    
    for (let i = 0; i < dateFormats.length; i++) {
      const format = dateFormats[i];
      const match = cleanEtd.match(format);
      if (match) {
        let year, month;
        
        if (i === 1 || i === 3) { // DD/MM/YYYY ou DD.MM.YYYY
          year = parseInt(match[3]);
          month = parseInt(match[2]);
        } else { // YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD
          year = parseInt(match[1]);
          month = parseInt(match[2]);
        }
        
        // Validar ano e mês
        if (year >= 2020 && year <= 2030 && month >= 1 && month <= 12) {
          return { year, month };
        }
      }
    }
    
    // Fallback: tentar parsing direto
    const date = new Date(etdString);
    if (!isNaN(date.getTime()) && date.getFullYear() >= 2020 && date.getFullYear() <= 2030) {
      return { year: date.getFullYear(), month: date.getMonth() + 1 };
    }
  } catch (error) {
    // Silent fail
  }
  
  return null;
};

export function ChartsSection({ trackings }: ChartsSectionProps) {
  // ✅ Processamento ROBUSTO dos dados para gráficos
  const chartData = useMemo(() => {
    if (!trackings || trackings.length === 0) {
      return {
        exporters: [],
        products: [],
        transportCompanies: [],
        orgaosAnuentes: [],
        etdTimeline: []
      };
    }

    // ✅ GRÁFICO 1: Exportadores com extração COMPLETA
    const exporterCounts = new Map<string, number>();
    let exportersFound = 0;
    
    trackings.forEach(tracking => {
      const exporter = extractDataFromAllSources(tracking, 'Exportador');
      if (exporter) {
        exportersFound++;
        const current = exporterCounts.get(exporter) || 0;
        exporterCounts.set(exporter, current + 1);
      }
    });

    const exportersData = Array.from(exporterCounts.entries())
      .map(([name, count]) => ({
        name: name.length > 25 ? name.substring(0, 25) + '...' : name,
        fullName: name,
        count,
        percentage: ((count / trackings.length) * 100).toFixed(1)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // ✅ GRÁFICO 2: Produtos com extração ROBUSTA
    const productCounts = new Map<string, number>();
    let productsFound = 0;
    
    trackings.forEach(tracking => {
      const products = extractArrayFromAllSources(tracking, 'PRODUTO');
      if (products.length > 0) {
        productsFound++;
        products.forEach(product => {
          if (product && product.length > 1) { // Filtrar produtos muito curtos
            const current = productCounts.get(product) || 0;
            productCounts.set(product, current + 1);
          }
        });
      }
    });

    const productsData = Array.from(productCounts.entries())
      .map(([name, count]) => ({
        name: name.length > 25 ? name.substring(0, 25) + '...' : name,
        fullName: name,
        count,
        percentage: ((count / trackings.length) * 100).toFixed(1)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // ✅ GRÁFICO 3: Companhias de Transporte
    const transportCounts = new Map<string, number>();
    let transportFound = 0;
    
    trackings.forEach(tracking => {
      const company = extractDataFromAllSources(tracking, 'CIA DE TRANSPORTE');
      if (company) {
        transportFound++;
        const current = transportCounts.get(company) || 0;
        transportCounts.set(company, current + 1);
      }
    });

    const transportCompaniesData = Array.from(transportCounts.entries())
      .map(([name, count]) => ({
        name: name.length > 25 ? name.substring(0, 25) + '...' : name,
        fullName: name,
        count,
        percentage: ((count / trackings.length) * 100).toFixed(1)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // ✅ GRÁFICO 4: Órgãos Anuentes com EXTRAÇÃO MELHORADA
    const orgaosCounts = new Map<string, number>();
    let orgaosFound = 0;
    
    trackings.forEach(tracking => {
      const orgaos = extractArrayFromAllSources(tracking, 'Órgãos Anuentes');
      if (orgaos.length > 0) {
        orgaosFound++;
        orgaos.forEach(orgao => {
          if (orgao && orgao.length > 2) { // Filtrar órgãos muito curtos
            const current = orgaosCounts.get(orgao) || 0;
            orgaosCounts.set(orgao, current + 1);
          }
        });
      }
    });

    const orgaosAnuentesData = Array.from(orgaosCounts.entries())
      .map(([name, value]) => ({
        name: name.length > 20 ? name.substring(0, 20) + '...' : name,
        fullName: name,
        value,
        percentage: ((value / trackings.length) * 100).toFixed(1)
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // ✅ GRÁFICO 5: Timeline ETD MELHORADA
    const monthCounts = new Map<string, number>();
    let etdFound = 0;
    
    trackings.forEach(tracking => {
      const etdString = extractDataFromAllSources(tracking, 'ETD');
      if (etdString) {
        const parsedDate = parseETDDate(etdString);
        if (parsedDate) {
          etdFound++;
          const monthKey = `${parsedDate.year}-${parsedDate.month.toString().padStart(2, '0')}`;
          const current = monthCounts.get(monthKey) || 0;
          monthCounts.set(monthKey, current + 1);
        }
      }
    });

    const etdTimelineData = Array.from(monthCounts.entries())
      .map(([monthKey, operacoes]) => {
        const [year, month] = monthKey.split('-');
        const monthNames = [
          'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
          'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
        ];
        return {
          month: monthKey,
          monthLabel: `${monthNames[parseInt(month) - 1]}/${year}`,
          operacoes
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12);

    // ✅ Debug info para desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Charts Data Debug:', {
        total: trackings.length,
        exportersFound,
        productsFound,
        transportFound,
        orgaosFound,
        etdFound,
        exportersData: exportersData.length,
        productsData: productsData.length,
        transportData: transportCompaniesData.length,
        orgaosData: orgaosAnuentesData.length,
        etdData: etdTimelineData.length
      });
    }

    return {
      exporters: exportersData,
      products: productsData,
      transportCompanies: transportCompaniesData,
      orgaosAnuentes: orgaosAnuentesData,
      etdTimeline: etdTimelineData
    };
  }, [trackings]);

  // ✅ Validação de dados sem logs em produção
  const hasData = trackings && trackings.length > 0;
  const hasChartsData = Object.values(chartData).some(data => data.length > 0);

  if (!hasData) {
    return (
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Análise de Dados</h3>
        <div className="text-center py-8">
          <p className="text-gray-500">Nenhum dado disponível para análise</p>
          <p className="text-sm text-gray-400 mt-2">Verifique a conexão com o Asana</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status dos dados MELHORADO */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-blue-900">Status da Extração de Dados</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-2 text-sm">
              <div className="text-blue-700">
                <span className="font-medium">Exportadores:</span> {chartData.exporters.length > 0 ? '✅' : '❌'}
              </div>
              <div className="text-blue-700">
                <span className="font-medium">Produtos:</span> {chartData.products.length > 0 ? '✅' : '❌'}
              </div>
              <div className="text-blue-700">
                <span className="font-medium">Transportes:</span> {chartData.transportCompanies.length > 0 ? '✅' : '❌'}
              </div>
              <div className="text-blue-700">
                <span className="font-medium">Órgãos:</span> {chartData.orgaosAnuentes.length > 0 ? '✅' : '❌'}
              </div>
              <div className="text-blue-700">
                <span className="font-medium">ETD:</span> {chartData.etdTimeline.length > 0 ? '✅' : '❌'}
              </div>
            </div>
          </div>
          <div className="text-blue-600 text-2xl font-bold">{trackings.length}</div>
        </div>
      </div>

      {/* Grid de gráficos otimizado */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Gráfico 1: Exportadores */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Top Exportadores ({chartData.exporters.length})
          </h3>
          {chartData.exporters.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData.exporters}
                  layout="horizontal"
                  margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={95} 
                    fontSize={11}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip 
                    formatter={(value: any, name: string, props: any) => [
                      `${value} operações (${props.payload.percentage}%)`,
                      'Operações'
                    ]}
                    labelFormatter={(label: any, payload: any) => payload?.[0]?.payload?.fullName || label}
                  />
                  <Bar dataKey="count" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p>Campo 'Exportador' não encontrado</p>
                <p className="text-sm text-gray-400 mt-1">Verifique custom fields no Asana</p>
              </div>
            </div>
          )}
        </div>

        {/* Gráfico 2: Produtos */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Top Produtos ({chartData.products.length})
          </h3>
          {chartData.products.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData.products}
                  layout="horizontal"
                  margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={95} 
                    fontSize={11}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip 
                    formatter={(value: any, name: string, props: any) => [
                      `${value} operações (${props.payload.percentage}%)`,
                      'Operações'
                    ]}
                    labelFormatter={(label: any, payload: any) => payload?.[0]?.payload?.fullName || label}
                  />
                  <Bar dataKey="count" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p>Campo 'PRODUTO' não encontrado</p>
                <p className="text-sm text-gray-400 mt-1">Verifique custom fields no Asana</p>
              </div>
            </div>
          )}
        </div>

        {/* Gráfico 3: Companhias de Transporte */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Companhias de Transporte ({chartData.transportCompanies.length})
          </h3>
          {chartData.transportCompanies.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData.transportCompanies}
                  layout="horizontal"
                  margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={95} 
                    fontSize={11}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip 
                    formatter={(value: any, name: string, props: any) => [
                      `${value} operações (${props.payload.percentage}%)`,
                      'Operações'
                    ]}
                    labelFormatter={(label: any, payload: any) => payload?.[0]?.payload?.fullName || label}
                  />
                  <Bar dataKey="count" fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p>Campo 'CIA DE TRANSPORTE' não encontrado</p>
                <p className="text-sm text-gray-400 mt-1">Verifique custom fields no Asana</p>
              </div>
            </div>
          )}
        </div>

        {/* Gráfico 4: Órgãos Anuentes */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Órgãos Anuentes ({chartData.orgaosAnuentes.length})
          </h3>
          {chartData.orgaosAnuentes.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.orgaosAnuentes}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.orgaosAnuentes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any, name: string, props: any) => [
                      `${value} operações`,
                      'Total'
                    ]}
                    labelFormatter={(label: any, payload: any) => payload?.payload?.fullName || label}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p>Campo 'Órgãos Anuentes' não encontrado</p>
                <p className="text-sm text-gray-400 mt-1">Verifique custom fields no Asana</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Gráfico 5: Timeline ETD (linha completa) */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Cronograma ETD por Mês ({chartData.etdTimeline.length} meses)
        </h3>
        {chartData.etdTimeline.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData.etdTimeline}
                margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="monthLabel" 
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value: any) => [`${value} operações`, 'ETD']}
                  labelFormatter={(label) => `Mês: ${label}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="operacoes" 
                  stroke="#F59E0B" 
                  strokeWidth={3}
                  dot={{ fill: '#F59E0B', strokeWidth: 2, r: 6 }}
                  name="Operações ETD"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-80 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <p>Campo 'ETD' não encontrado</p>
              <p className="text-sm text-gray-400 mt-1">Verifique datas ETD no Asana</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}