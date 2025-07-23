// components/DebugPanel.tsx - PAINEL DE DEBUG TEMPORÁRIO
'use client';

import { useState, useEffect } from 'react';
import { Bug, CheckCircle, XCircle, AlertTriangle, Copy } from 'lucide-react';

interface EnvStatus {
  url: {
    exists: boolean;
    valid: boolean;
    value: string;
  };
  serviceKey: {
    exists: boolean;
    valid: boolean;
    isJWT: boolean;
    length: number;
    preview: string;
  };
  serverSide: {
    urlExists: boolean;
    serviceKeyExists: boolean;
    error?: string;
  };
}

export function DebugPanel({ onClose }: { onClose: () => void }) {
  const [envStatus, setEnvStatus] = useState<EnvStatus | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    checkEnvironment();
  }, []);

  const checkEnvironment = async () => {
    // Client-side check
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const serviceKey = ''; // Service key não está disponível no client-side

    // Server-side check via API
    try {
      const response = await fetch('/api/debug/env-check');
      const serverData = await response.json();

      setEnvStatus({
        url: {
          exists: !!url,
          valid: url.length > 10 && !url.includes('your_'),
          value: url
        },
        serviceKey: {
          exists: false, // Não disponível no client
          valid: false,
          isJWT: false,
          length: 0,
          preview: 'Apenas server-side'
        },
        serverSide: serverData
      });
    } catch (error) {
      setEnvStatus({
        url: {
          exists: !!url,
          valid: url.length > 10 && !url.includes('your_'),
          value: url
        },
        serviceKey: {
          exists: false,
          valid: false,
          isJWT: false,
          length: 0,
          preview: 'Erro ao verificar'
        },
        serverSide: {
          urlExists: false,
          serviceKeyExists: false,
          error: 'Erro na verificação server-side'
        }
      });
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const { testAdminConnection } = await import('@/lib/supabase-admin');
      const result = await testAdminConnection();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Erro no teste'
      });
    } finally {
      setTesting(false);
    }
  };

  const copyEnvTemplate = () => {
    const template = `# Adicione estas variáveis no seu .env.local

# 1. URL do projeto Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co

# 2. Service Role Key (NÃO a anon key!)
SUPABASE_SERVICE_ROLE_KEY=eyJ...sua_service_role_key_completa_aqui

# 3. Outras configurações
NEXTAUTH_SECRET=sua-secret-key
NEXTAUTH_URL=http://localhost:3000`;

    navigator.clipboard.writeText(template);
    alert('Template copiado! Cole no seu .env.local');
  };

  if (!envStatus) {
    return (
      <div className="fixed top-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
        <div className="flex items-center space-x-2">
          <Bug className="w-5 h-5 text-blue-500 animate-spin" />
          <span>Verificando configuração...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold flex items-center space-x-2">
              <Bug className="w-6 h-6 text-blue-500" />
              <span>Debug de Configuração</span>
            </h3>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ×
            </button>
          </div>

          {/* Status das Variáveis */}
          <div className="space-y-4 mb-6">
            <h4 className="font-semibold text-gray-900">Variáveis de Ambiente</h4>
            
            {/* URL */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                {envStatus.url.valid ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <span className="font-medium">NEXT_PUBLIC_SUPABASE_URL</span>
              </div>
              <p className="text-sm text-gray-600 ml-7">
                {envStatus.url.exists ? envStatus.url.value : 'Não configurada'}
              </p>
            </div>

            {/* Service Key */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                {envStatus.serverSide.serviceKeyExists ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <span className="font-medium">SUPABASE_SERVICE_ROLE_KEY</span>
              </div>
              <p className="text-sm text-gray-600 ml-7">
                {envStatus.serverSide.serviceKeyExists ? 'Configurada (server-side)' : 'Não configurada'}
              </p>
              {envStatus.serverSide.error && (
                <p className="text-sm text-red-600 ml-7 mt-1">
                  Erro: {envStatus.serverSide.error}
                </p>
              )}
            </div>
          </div>

          {/* Ações */}
          <div className="space-y-3">
            <button
              onClick={copyEnvTemplate}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
            >
              <Copy className="w-4 h-4" />
              <span>Copiar Template .env.local</span>
            </button>

            <button
              onClick={testConnection}
              disabled={testing}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {testing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Testando...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Testar Conexão Admin</span>
                </>
              )}
            </button>

            {testResult && (
              <div className={`p-3 rounded-lg ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center space-x-2">
                  {testResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <span className={`font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {testResult.success ? 'Conexão OK!' : 'Falha na Conexão'}
                  </span>
                </div>
                {testResult.error && (
                  <p className="text-sm text-red-700 mt-1">{testResult.error}</p>
                )}
              </div>
            )}
          </div>

          {/* Instruções */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800">Passos para Correção:</p>
                <ol className="text-sm text-yellow-700 mt-1 ml-4 space-y-1">
                  <li>1. Acesse <a href="https://supabase.com/dashboard" target="_blank" className="underline">Supabase Dashboard</a></li>
                  <li>2. Selecione seu projeto</li>
                  <li>3. Vá em Settings → API</li>
                  <li>4. Copie a <strong>service_role</strong> key (não a anon key)</li>
                  <li>5. Adicione no .env.local</li>
                  <li>6. Reinicie: <code className="bg-yellow-200 px-1 rounded">npm run dev</code></li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}