// src/components/AsanaDebugger.tsx - Componente para diagnosticar problemas do Asana
'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle, RefreshCw, Bug, Database, Users } from 'lucide-react';

export function AsanaDebugger() {
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);
  const [robustResult, setRobustResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'diagnostic' | 'robust'>('diagnostic');

  const runDiagnostic = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/asana/diagnostic');
      const result = await response.json();
      setDiagnosticResult(result);
    } catch (error) {
      setDiagnosticResult({
        success: false,
        error: 'Erro ao executar diagnóstico',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  const testRobustAPI = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/asana/robust');
      const result = await response.json();
      setRobustResult(result);
    } catch (error) {
      setRobustResult({
        success: false,
        error: 'Erro ao testar API robusta',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow border p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
          <Bug className="mr-2 text-red-500" />
          Diagnóstico de Integração Asana
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('diagnostic')}
            className={`px-3 py-1 rounded text-sm ${
              activeTab === 'diagnostic' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Diagnóstico
          </button>
          <button
            onClick={() => setActiveTab('robust')}
            className={`px-3 py-1 rounded text-sm ${
              activeTab === 'robust' 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            API Robusta
          </button>
        </div>
      </div>

      {activeTab === 'diagnostic' && (
        <div className="space-y-4">
          <button
            onClick={runDiagnostic}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Executar Diagnóstico Completo</span>
          </button>

          {diagnosticResult && (
            <DiagnosticResults result={diagnosticResult} />
          )}
        </div>
      )}

      {activeTab === 'robust' && (
        <div className="space-y-4">
          <button
            onClick={testRobustAPI}
            disabled={loading}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded flex items-center space-x-2"
          >
            <Database className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Testar API Robusta</span>
          </button>

          {robustResult && (
            <RobustResults result={robustResult} />
          )}
        </div>
      )}
    </div>
  );
}

function DiagnosticResults({ result }: { result: any }) {
  if (!result.success) {
    return (
      <div className="bg-red-50 border border-red-200 rounded p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <span className="font-medium text-red-800">Erro no Diagnóstico</span>
        </div>
        <p className="text-red-700 mt-2">{result.error}</p>
        <p className="text-red-600 text-sm mt-1">{result.details}</p>
      </div>
    );
  }

  const { data } = result;

  return (
    <div className="space-y-4">
      {/* Status Geral */}
      <div className="bg-green-50 border border-green-200 rounded p-4">
        <div className="flex items-center">
          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
          <span className="font-medium text-green-800">Diagnóstico Completo</span>
        </div>
      </div>

      {/* Autenticação */}
      <div className="bg-gray-50 rounded p-4">
        <h3 className="font-medium text-gray-900 mb-2">🔐 Autenticação</h3>
        <p><strong>Status:</strong> {data.authentication.status}</p>
        <p><strong>Usuário:</strong> {data.authentication.user}</p>
        <p><strong>Email:</strong> {data.authentication.email}</p>
      </div>

      {/* Workspace e Projeto */}
      <div className="bg-gray-50 rounded p-4">
        <h3 className="font-medium text-gray-900 mb-2">📁 Workspace & Projeto</h3>
        <p><strong>Workspace:</strong> {data.workspace.name}</p>
        <p><strong>Projeto:</strong> {data.project.name}</p>
        <p><strong>Total de Tasks:</strong> {data.tasks.total}</p>
      </div>

      {/* Custom Fields */}
      <div className="bg-gray-50 rounded p-4">
        <h3 className="font-medium text-gray-900 mb-2">🏷️ Custom Fields</h3>
        <p><strong>Total Únicos:</strong> {data.customFields.totalUnique}</p>
        <div className="mt-2">
          <p className="text-sm text-gray-600 mb-1"><strong>Campos Encontrados:</strong></p>
          <div className="flex flex-wrap gap-1">
            {data.customFields.names.map((name: string, index: number) => (
              <span key={index} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Presença de Campos Importantes */}
      <div className="bg-gray-50 rounded p-4">
        <h3 className="font-medium text-gray-900 mb-2">📊 Presença de Campos Importantes</h3>
        <div className="space-y-2">
          {data.customFields.importantFieldsPresence.map((field: any, index: number) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-sm">{field.fieldName}</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">{field.presentInTasks} tasks</span>
                <span className={`text-sm px-2 py-1 rounded ${
                  field.percentage > 80 ? 'bg-green-100 text-green-800' :
                  field.percentage > 50 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {field.percentage}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Empresas Identificadas */}
      <div className="bg-gray-50 rounded p-4">
        <h3 className="font-medium text-gray-900 mb-2">🏢 Empresas Identificadas</h3>
        <p><strong>Total:</strong> {data.companies.identified}</p>
        <div className="mt-2 space-y-1">
          {Object.entries(data.companies.distribution).map(([company, count]) => (
            <div key={company} className="flex justify-between text-sm">
              <span>{company}</span>
              <span className="text-gray-600">{count as number} tasks</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recomendações */}
      <div className="bg-blue-50 border border-blue-200 rounded p-4">
        <h3 className="font-medium text-blue-900 mb-2">💡 Recomendações</h3>
        <ul className="space-y-1">
          {data.recommendations.map((rec: string, index: number) => (
            <li key={index} className="text-sm text-blue-800">{rec}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function RobustResults({ result }: { result: any }) {
  if (!result.success) {
    return (
      <div className="bg-red-50 border border-red-200 rounded p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <span className="font-medium text-red-800">Erro na API Robusta</span>
        </div>
        <p className="text-red-700 mt-2">{result.error}</p>
      </div>
    );
  }

  const { data, metrics, meta } = result;

  return (
    <div className="space-y-4">
      {/* Status Geral */}
      <div className="bg-green-50 border border-green-200 rounded p-4">
        <div className="flex items-center">
          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
          <span className="font-medium text-green-800">API Robusta Funcionando</span>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-50 rounded p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{data.length}</div>
          <div className="text-sm text-gray-600">Trackings</div>
        </div>
        <div className="bg-gray-50 rounded p-3 text-center">
          <div className="text-2xl font-bold text-green-600">{metrics.uniqueExporters}</div>
          <div className="text-sm text-gray-600">Exportadores</div>
        </div>
        <div className="bg-gray-50 rounded p-3 text-center">
          <div className="text-2xl font-bold text-orange-600">{metrics.uniqueShippingLines}</div>
          <div className="text-sm text-gray-600">Linhas Marítimas</div>
        </div>
        <div className="bg-gray-50 rounded p-3 text-center">
          <div className="text-2xl font-bold text-purple-600">{metrics.totalContainers}</div>
          <div className="text-sm text-gray-600">Containers</div>
        </div>
      </div>

      {/* Sample Data */}
      <div className="bg-gray-50 rounded p-4">
        <h3 className="font-medium text-gray-900 mb-2">📋 Amostra de Dados</h3>
        <div className="space-y-2">
          {data.slice(0, 3).map((tracking: any, index: number) => (
            <div key={index} className="text-sm border-l-4 border-blue-500 pl-3">
              <p><strong>{tracking.title}</strong></p>
              <p>Empresa: {tracking.company}</p>
              <p>Exportador: {tracking.transport.exporter || 'N/A'}</p>
              <p>Status: {tracking.status}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Meta Info */}
      <div className="bg-gray-50 rounded p-4">
        <h3 className="font-medium text-gray-900 mb-2">ℹ️ Informações Técnicas</h3>
        <p><strong>Projeto:</strong> {meta.project}</p>
        <p><strong>Tasks Originais:</strong> {meta.totalTasks}</p>
        <p><strong>Trackings Processados:</strong> {meta.processedTrackings}</p>
        <p><strong>Última Sincronização:</strong> {new Date(meta.lastSync).toLocaleString('pt-BR')}</p>
        <p><strong>Versão da API:</strong> {meta.apiVersion}</p>
      </div>
    </div>
  );
}