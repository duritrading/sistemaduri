// src/components/ChartsSection.tsx - Gráficos Separados com Debug
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

// ✅ Cores para gráfico de pizza
const PIE_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
];

export function ChartsSection({ trackings }: ChartsSectionProps) {
  // ✅ Debug dos dados recebidos
  console.log('📊 ChartsSection - Total trackings recebidos:', trackings.length);
  
  if (trackings.length > 0) {
    const sample = trackings[0];
    console.log('📋 Sample tracking para debug:');
    console.log('  - Exporter:', sample.transport?.exporter);
    console.log('  - Products:', sample.transport?.products);
    console.log('  - Transport Company:', sample.transport?.company);
    console.log('  - Órgãos Anuentes:', sample.regulatory?.orgaosAnuentes);
    console.log('  - ETD:', sample.schedule?.etd);
    console.log('  - Custom Fields Keys:', Object.keys(sample.customFields || {}));
  }

  // ✅ Processamento de dados para gráficos com debug
  const chartData = useMemo(() => {
    console.log('🔄 Processando dados para gráficos...');

    // Gráfico 1: Exportadores
    const exporterCounts = {} as Record<string, number>;
    trackings.forEach(tracking => {
      // Tentar múltiplas fontes para exportador
      const exporter = tracking.transport?.exporter || 
                      tracking.customFields?.['Exportador'] || 
                      tracking.customFields?.['EXPORTADOR'] ||
                      tracking.customFields?.['exportador'];
      
      if (exporter && typeof exporter === 'string' && exporter.trim() !== '') {
        const cleanExporter = exporter.trim();
        exporterCounts[cleanExporter] = (exporterCounts[cleanExporter] || 0) + 1;
      }
    });

    console.log('📊 Exportadores encontrados:', Object.keys(exporterCounts).length, exporterCounts);

    const exportersData = Object.entries(exporterCounts)
      .map(([name, count]) => ({ 
        name: name.length > 20 ? name.substring(0, 20) + '...' : name, 
        fullName: name,
        count, 
        percentage: trackings.length > 0 ? ((count / trackings.length) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8); // Top 8 para melhor visualização

    // Gráfico 2: Produtos
    const productCounts = {} as Record<string, number>;
    trackings.forEach(tracking => {
      // Tentar múltiplas fontes para produtos
      const products = tracking.transport?.products || [];
      const customProduct = tracking.customFields?.['PRODUTO'] || 
                           tracking.customFields?.['Produto'] ||
                           tracking.customFields?.['produto'];
      
      if (customProduct && typeof customProduct === 'string') {
        // Se produto vem como string, split por vírgulas
        const productList = customProduct.split(/[,;]/).map(p => p.trim()).filter(Boolean);
        productList.forEach(product => {
          if (product) {
            productCounts[product] = (productCounts[product] || 0) + 1;
          }
        });
      } else if (products.length > 0) {
        products.forEach(product => {
          if (product && typeof product === 'string' && product.trim() !== '') {
            const cleanProduct = product.trim();
            productCounts[cleanProduct] = (productCounts[cleanProduct] || 0) + 1;
          }
        });
      }
    });

    console.log('📦 Produtos encontrados:', Object.keys(productCounts).length, productCounts);

    const productsData = Object.entries(productCounts)
      .map(([name, count]) => ({ 
        name: name.length > 20 ? name.substring(0, 20) + '...' : name,
        fullName: name,
        count, 
        percentage: trackings.length > 0 ? ((count / trackings.length) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8); // Top 8

    // Gráfico 3: Companhias de Transporte
    const transportCounts = {} as Record<string, number>;
    trackings.forEach(tracking => {
      const company = tracking.transport?.company || 
                     tracking.customFields?.['CIA DE TRANSPORTE'] ||
                     tracking.customFields?.['Cia de Transporte'] ||
                     tracking.customFields?.['cia_de_transporte'];
      
      if (company && typeof company === 'string' && company.trim() !== '') {
        const cleanCompany = company.trim();
        transportCounts[cleanCompany] = (transportCounts[cleanCompany] || 0) + 1;
      }
    });

    console.log('🚛 Companhias de transporte encontradas:', Object.keys(transportCounts).length, transportCounts);

    const transportData = Object.entries(transportCounts)
      .map(([name, count]) => ({ 
        name: name.length > 15 ? name.substring(0, 15) + '...' : name,
        fullName: name,
        count, 
        percentage: trackings.length > 0 ? ((count / trackings.length) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8); // Top 8

    // Gráfico 4: Órgãos Anuentes  
    const orgaosCounts = {} as Record<string, number>;
    trackings.forEach(tracking => {
      const orgaos = tracking.regulatory?.orgaosAnuentes || [];
      const customOrgaos = tracking.customFields?.['Órgãos Anuentes'] ||
                          tracking.customFields?.['ÓRGÃOS ANUENTES'] ||
                          tracking.customFields?.['orgaos_anuentes'];
      
      if (customOrgaos && typeof customOrgaos === 'string') {
        const orgaosList = customOrgaos.split(/[,;]/).map(o => o.trim()).filter(Boolean);
        orgaosList.forEach(orgao => {
          if (orgao) {
            orgaosCounts[orgao] = (orgaosCounts[orgao] || 0) + 1;
          }
        });
      } else if (orgaos.length > 0) {
        orgaos.forEach(orgao => {
          if (orgao && typeof orgao === 'string' && orgao.trim() !== '') {
            const cleanOrgao = orgao.trim();
            orgaosCounts[cleanOrgao] = (orgaosCounts[cleanOrgao] || 0) + 1;
          }
        });
      }
    });

    console.log('🏛️ Órgãos anuentes encontrados:', Object.keys(orgaosCounts).length, orgaosCounts);

    const orgaosData = Object.entries(orgaosCounts)
      .map(([name, value]) => ({ 
        name: name.length > 15 ? name.substring(0, 15) + '...' : name,
        fullName: name,
        value, 
        percentage: trackings.length > 0 ? ((value / trackings.length) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.value - a.value);

    // Gráfico 5: ETD por mês
    const etdCounts = {} as Record<string, number>;
    trackings.forEach(tracking => {
      const etd = tracking.schedule?.etd || tracking.customFields?.['ETD'];
      
      if (etd && typeof etd === 'string') {
        try {
          // Tentar diferentes formatos de data
          let date: Date;
          
          if (etd.includes('-')) {
            // Formato ISO: 2025-01-15 ou 2025-01-15T00:00:00Z
            date = new Date(etd);
          } else if (etd.includes('/')) {
            // Formato brasileiro: 15/01/2025
            const parts = etd.split('/');
            if (parts.length === 3) {
              date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            } else {
              date = new Date(etd);
            }
          } else {
            date = new Date(etd);
          }
          
          if (!isNaN(date.getTime()) && date.getFullYear() >= 2020 && date.getFullYear() <= 2030) {
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            etdCounts[monthKey] = (etdCounts[monthKey] || 0) + 1;
          }
        } catch (e) {
          console.warn('Data ETD inválida:', etd, e);
        }
      }
    });

    console.log('📅 ETDs por mês encontrados:', Object.keys(etdCounts).length, etdCounts);

    const etdTimelineData = Object.entries(etdCounts)
      .map(([month, operacoes]) => ({ 
        month, 
        operacoes,
        monthLabel: new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const result = {
      exporters: exportersData,
      products: productsData,
      transportCompanies: transportData,
      orgaosAnuentes: orgaosData,
      etdTimeline: etdTimelineData
    };

    console.log('📊 Resultado final dos gráficos:');
    console.log('  - Exporters:', result.exporters.length, 'items');
    console.log('  - Products:', result.products.length, 'items');
    console.log('  - Transport:', result.transportCompanies.length, 'items');
    console.log('  - Órgãos:', result.orgaosAnuentes.length, 'items');
    console.log('  - Timeline:', result.etdTimeline.length, 'items');

    return result;
  }, [trackings]);

  // Se não há dados, mostrar mensagem
  if (trackings.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900">Análise de Dados</h2>
        <div className="bg-gray-50 border rounded-lg p-8 text-center">
          <p className="text-gray-600">Não há dados suficientes para gerar os gráficos.</p>
          <p className="text-sm text-gray-500 mt-2">Verifique os filtros aplicados ou aguarde o carregamento dos dados.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Análise de Dados</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: Exportadores */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Exportadores</h3>
          {chartData.exporters.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData.exporters}
                  layout="horizontal"
                  margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={75} fontSize={12} />
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
              <p>Nenhum exportador encontrado nos dados</p>
            </div>
          )}
        </div>

        {/* Gráfico 2: Produtos */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Produtos</h3>
          {chartData.products.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData.products}
                  layout="horizontal"
                  margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={75} fontSize={12} />
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
              <p>Nenhum produto encontrado nos dados</p>
            </div>
          )}
        </div>

        {/* Gráfico 3: Companhias de Transporte */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Companhias de Transporte</h3>
          {chartData.transportCompanies.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData.transportCompanies}
                  layout="horizontal"
                  margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={75} fontSize={12} />
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
              <p>Nenhuma companhia de transporte encontrada</p>
            </div>
          )}
        </div>

        {/* Gráfico 4: Órgãos Anuentes */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Órgãos Anuentes</h3>
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
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.orgaosAnuentes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
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
              <p>Nenhum órgão anuente encontrado</p>
            </div>
          )}
        </div>
      </div>

      {/* Gráfico 5: ETD Timeline (linha completa) */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cronograma ETD por Mês</h3>
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
            <p>Nenhuma data ETD encontrada nos dados</p>
          </div>
        )}
      </div>
    </div>
  );
}