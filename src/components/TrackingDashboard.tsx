// src/components/TrackingDashboard.tsx - Adicionar botão de voltar
interface Props {
  data: any;
}

export function TrackingDashboard({ data }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-blue-500">
      <div className="bg-gradient-to-r from-slate-700 to-slate-600 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-2">{data.title}</h1>
          <p className="text-lg opacity-90">
            🚢 Processo de Importação Marítima Internacional
          </p>
          <div className="mt-4">
            <a 
              href="/dashboard"
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
            >
              ← Voltar ao Dashboard
            </a>
          </div>
        </div>
      </div>

      {/* Rest of existing component... */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Existing content */}
      </div>
    </div>
  );
}