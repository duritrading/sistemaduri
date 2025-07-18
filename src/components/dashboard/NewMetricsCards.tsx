// src/components/dashboard/NewMetricsCards.tsx - Layout baseado na Imagem 2
'use client';

import { Package, TrendingUp, Ship, AlertTriangle, CheckCircle, Clock, Building2, FileText } from 'lucide-react';

interface NewMetricsCardsProps {
  metrics: any;
}

export function NewMetricsCards({ metrics }: NewMetricsCardsProps) {
  if (!metrics) {
    return (
      <div className="bg-white p-6 rounded-lg shadow border">
        <div className="text-center text-gray-500">Carregando métricas...</div>
      </div>
    );
  }

  // Calcular estatísticas adicionais
  const withDelays = Object.entries(metrics.statusDistribution || {})
    .filter(([status]) => status.includes('atraso') || status.includes('Atrasado'))
    .reduce((sum, [, count]) => sum + (count as number), 0);

  const embarquesThisMonth = Object.entries(metrics.etdTimeline || {})
    .filter(([month]) => month.includes('07/25'))
    .reduce((sum, [, count]) => sum + (count as number), 0);

  const operacoesANVISA = Object.entries(metrics.orgaosAnuentesDistribution || {})
    .filter(([orgao]) => orgao.includes('ANVISA'))
    .reduce((sum, [, count]) => sum + (count as number), 0);

  const armadoresDiferentes = Object.keys(metrics.armadorDistribution || {}).length;

  const terminalTECON = Object.entries(metrics.statusDistribution || {})
    .filter(([status]) => status !== 'Cancelado')
    .reduce((sum, [, count]) => sum + (count as number), 0);

  const maiorFornecedor = Object.entries(metrics.exporterDistribution || {})
    .sort(([,a], [,b]) => (b as number) - (a as number))[0];

  return (
    <div className="space-y-6">
      {/* Cards Principais - 5 cards na primeira linha */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <MetricCard
          value={metrics.totalOperations || 0}
          title="Total de Operações"
          icon={Package}
        />
        <MetricCard
          value={`${metrics.effectiveRate || 0}%`}
          title="Taxa de Efetividade"
          icon={CheckCircle}
        />
        <MetricCard
          value={metrics.totalContainers || 0}
          title="Total de Containers"
          icon={Package}
        />
        <MetricCard
          value={withDelays}
          title="Com Adiantamento"
          icon={AlertTriangle}
        />
        <MetricCard
          value={metrics.activeOperations || 0}
          title="Operações Ativas"
          icon={TrendingUp}
        />
      </div>

      {/* Card Menor - Embarques do mês */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="md:col-span-1">
          <MetricCard
            value={embarquesThisMonth}
            title="Embarques Jul/25"
            icon={Ship}
            size="small"
          />
        </div>
      </div>

      {/* Cards de Status - 5 cards em linha */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatusCard
          value={metrics.statusDistribution?.['A Embarcar'] || 0}
          title="A Embarcar"
          subtitle="Aguardando documentação e booking"
          color="orange"
        />
        <StatusCard
          value={metrics.statusDistribution?.['Em Trânsito'] || 0}
          title="Em Trânsito"
          subtitle="Cargas navegando para o Brasil"
          color="orange"
        />
        <StatusCard
          value={metrics.statusDistribution?.['No Porto'] || 0}
          title="No Porto"
          subtitle="Aguardando desembaraço"
          color="gray"
        />
        <StatusCard
          value={metrics.statusDistribution?.['Em Fechamento'] || 0}
          title="Em Fechamento"
          subtitle="Finalizando documentação"
          color="gray"
        />
        <StatusCard
          value={metrics.statusDistribution?.['Cancelado'] || 0}
          title="Cancelado"
          subtitle="Processo cancelado"
          color="red"
        />
      </div>

      {/* Resumo Operacional - 4 cards */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Resumo Operacional</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard
            value={operacoesANVISA}
            title="Operações ANVISA"
            color="orange"
          />
          <SummaryCard
            value={armadoresDiferentes}
            title="Armadores Diferentes"
            color="orange"
          />
          <SummaryCard
            value="100%"
            title="Terminal TECON"
            color="orange"
          />
          <SummaryCard
            value={maiorFornecedor?.[1] || 0}
            title={`Maior Fornecedor (${maiorFornecedor?.[0]?.split(' ')[0] || 'N/A'})`}
            color="orange"
          />
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  value: string | number;
  title: string;
  icon: React.ComponentType<any>;
  size?: 'normal' | 'small';
}

function MetricCard({ value, title, icon: Icon, size = 'normal' }: MetricCardProps) {
  const cardSize = size === 'small' ? 'p-4' : 'p-6';
  const valueSize = size === 'small' ? 'text-2xl' : 'text-3xl';

  return (
    <div className={`bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg ${cardSize} shadow-lg`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-orange-100 text-sm font-medium mb-1">{title}</div>
          <div className={`${valueSize} font-bold`}>{value}</div>
        </div>
        <Icon className="h-6 w-6 text-orange-200" />
      </div>
    </div>
  );
}

interface StatusCardProps {
  value: number;
  title: string;
  subtitle: string;
  color: 'orange' | 'gray' | 'red';
}

function StatusCard({ value, title, subtitle, color }: StatusCardProps) {
  const colorClasses = {
    orange: 'border-l-orange-500 bg-orange-50',
    gray: 'border-l-gray-500 bg-gray-50',
    red: 'border-l-red-500 bg-red-50'
  };

  const valueColorClasses = {
    orange: 'text-orange-600',
    gray: 'text-gray-600',
    red: 'text-red-600'
  };

  return (
    <div className={`bg-white p-4 rounded-lg shadow border-l-4 ${colorClasses[color]}`}>
      <div className={`text-3xl font-bold ${valueColorClasses[color]} mb-1`}>
        {value}
      </div>
      <div className="text-sm font-medium text-gray-900 mb-1">
        {title}
      </div>
      <div className="text-xs text-gray-600">
        {subtitle}
      </div>
    </div>
  );
}

interface SummaryCardProps {
  value: string | number;
  title: string;
  color: 'orange';
}

function SummaryCard({ value, title, color }: SummaryCardProps) {
  return (
    <div className="bg-gray-100 p-4 rounded-lg text-center">
      <div className="text-2xl font-bold text-orange-600 mb-1">
        {value}
      </div>
      <div className="text-sm text-gray-700">
        {title}
      </div>
    </div>
  );
}