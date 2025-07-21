// src/app/login/page.tsx - Fix sem chamadas para APIs antigas
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  validateUser, 
  setCurrentCompany, 
  getCurrentCompany, 
  companies,
  extractCompaniesFromTrackings, // ✅ Agora existe no auth.ts
  Company 
} from '@/lib/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [availableCompanies, setAvailableCompanies] = useState<Company[]>([]);
  const router = useRouter();

  useEffect(() => {
    checkExistingAuth();
    checkSystemStatus();
  }, []);

  const checkExistingAuth = () => {
    const currentCompany = getCurrentCompany();
    if (currentCompany) {
      console.log('✅ Usuário já autenticado:', currentCompany.name);
      router.push('/dashboard');
    }
  };

  const checkSystemStatus = async () => {
    try {
      console.log('🔍 Verificando status do sistema...');
      setSystemStatus('checking');

      // Testar conectividade da nova API unificada
      const unifiedResponse = await fetch('/api/asana/unified', {
        method: 'GET',
        cache: 'no-store',
        signal: AbortSignal.timeout(5000) // 5 segundos timeout
      });

      if (unifiedResponse.ok) {
        console.log('✅ API Unificada online');
        setSystemStatus('online');
        
        // Tentar extrair empresas dos dados reais
        try {
          const result = await unifiedResponse.json();
          if (result.success && result.data) {
            const extractedCompanies = extractCompaniesFromTrackings(result.data);
            setAvailableCompanies(extractedCompanies.length > 0 ? extractedCompanies : companies);
            console.log(`📊 ${extractedCompanies.length} empresas encontradas nos dados reais`);
          } else {
            // Usar empresas padrão se não conseguir extrair
            setAvailableCompanies(companies);
            console.log('⚠️ Usando empresas padrão');
          }
        } catch (parseError) {
          console.warn('⚠️ Erro ao processar dados, usando empresas padrão');
          setAvailableCompanies(companies);
        }
      } else {
        console.warn('⚠️ API Unificada offline, tentando fallback...');
        await tryFallbackApis();
      }
      
    } catch (error) {
      console.error('❌ Erro na verificação do sistema:', error);
      await tryFallbackApis();
    }
  };

  const tryFallbackApis = async () => {
    // Se a API unificada falhar, tentar APIs legacy (se ainda existirem)
    const fallbackApis = [
      '/api/asana/trackings',
      '/api/asana/enhanced-trackings'
    ];

    let foundWorkingApi = false;

    for (const api of fallbackApis) {
      try {
        console.log(`🔄 Tentando API legacy: ${api}`);
        const response = await fetch(api, { 
          cache: 'no-store',
          signal: AbortSignal.timeout(3000)
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            console.log(`✅ API legacy ${api} funcionando`);
            const extractedCompanies = extractCompaniesFromTrackings(result.data);
            setAvailableCompanies(extractedCompanies.length > 0 ? extractedCompanies : companies);
            setSystemStatus('online');
            foundWorkingApi = true;
            break;
          }
        }
      } catch (fallbackError) {
        console.log(`❌ API ${api} falhou:`, fallbackError.message);
        continue;
      }
    }

    if (!foundWorkingApi) {
      console.error('❌ Todas as APIs falharam');
      setSystemStatus('offline');
      setAvailableCompanies(companies); // Usar empresas padrão como último recurso
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('🔐 Tentando fazer login:', email);
      
      const company = validateUser(email, password);
      
      if (!company) {
        setError('Email ou senha inválidos');
        return;
      }

      console.log('✅ Login válido para:', company.name);
      
      // Verificar se a empresa existe nos dados reais (se sistema estiver online)
      if (systemStatus === 'online' && availableCompanies.length > 0) {
        const companyExists = availableCompanies.some(c => 
          c.name.toLowerCase() === company.name.toLowerCase()
        );
        
        if (!companyExists) {
          console.warn(`⚠️ Empresa ${company.name} não encontrada nos dados, permitindo acesso mesmo assim`);
        } else {
          console.log(`✅ Empresa ${company.name} confirmada nos dados reais`);
        }
      }

      setCurrentCompany(company);
      
      console.log('🚀 Redirecionando para dashboard...');
      router.push('/dashboard');
      
    } catch (err) {
      console.error('❌ Erro no login:', err);
      setError('Erro interno. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (companyName: string) => {
    const email = `${companyName.toLowerCase()}@duri.com.br`;
    setEmail(email);
    setPassword('duri123');
  };

  return (
    <div className="min-h-screen flex items-center justify-center" 
         style={{
           background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
         }}>
      
      <div className="bg-white p-8 rounded-lg shadow-2xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sistema de Tracking</h1>
          <p className="text-gray-600">Selecione sua empresa para acessar os processos</p>
        </div>

        {/* System Status */}
        <div className={`mb-6 p-3 rounded-lg text-sm ${
          systemStatus === 'online' ? 'bg-green-50 border border-green-200 text-green-800' :
          systemStatus === 'offline' ? 'bg-red-50 border border-red-200 text-red-800' :
          'bg-yellow-50 border border-yellow-200 text-yellow-800'
        }`}>
          <div className="flex items-center">
            <span className="mr-2">
              {systemStatus === 'online' ? '🟢' : 
               systemStatus === 'offline' ? '🔴' : 
               '🟡'}
            </span>
            <span>
              {systemStatus === 'online' ? 'Sistema Online' :
               systemStatus === 'offline' ? 'Sistema Offline (usando dados padrão)' :
               'Verificando sistema...'}
            </span>
          </div>
          
          {systemStatus === 'online' && availableCompanies.length > 0 && (
            <div className="mt-2 text-xs">
              {availableCompanies.length} empresas detectadas nos dados reais
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
            <strong>❌ Erro:</strong> {error}
            <button 
              onClick={() => setError('')}
              className="float-right text-red-600 hover:text-red-800 font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email da Empresa
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="empresa@duri.com.br"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Senha
            </label>
            <input
              type="password"
              id="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Digite sua senha"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 px-4 rounded-md font-medium ${
              loading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500'
            } text-white transition-colors`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Entrando...
              </span>
            ) : (
              'Entrar'
            )}
          </button>
        </form>

        {/* Quick Access */}
        <div className="mt-6">
          <div className="text-center text-sm text-gray-500 mb-3">Acesso Rápido:</div>
          <div className="grid grid-cols-2 gap-2">
            {companies.slice(0, 8).map((company) => (
              <button
                key={company.id}
                onClick={() => quickLogin(company.name)}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded transition-colors"
                disabled={loading}
              >
                {company.name}
              </button>
            ))}
          </div>
          <div className="text-center mt-3">
            <span className="text-xs text-gray-400">Senha padrão: duri123</span>
          </div>
        </div>

        {/* System Status Footer */}
        {systemStatus === 'offline' && (
          <div className="mt-6 text-center">
            <button
              onClick={checkSystemStatus}
              className="text-sm text-blue-600 hover:text-blue-700 underline"
              disabled={loading}
            >
              🔄 Tentar reconectar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}