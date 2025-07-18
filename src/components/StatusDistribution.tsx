// src/components/StatusDistribution.tsx
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface Props {
  data: Record<string, number>;
}

const COLORS = ['#f97316', '#ea580c', '#9a3412', '#451a03', '#292524'];

export function StatusDistribution({ data }: Props) {
  const chartData = Object.entries(data).map(([name, value]) => ({
    name,
    value,
    percentage: Math.round((value / Object.values(data).reduce((a, b) => a + b, 0)) * 100)
  }));

  return (
    <div className="bg-white p-6 rounded-lg shadow border">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Distribuição por Status</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={120}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => [value, 'Operações']} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      
      <div className="mt-4 space-y-2">
        {chartData.map((item, index) => (
          <div key={item.name} className="flex justify-between items-center text-sm">
            <div className="flex items-center">
              <div 
                className="w-3 h-3 rounded-full mr-2" 
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span>{item.name}</span>
            </div>
            <span className="font-medium">{item.value} ({item.percentage}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}