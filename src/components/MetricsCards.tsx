// src/components/MetricsCards.tsx
interface Props {
  metrics: {
    totalOperations: number;
    activeOperations: number;
    completedOperations: number;
    recentUpdates: number;
  };
}

export function MetricsCards({ metrics }: Props) {
  const efficiency = metrics.totalOperations > 0 
    ? Math.round((metrics.completedOperations / metrics.totalOperations) * 100)
    : 0;

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-orange-100 text-sm">Total de Operações</p>
            <p className="text-3xl font-bold">{metrics.totalOperations}</p>
          </div>
          <div className="text-orange-200">📦</div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-orange-100 text-sm">Taxa de Efetividade</p>
            <p className="text-3xl font-bold">{efficiency}%</p>
          </div>
          <div className="text-orange-200">✓</div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-orange-100 text-sm">Operações Ativas</p>
            <p className="text-3xl font-bold">{metrics.activeOperations}</p>
          </div>
          <div className="text-orange-200">🚢</div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-orange-100 text-sm">Atualizações Recentes</p>
            <p className="text-3xl font-bold">{metrics.recentUpdates}</p>
          </div>
          <div className="text-orange-200">🔄</div>
        </div>
      </div>
    </div>
  );
}