// src/components/dashboard/MetricsCards.tsx
'use client';

import { Package, TrendingUp, Activity, RefreshCw } from 'lucide-react';

interface MetricsCardsProps {
  metrics: {
    totalOperations: number;
    activeOperations: number;
    completedOperations: number;
    recentUpdates: number;
    effectiveRate: number;
  };
}

export function MetricsCards({ metrics }: MetricsCardsProps) {
  const cards = [
    {
      title: 'Total de Operações',
      value: metrics.totalOperations,
      icon: Package,
      color: 'from-orange-500 to-orange-600'
    },
    {
      title: 'Taxa de Efetividade',
      value: `${metrics.effectiveRate}%`,
      icon: TrendingUp,
      color: 'from-orange-500 to-orange-600'
    },
    {
      title: 'Operações Ativas',
      value: metrics.activeOperations,
      icon: Activity,
      color: 'from-orange-500 to-orange-600'
    },
    {
      title: 'Atualizações Recentes',
      value: metrics.recentUpdates,
      icon: RefreshCw,
      color: 'from-orange-500 to-orange-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div key={index} className={`bg-gradient-to-r ${card.color} rounded-lg p-6 text-white`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">{card.title}</p>
                <p className="text-3xl font-bold">{card.value}</p>
              </div>
              <Icon className="h-8 w-8 text-orange-200" />
            </div>
          </div>
        );
      })}
    </div>
  );
}