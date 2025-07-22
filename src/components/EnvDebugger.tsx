// src/components/EnvDebugger.tsx - COMPONENT PARA DEBUG ENV VARS
'use client';

import { useState } from 'react';
import { Bug, Eye, EyeOff, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export function EnvDebugger() {
  const [showKeys, setShowKeys] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  // Verificar variáveis no browser (apenas as NEXT_PUBLIC_)
  const clientVars = {
    'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };

  const testServerVars = async () => {
    setTesting(true);
    try {
      const response = await fetch('/api/debug/env-check', {
        method: 'GET'
      });
      
      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        error: 'Erro ao verificar variáveis do servidor'
      });
    } finally {
      setTesting(false);
    }
  };

  const maskKey = (key: string | undefined) => {
    if (!key) return 'NÃO DEFINIDA';
    if (!showKeys) {
      return key.length > 20 ? `${key.substring(0, 8)}...${key.substring(key.length - 4)}` : '***';
    }
    return key;
  };

  const getStatus = (value: string | undefined) => {
    if (!value) return 'missing';
    if (value.includes('your_') || value === '') return 'invalid';
    return 'ok';
  };

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'ok': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'invalid': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default: return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Bug className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Debug Environment Variables</h3>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowKeys(!showKeys)}
            className="flex items-center space-x-1 px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
          >
            {showKeys ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>{showKeys ? 'Ocultar' : 'Mostrar'} Keys</span>
          </button>
          
          <button
            onClick={testServerVars}
            disabled={testing}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {testing ? 'Testando...' : 'Testar Server'}
          </button>
        </div>
      </div>

      {/* Client-side Variables */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-900 mb-3">Client-side Variables (Browser)</h4>
        <div className="space-y-2">
          {Object.entries(clientVars).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div className="flex items-center space-x-2">
                <StatusIcon status={getStatus(value)} />
                <span className="font-mono text-sm">{key}</span>
              </div>
              <span className="font-mono text-sm text-gray-600">
                {maskKey(value)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Server-side Test Results */}
      {testResult && (
        <div className="mb-4">
          <h4 className="font-medium text-gray-900 mb-3">Server-side Variables (API)</h4>
          
          {testResult.success ? (
            <div className="space-y-2">
              {Object.entries(testResult.variables || {}).map(([key, info]: [string, any]) => (
                <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center space-x-2">
                    <StatusIcon status={info.status} />
                    <span className="font-mono text-sm">{key}</span>
                  </div>
                  <span className="font-mono text-sm text-gray-600">
                    {showKeys ? info.preview : info.masked}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-red-800 text-sm">{testResult.error}</p>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded p-4">
        <h4 className="font-medium text-blue-900 mb-2">Instruções para Corrigir</h4>
        <ol className="text-blue-800 text-sm space-y-1">
          <li>1. Verifique se o arquivo <code className="bg-blue-100 px-1 rounded">.env.local</code> está na raiz do projeto</li>
          <li>2. Certifique-se de que a linha é: <code className="bg-blue-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY=sua_key_aqui</code></li>
          <li>3. Service Role Key deve começar com <code className="bg-blue-100 px-1 rounded">eyJ</code></li>
          <li>4. Execute: <code className="bg-blue-100 px-1 rounded">rm -rf .next && npm run dev</code></li>
          <li>5. Obtenha a key em: Settings → API → service_role (não anon!)</li>
        </ol>
      </div>
    </div>
  );
}