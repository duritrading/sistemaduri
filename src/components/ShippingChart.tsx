// src/components/ShippingChart.tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  vessels: Record<string, number>;
  responsibles: Record<string, number>;
}

export function ShippingChart({ vessels, responsibles }: Props) {
  const vesselData = Object.entries(vessels)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }));

  const responsibleData = Object.entries(responsibles)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }));

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🚢 Armadores/Navios</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={vesselData} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={100} fontSize={12} />
            <Tooltip />
            <Bar dataKey="value" fill="#f97316" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">👥 Responsáveis</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={responsibleData} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={100} fontSize={12} />
            <Tooltip />
            <Bar dataKey="value" fill="#ea580c" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}