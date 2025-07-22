// src/components/ChartsSection.tsx - CORREÇÃO LEGENDA + DEBUG ÓRGÃOS
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

// ✅ FUNÇÃO DE PARSING DE DATAS ETD
const parseETDDate = (etdString: string): { year: number; month: number } | null => {
  if (!etdString || typeof etdString !== 'string') return null;
  
  const cleanString = etdString.trim();
  
  const patterns = [
    /(\d{4})-(\d{1,2})-(\d{1,2})/, // YYYY-MM-DD
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // DD/MM/YYYY ou MM/DD/YYYY
    /(\d{1,2})-(\d{1,2})-(\d{4})/, // DD-MM-YYYY
    /(\d{4})(\d{2})(\d{2})/ // YYYYMMDD
  ];
  
  for (const pattern of patterns) {
    const match = cleanString.match(pattern);
    if (match) {
      let year, month;
      
      if (pattern.source.includes('(\\d{4})-(\\d{1,2})') || pattern.source.includes('(\\d{4})(\\d{2})')) {
        year = parseInt(match[1]);
        month = parseInt(match[2]);
      } else {
        const yearIndex = match.findIndex(m => m && m.length === 4);
        if (yearIndex > 0) {
          year = parseInt(match[yearIndex]);
          month = parseInt(match[1]);
        }
      }
      
      if (year && month && year >= 2020 && year <= 2030 && month >= 1 && month <= 12) {
        return { year, month };
      }
    }
  }
  
  return null;
};

export function ChartsSection({ trackings }: ChartsSectionProps) {
  // ✅ DADOS DOS GRÁFICOS
  const chartData = useMemo(() => {
    console.log('🔍 Processando dados para gráficos:', trackings.length, 'trackings');

    if (!trackings || trackings.length === 0) {
      return {
        exporters: [],
        products: [],
        transportCompanies: [],
        orgaosAnuentes: [],
        etdTimeline: []
      };
    }

    // ✅ GRÁFICO 1: Exportadores
    const exporterCounts = new Map<string, number>();
    let exportersFound = 0;
    
    trackings.forEach((tracking, index) => {
      const sources = [
        tracking.transport?.exporter,
        tracking.customFields?.['Exportador'],
        tracking.customFields?.['EXPORTADOR'],
        tracking.customFields?.['exportador']
      ].filter(Boolean);
      
      const exporter = sources[0];
      
      if (exporter && typeof exporter === 'string' && exporter.trim() !== '') {
        exportersFound++;
        const cleanExporter = exporter.trim();
        const current = exporterCounts.get(cleanExporter) || 0;
        exporterCounts.set(cleanExporter, current + 1);
        
        if (index < 3) {
          console.log(`📊 Tracking ${index + 1} - Exportador encontrado:`, cleanExporter);
        }
      }
    });

    const exportersData = Array.from(exporterCounts.entries())
      .map(([name, count]) => ({
        name: name.length > 15 ? name.substring(0, 15) + '...' : name,
        fullName: name,
        value: count,
        count: count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // ✅ GRÁFICO 2: Produtos
    const productCounts = new Map<string, number>();
    let productsFound = 0;
    
    trackings.forEach(tracking => {
      const products = tracking.transport?.products;
      if (Array.isArray(products) && products.length > 0) {
        products.forEach(product => {
          if (product && typeof product === 'string' && product.trim() !== '') {
            productsFound++;
            const cleanProduct = product.trim();
            const current = productCounts.get(cleanProduct) || 0;
            productCounts.set(cleanProduct, current + 1);
          }
        });
      }
    });

    const productsData = Array.from(productCounts.entries())
      .map(([name, value]) => ({
        name: name.length > 25 ? name.substring(0, 25) + '...' : name, // ✅ Mais espaço para labels internas
        fullName: name,
        value,
        percentage: ((value / trackings.length) * 100).toFixed(1)
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // ✅ GRÁFICO 3: Companhias de Transporte
    const transportCounts = new Map<string, number>();
    let transportFound = 0;
    
    trackings.forEach(tracking => {
      const company = tracking.transport?.company;
      if (company && typeof company === 'string' && company.trim() !== '') {
        transportFound++;
        const cleanCompany = company.trim();
        const current = transportCounts.get(cleanCompany) || 0;
        transportCounts.set(cleanCompany, current + 1);
      }
    });

    const transportCompaniesData = Array.from(transportCounts.entries())
      .map(([name, count]) => ({
        name: name.length > 15 ? name.substring(0, 15) + '...' : name,
        fullName: name,
        count,
        percentage: ((count / trackings.length) * 100).toFixed(1)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // 🚨 DEBUG ESPECÍFICO PARA TRACKINGS 657, 658, 659
    console.log('🔍 INVESTIGAÇÃO ESPECÍFICA - Trackings mencionados:');
    const targetTrackings = trackings.filter(t => 
      t.title.includes('657') || 
      t.title.includes('658') || 
      t.title.includes('659')
    );
    
    console.log(`📊 Encontrados ${targetTrackings.length} trackings alvo de ${trackings.length} total`);
    
    targetTrackings.forEach((tracking, index) => {
      console.log(`\n🎯 ANÁLISE DETALHADA - ${tracking.title}:`);
      console.log('  📋 CustomFields COMPLETO:', tracking.customFields);
      console.log('  📝 Chaves disponíveis:', Object.keys(tracking.customFields || {}));
      console.log('  🔍 Regulatory:', tracking.regulatory);
      
      // Buscar EXATAMENTE o campo "Orgãos Anuentes"
      const orgaosExato = tracking.customFields?.['Orgãos Anuentes'];
      console.log('  ✅ Campo exato "Orgãos Anuentes":', orgaosExato);
      
      // Buscar variações
      const variacoes = {
        'Orgãos Anuentes': tracking.customFields?.['Orgãos Anuentes'],
        'ORGÃOS ANUENTES': tracking.customFields?.['ORGÃOS ANUENTES'],
        'Órgãos Anuentes': tracking.customFields?.['Órgãos Anuentes'],
        'Orgaos Anuentes': tracking.customFields?.['Orgaos Anuentes']
      };
      console.log('  🔄 Variações testadas:', variacoes);
      
      // Buscar campos relacionados
      const camposRelacionados = Object.keys(tracking.customFields || {})
        .filter(key => 
          key.toLowerCase().includes('orgao') || 
          key.toLowerCase().includes('órgão') ||
          key.toLowerCase().includes('anuente') ||
          key.toLowerCase().includes('anvisa') ||
          key.toLowerCase().includes('mapa')
        );
      
      if (camposRelacionados.length > 0) {
        console.log('  ✅ Campos relacionados encontrados:', camposRelacionados);
        camposRelacionados.forEach(campo => {
          console.log(`    - ${campo}:`, tracking.customFields?.[campo]);
        });
      } else {
        console.log('  ❌ NENHUM campo relacionado a órgãos encontrado!');
        console.log('  📝 TODOS os 12 campos:', Object.keys(tracking.customFields || {}));
      }
    });
    const orgaosCounts = new Map<string, number>();
    let orgaosFound = 0;
    let trackingsWithOrgaos = 0;
    let trackingsWithoutOrgaos = 0;
    
    trackings.forEach((tracking, index) => {
      // Debug expandido de TODOS os trackings que tenham o campo
      const orgaosFieldValue = tracking.customFields?.['Orgãos Anuentes'];
      
      if (orgaosFieldValue) {
        trackingsWithOrgaos++;
        console.log(`✅ Tracking ${index + 1} - TEM Órgãos Anuentes:`, {
          title: tracking.title.substring(0, 50),
          orgaosValue: orgaosFieldValue,
          orgaosType: typeof orgaosFieldValue
        });
      } else {
        trackingsWithoutOrgaos++;
        // Log apenas primeiros 5 sem o campo para não poluir console
        if (trackingsWithoutOrgaos <= 5) {
          console.log(`❌ Tracking ${index + 1} - SEM Órgãos Anuentes:`, {
            title: tracking.title.substring(0, 50),
            allFields: Object.keys(tracking.customFields || {}).join(', ')
          });
        }
      }
      
      // ✅ BUSCA COM NOME EXATO DO ASANA: "Orgãos Anuentes"
      const possibleFieldNames = [
        'Orgãos Anuentes',      // ✅ CAMPO EXATO DO ASANA
        'ORGÃOS ANUENTES',      // ✅ Maiúscula 
        'Órgãos Anuentes',      // ✅ Variação comum
        'ÓRGÃOS ANUENTES', 
        'Orgaos Anuentes',
        'ORGAOS ANUENTES',
        'Órgão Anuente',
        'ORGAO ANUENTE',
        'Orgão',
        'ORGAO',
        'Anuentes',
        'ANUENTES'
      ];
      
      // Buscar por qualquer campo que contenha "orgao" ou "anuente"
      const orgaoFields = Object.keys(tracking.customFields || {}).filter(key => 
        key.toLowerCase().includes('orgao') || 
        key.toLowerCase().includes('órgão') ||
        key.toLowerCase().includes('anuente')
      );
      
      if (index < 3 && orgaoFields.length > 0) {
        console.log(`🔍 Campos relacionados a órgãos encontrados:`, orgaoFields);
        orgaoFields.forEach(field => {
          console.log(`  - ${field}:`, tracking.customFields[field]);
        });
      }
      
      // Tentar extrair de múltiplas fontes
      const sources = [
        tracking.regulatory?.orgaosAnuentes,
        ...possibleFieldNames.map(field => tracking.customFields?.[field]),
        ...orgaoFields.map(field => tracking.customFields?.[field])
      ].filter(source => source !== undefined && source !== null);
      
      let foundOrgaos = false;
      
      for (const source of sources) {
        if (Array.isArray(source) && source.length > 0) {
          source.forEach(orgao => {
            if (orgao && typeof orgao === 'string' && orgao.trim() !== '') {
              foundOrgaos = true;
              orgaosFound++;
              const cleanOrgao = orgao.trim();
              const current = orgaosCounts.get(cleanOrgao) || 0;
              orgaosCounts.set(cleanOrgao, current + 1);
            }
          });
          break;
        } else if (typeof source === 'string' && source.trim() !== '') {
          const orgaos = source.split(/[,;|]/).map(o => o.trim()).filter(o => o !== '');
          if (orgaos.length > 0) {
            foundOrgaos = true;
            orgaos.forEach(orgao => {
              orgaosFound++;
              const current = orgaosCounts.get(orgao) || 0;
              orgaosCounts.set(orgao, current + 1);
            });
            break;
          }
        }
      }
    });

    const orgaosAnuentesData = Array.from(orgaosCounts.entries())
      .map(([name, value]) => ({
        name: name.length > 18 ? name.substring(0, 18) + '...' : name,
        fullName: name,
        value,
        percentage: ((value / trackings.length) * 100).toFixed(1)
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    console.log('📊 Órgãos Anuentes RESULTADO FINAL:', {
      found: orgaosFound,
      unique: orgaosCounts.size,
      finalData: orgaosAnuentesData.length,
      trackingsComDados: trackingsWithOrgaos,
      percentual: ((trackingsWithOrgaos / trackings.length) * 100).toFixed(1) + '%'
    });

    // ✅ GRÁFICO 5: Timeline ETD
    const monthCounts = new Map<string, number>();
    let etdFound = 0;
    
    trackings.forEach(tracking => {
      const etdString = tracking.schedule?.etd;
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

    return {
      exporters: exportersData,
      products: productsData,
      transportCompanies: transportCompaniesData,
      orgaosAnuentes: orgaosAnuentesData,
      etdTimeline: etdTimelineData
    };
  }, [trackings]);

  const hasData = trackings && trackings.length > 0;

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
      {/* Status dos dados */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-blue-900">Status da Extração de Dados</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-2 text-sm">
              <div className="text-blue-700">
                <span className="font-medium">Exportadores:</span> {chartData.exporters.length > 0 ? '✅' : '❌'} ({chartData.exporters.length})
              </div>
              <div className="text-blue-700">
                <span className="font-medium">Produtos:</span> {chartData.products.length > 0 ? '✅' : '❌'} ({chartData.products.length})
              </div>
              <div className="text-blue-700">
                <span className="font-medium">Transportes:</span> {chartData.transportCompanies.length > 0 ? '✅' : '❌'} ({chartData.transportCompanies.length})
              </div>
              <div className="text-blue-700">
                <span className="font-medium">Órgãos:</span> {chartData.orgaosAnuentes.length > 0 ? '✅' : '❌'} ({chartData.orgaosAnuentes.length})
              </div>
              <div className="text-blue-700">
                <span className="font-medium">ETD:</span> {chartData.etdTimeline.length > 0 ? '✅' : '❌'} ({chartData.etdTimeline.length})
              </div>
            </div>
          </div>
          <div className="text-blue-600 text-2xl font-bold">{trackings.length}</div>
        </div>
      </div>

      {/* ✅ LAYOUT OTIMIZADO */}
      <div className="space-y-6">
        {/* ✅ PRIMEIRA LINHA: Produtos MAIOR - LEGENDA CORRIGIDA */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Distribuição de Produtos ({chartData.products.length})
          </h3>
          {chartData.products.length > 0 ? (
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <Pie
                    data={chartData.products}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage}%`} // ✅ LEGENDA INTERNA COMPLETA
                    outerRadius={140} // ✅ Aumentado mais ainda
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.products.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => [`${value} operações`, 'Total']}
                    labelFormatter={(label: any, payload: any) => payload?.payload?.fullName || label}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* ✅ REMOVIDA A LEGENDA EXTERNA QUE ESTAVA CORTADA */}
            </div>
          ) : (
            <div className="h-96 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p>Nenhum produto encontrado</p>
                <p className="text-sm text-gray-400 mt-1">Verifique campo 'PRODUTO' no Asana</p>
              </div>
            </div>
          )}
        </div>

        {/* ✅ SEGUNDA LINHA: Grid com outros gráficos */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* ✅ GRÁFICO 1: Exportadores */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Top Exportadores ({chartData.exporters.length})
            </h3>
            {chartData.exporters.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.exporters}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={80}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: any) => [`${value} operações`, 'Total']}
                      labelFormatter={(label: any, payload: any) => payload?.[0]?.payload?.fullName || label}
                    />
                    <Bar dataKey="count" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <p>Nenhum exportador encontrado</p>
                  <p className="text-sm text-gray-400 mt-1">Verifique campo 'Exportador' no Asana</p>
                </div>
              </div>
            )}
          </div>

          {/* ✅ GRÁFICO 3: Companhias de Transporte */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Companhias de Transporte ({chartData.transportCompanies.length})
            </h3>
            {chartData.transportCompanies.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.transportCompanies}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={80}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: any) => [`${value} operações`, 'Total']}
                      labelFormatter={(label: any, payload: any) => payload?.[0]?.payload?.fullName || label}
                    />
                    <Bar dataKey="count" fill="#8B5CF6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <p>Nenhuma companhia encontrada</p>
                  <p className="text-sm text-gray-400 mt-1">Verifique campo 'CIA DE TRANSPORTE' no Asana</p>
                </div>
              </div>
            )}
          </div>

          {/* ✅ GRÁFICO 4: Órgãos Anuentes - DEBUG MELHORADO */}
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
                      formatter={(value: any) => [`${value} operações`, 'Total']}
                      labelFormatter={(label: any, payload: any) => payload?.payload?.fullName || label}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <p>❌ Poucos trackings com 'Orgãos Anuentes' preenchidos</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Verifique se o campo está preenchido nos trackings do Asana
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    📊 Console mostra estatísticas detalhadas
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ✅ GRÁFICO 5: Timeline ETD */}
          <div className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Cronograma ETD ({chartData.etdTimeline.length} meses)
            </h3>
            {chartData.etdTimeline.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData.etdTimeline}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="monthLabel" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: any) => [`${value} operações`, 'Total']}
                      labelFormatter={(label: string) => `Mês: ${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="operacoes" 
                      stroke="#10B981" 
                      strokeWidth={2} 
                      dot={{ fill: '#10B981' }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <p>Nenhuma data ETD encontrada</p>
                  <p className="text-sm text-gray-400 mt-1">Verifique campo 'ETD' no Asana</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}