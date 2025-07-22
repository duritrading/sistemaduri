// src/components/ChartsSection.tsx - GRÁFICOS ULTRA-PREMIUM DURI TRADING
'use client';

import { useMemo } from 'react';

interface ChartsSectionProps {
  trackings: any[];
}

// ✅ CORES PREMIUM DURI TRADING
const DURI_PREMIUM_COLORS = {
  primary: '#b51c26',
  primaryLight: '#dc2626', 
  primaryDark: '#8b1119',
  secondary: '#f59e0b',
  accent: '#10b981',
  info: '#3b82f6',
  purple: '#8b5cf6',
  pink: '#ec4899',
  gradients: [
    'linear-gradient(135deg, #b51c26 0%, #dc2626 100%)',
    'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    'linear-gradient(135deg, #10b981 0%, #047857 100%)',
    'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
    'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
    'linear-gradient(135deg, #84cc16 0%, #65a30d 100%)'
  ]
};

// ✅ PARSE DATE FUNCTION (mantida igual)
const parseETDDate = (etdString: string): { year: number; month: number } | null => {
  if (!etdString || typeof etdString !== 'string') return null;
  
  const patterns = [
    /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/,
    /(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/,
    /(\d{1,2})[\/\-.](\d{4})/,
    /(\d{4})[\/\-.](\d{1,2})/
  ];
  
  for (const pattern of patterns) {
    const match = etdString.match(pattern);
    if (match) {
      let year, month;
      
      if (match[3]) {
        year = parseInt(match[3]);
        month = parseInt(match[2]);
      } else if (match[1].length === 4) {
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
  // ✅ DADOS DOS GRÁFICOS (lógica mantida)
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

    // GRÁFICO 1: Exportadores
    const exporterCounts = new Map<string, number>();
    trackings.forEach((tracking) => {
      const sources = [
        tracking.transport?.exporter,
        tracking.customFields?.['Exportador'],
        tracking.customFields?.['EXPORTADOR'],
        tracking.customFields?.['exportador']
      ].filter(Boolean);
      
      const exporter = sources[0];
      if (exporter && typeof exporter === 'string' && exporter.trim() !== '') {
        const cleanExporter = exporter.trim();
        const current = exporterCounts.get(cleanExporter) || 0;
        exporterCounts.set(cleanExporter, current + 1);
      }
    });

    const exportersData = Array.from(exporterCounts.entries())
      .map(([name, count]) => ({
        name: name,
        fullName: name,
        value: count,
        count: count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // GRÁFICO 2: Produtos
    const productCounts = new Map<string, number>();
    trackings.forEach(tracking => {
      const products = tracking.transport?.products;
      if (Array.isArray(products) && products.length > 0) {
        products.forEach(product => {
          if (product && typeof product === 'string' && product.trim() !== '') {
            const cleanProduct = product.trim();
            const current = productCounts.get(cleanProduct) || 0;
            productCounts.set(cleanProduct, current + 1);
          }
        });
      }
    });

    const productsData = Array.from(productCounts.entries())
      .map(([name, value]) => ({
        name: name.length > 25 ? name.substring(0, 25) + '...' : name,
        fullName: name,
        value,
        percentage: ((value / trackings.length) * 100).toFixed(1)
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // GRÁFICO 3: Companhias de Transporte
    const transportCounts = new Map<string, number>();
    trackings.forEach(tracking => {
      const company = tracking.transport?.company;
      if (company && typeof company === 'string' && company.trim() !== '') {
        const cleanCompany = company.trim();
        const current = transportCounts.get(cleanCompany) || 0;
        transportCounts.set(cleanCompany, current + 1);
      }
    });

    const transportCompaniesData = Array.from(transportCounts.entries())
      .map(([name, value]) => ({
        name: name.length > 12 ? name.substring(0, 12) + '...' : name,
        fullName: name,
        value
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    // GRÁFICO 4: Órgãos Anuentes
    const orgaosCounts = new Map<string, number>();
    trackings.forEach(tracking => {
      const orgaos = tracking.regulatory?.orgaosAnuentes;
      if (Array.isArray(orgaos) && orgaos.length > 0) {
        orgaos.forEach(orgao => {
          if (orgao && typeof orgao === 'string' && orgao.trim() !== '') {
            const cleanOrgao = orgao.trim();
            const current = orgaosCounts.get(cleanOrgao) || 0;
            orgaosCounts.set(cleanOrgao, current + 1);
          }
        });
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

    // GRÁFICO 5: Timeline ETD
    const monthCounts = new Map<string, number>();
    trackings.forEach(tracking => {
      const etdString = tracking.schedule?.etd;
      if (etdString) {
        const parsedDate = parseETDDate(etdString);
        if (parsedDate) {
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
      <div className="relative overflow-hidden bg-gradient-to-br from-white via-gray-50 to-red-50/20 border border-gray-200/50 rounded-2xl p-8 shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-r from-[#b51c26]/5 to-transparent"></div>
        <div className="relative z-10 text-center py-8">
          <div className="w-16 h-16 bg-gradient-to-br from-[#b51c26] to-[#dc2626] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Análise de Dados</h3>
          <p className="text-gray-600 mb-2">Nenhum dado disponível para análise</p>
          <p className="text-sm text-gray-500">Verifique a conexão com o Asana</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 mb-16">
      {/* ✅ HEADER PREMIUM DOS GRÁFICOS - Mais afastado e bonito */}
      <div className="relative mt-12 mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#b51c26]/10 to-transparent h-px top-1/2"></div>
        <div className="relative bg-gradient-to-r from-white via-gray-50 to-white px-8">
          <div className="text-center">
            <div className="inline-flex items-center space-x-3 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl px-6 py-3 shadow-lg">
              <div className="w-8 h-8 bg-gradient-to-br from-[#b51c26] to-[#dc2626] rounded-xl flex items-center justify-center shadow-md">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-[#b51c26] to-gray-900 bg-clip-text text-transparent">
                  Gráficos Operacionais
                </h2>
                <p className="text-sm text-gray-600 font-medium mt-1">
                  Visualização dos dados de tracking marítimo • <span className="text-[#b51c26] font-semibold">{trackings.length}</span> operações
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ GRID PRINCIPAL DE GRÁFICOS PREMIUM */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* 📊 GRÁFICO 1: TOP EXPORTADORES - Bar Chart Premium */}
        <div className="relative overflow-hidden bg-gradient-to-br from-white via-gray-50 to-blue-50/30 border border-gray-200/50 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent group-hover:from-blue-500/10 transition-all"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">Top Exportadores</h3>
                <p className="text-sm text-gray-600">{chartData.exporters.length} exportadores ativos</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
            </div>
            
            <div className="space-y-3">
              {chartData.exporters.map((exporter, index) => (
                <div key={index} className="group/bar">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 flex-1 mr-2 leading-tight" title={exporter.fullName}>
                      {exporter.fullName}
                    </span>
                    <span className="text-sm font-bold text-gray-900">{exporter.count}</span>
                  </div>
                  <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out group-hover/bar:brightness-110"
                      style={{
                        background: DURI_PREMIUM_COLORS.gradients[index % DURI_PREMIUM_COLORS.gradients.length],
                        width: `${(exporter.count / Math.max(...chartData.exporters.map(e => e.count))) * 100}%`,
                        boxShadow: `0 0 10px ${index === 0 ? '#3b82f6' : '#6b7280'}40`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 🥧 GRÁFICO 2: DISTRIBUIÇÃO DE PRODUTOS - Pie Chart Premium */}
        <div className="relative overflow-hidden bg-gradient-to-br from-white via-gray-50 to-green-50/30 border border-gray-200/50 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-transparent group-hover:from-green-500/10 transition-all"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">Distribuição de Produtos</h3>
                <p className="text-sm text-gray-600">{chartData.products.length} produtos diferentes</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
              </div>
            </div>
            
            <div className="space-y-2">
              {chartData.products.slice(0, 6).map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-white/60 backdrop-blur-sm border border-gray-100/50 hover:bg-white/80 transition-all group/item">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full shadow-sm"
                      style={{
                        background: DURI_PREMIUM_COLORS.gradients[index % DURI_PREMIUM_COLORS.gradients.length]
                      }}
                    />
                    <span className="text-sm font-medium text-gray-700 truncate" title={product.fullName}>
                      {product.name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-gray-900">{product.value}</span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {product.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 🚛 GRÁFICO 3: COMPANHIAS DE TRANSPORTE - Vertical Bar Premium */}
        <div className="relative overflow-hidden bg-gradient-to-br from-white via-gray-50 to-purple-50/30 border border-gray-200/50 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent group-hover:from-purple-500/10 transition-all"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">Companhias de Transporte</h3>
                <p className="text-sm text-gray-600">{chartData.transportCompanies.length} empresas parceiras</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
            </div>
            
            <div className="flex items-end justify-between space-x-1 h-40 mb-4">
              {chartData.transportCompanies.map((company, index) => (
                <div key={index} className="flex-1 flex flex-col items-center group/company min-w-0">
                  <div className="relative w-full max-w-[60px] mx-auto">
                    <div 
                      className="w-full rounded-t-xl transition-all duration-1000 ease-out group-hover/company:brightness-110 relative overflow-hidden flex items-center justify-center"
                      style={{
                        height: `${Math.max((company.value / Math.max(...chartData.transportCompanies.map(c => c.value))) * 120 + 20, 28)}px`,
                        background: DURI_PREMIUM_COLORS.gradients[index % DURI_PREMIUM_COLORS.gradients.length],
                        boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
                        minHeight: '28px'
                      }}
                    >
                      {/* Shine effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 opacity-0 group-hover/company:opacity-100 transition-opacity duration-500"></div>
                      
                      {/* Number in the center of the bar - WHITE */}
                      <div className="relative z-10 text-white font-bold text-sm">
                        {company.value}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-600 mt-2 font-medium text-center leading-tight break-words" title={company.fullName}>
                    {company.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 📋 GRÁFICO 4: ÓRGÃOS ANUENTES - Donut Chart Premium */}
        <div className="relative overflow-hidden bg-gradient-to-br from-white via-gray-50 to-orange-50/30 border border-gray-200/50 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-transparent group-hover:from-orange-500/10 transition-all"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">Órgãos Anuentes</h3>
                <p className="text-sm text-gray-600">{chartData.orgaosAnuentes.length} órgãos reguladores</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {chartData.orgaosAnuentes.slice(0, 4).map((orgao, index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-xl bg-white/60 backdrop-blur-sm border border-gray-100/50 hover:bg-white/80 transition-all group/orgao">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-3 h-3 rounded-full shadow-sm"
                      style={{
                        background: DURI_PREMIUM_COLORS.gradients[index % DURI_PREMIUM_COLORS.gradients.length]
                      }}
                    />
                    <span className="text-sm font-medium text-gray-700 truncate" title={orgao.fullName}>
                      {orgao.name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-bold text-gray-900">{orgao.value}</span>
                    <div className="relative w-12 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                        style={{
                          background: DURI_PREMIUM_COLORS.gradients[index % DURI_PREMIUM_COLORS.gradients.length],
                          width: `${orgao.percentage}%`
                        }}
                      />
                    </div>
                    <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full font-medium">
                      {orgao.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 📈 GRÁFICO 5: CRONOGRAMA ETD - Timeline Premium (Full Width) */}
      {chartData.etdTimeline.length > 0 && (
        <div className="relative overflow-hidden bg-gradient-to-br from-white via-gray-50 to-red-50/30 border border-gray-200/50 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group">
          <div className="absolute inset-0 bg-gradient-to-r from-[#b51c26]/5 to-transparent group-hover:from-[#b51c26]/10 transition-all"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">Cronograma ETD</h3>
                <p className="text-sm text-gray-600">Distribuição temporal das operações • {chartData.etdTimeline.length} meses</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-[#b51c26] to-[#dc2626] rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
            </div>
            
            <div className="flex items-end justify-between space-x-2 h-32 mb-4">
              {chartData.etdTimeline.map((item, index) => (
                <div key={index} className="flex-1 flex flex-col items-center group/timeline">
                  <div className="relative w-full">
                    <div 
                      className="w-full rounded-t-lg transition-all duration-1000 ease-out group-hover/timeline:brightness-110 relative overflow-hidden flex items-center justify-center"
                      style={{
                        height: `${Math.max((item.operacoes / Math.max(...chartData.etdTimeline.map(t => t.operacoes))) * 120, 28)}px`,
                        background: 'linear-gradient(180deg, #b51c26 0%, #dc2626 100%)',
                        boxShadow: '0 0 20px rgba(181, 28, 38, 0.3)',
                        minHeight: '28px'
                      }}
                    >
                      {/* Shine effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 opacity-0 group-hover/timeline:opacity-100 transition-opacity duration-500"></div>
                      
                      {/* Number in the center of the bar - WHITE */}
                      <div className="relative z-10 text-white font-bold text-sm">
                        {item.operacoes}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-600 mt-2 font-medium text-center">
                    {item.monthLabel}
                  </span>
                </div>
              ))}
            </div>
            
            <div className="flex items-center justify-center space-x-4 pt-4 border-t border-gray-100">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-[#b51c26] to-[#dc2626] shadow-sm"></div>
                <span className="text-xs text-gray-600">Operações programadas</span>
              </div>
              <div className="text-xs text-gray-500">
                Total: {chartData.etdTimeline.reduce((sum, item) => sum + item.operacoes, 0)} operações
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}