// src/app/admin/users/page.tsx - COM API CORRIGIDA E TRATAMENTO DE ERROS
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { 
  Users, 
  UserPlus, 
  Mail, 
  Lock, 
  Building2, 
  User, 
  Shield, 
  Loader2, 
  AlertCircle, 
  CheckCircle,
  Eye,
  EyeOff,
  ArrowLeft,
  Copy,
  Trash2,
  RefreshCw,
  Database,
  Zap,
  Bug
} from 'lucide-react';

interface Company {
  id: string;
  name: string;
  display_name: string;
  slug: string;
  active: boolean;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  active: boolean;
  company_id: string;
  created_at: string;
  companies?: Company;
}

interface SyncStatus {
  companiesInDatabase: number;
  companiesInAsana: number;
  needsSync: boolean;
  companies: Company[];
}

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');

  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    companyId: '',
    role: 'viewer' as 'admin' | 'manager' | 'operator' | 'viewer'
  });

  const { user, profile, supabaseConfigured } = useAuth();
  const router = useRouter();

  // ✅ VERIFICAR PERMISSÕES DE ADMIN
  useEffect(() => {
    if (!user || !profile) {
      router.push('/login');
      return;
    }

    if (profile.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    if (!supabaseConfigured) {
      setError('Configure as variáveis de ambiente primeiro.');
      setLoading(false);
      return;
    }

    loadData();
  }, [user, profile, supabaseConfigured, router]);

  // ✅ CARREGAR DADOS
  const loadData = async () => {
    try {
      setLoading(true);
      setDebugInfo('🔄 Carregando dados...');
      
      const { supabase } = await import('@/lib/supabase');
      
      // Carregar empresas do banco
      setDebugInfo('📊 Buscando empresas no banco...');
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .eq('active', true)
        .order('display_name');

      if (companiesError) {
        setDebugInfo(`❌ Erro ao buscar empresas: ${companiesError.message}`);
        throw companiesError;
      }
      
      setCompanies(companiesData || []);
      setDebugInfo(`✅ Encontradas ${companiesData?.length || 0} empresas no banco`);
      
      if (companiesData && companiesData.length > 0 && !form.companyId) {
        setForm(prev => ({ ...prev, companyId: companiesData[0].id }));
      }

      // Carregar usuários existentes
      setDebugInfo('👥 Buscando usuários...');
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select(`
          *,
          companies (
            id,
            name,
            display_name,
            slug,
            active
          )
        `)
        .order('created_at', { ascending: false });

      if (usersError) {
        setDebugInfo(`❌ Erro ao buscar usuários: ${usersError.message}`);
        throw usersError;
      }
      
      setUsers(usersData || []);
      setDebugInfo(`✅ Encontrados ${usersData?.length || 0} usuários`);

      // Verificar status de sincronização
      await checkSyncStatus();
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao carregar dados';
      setError(errorMsg);
      setDebugInfo(`❌ Erro final: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // ✅ VERIFICAR STATUS DE SINCRONIZAÇÃO COM DEBUGGING
  const checkSyncStatus = async () => {
    try {
      setDebugInfo('🔍 Verificando status de sincronização...');
      
      const response = await fetch('/api/sync-companies', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      setDebugInfo(`📡 Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
      
      const status = await response.json();
      setSyncStatus(status);
      setDebugInfo(`✅ Status: ${status.companiesInDatabase} no banco, ${status.companiesInAsana} no Asana`);
      
    } catch (error) {
      console.error('Erro ao verificar status de sincronização:', error);
      setDebugInfo(`❌ Erro no status: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  // ✅ SINCRONIZAR EMPRESAS - VERSÃO BULLETPROOF
  const handleSyncCompanies = async () => {
    // Prevenir cliques múltiplos
    if (syncing) {
      console.log('⚠️ Sincronização já em andamento...');
      return;
    }

    setSyncing(true);
    setError('');
    setSuccess('');
    setDebugInfo('🔄 Iniciando sincronização...');

    try {
      console.log('🔄 [FRONTEND] Chamando API de sincronização...');

      // ✅ TIMEOUT DE 30 SEGUNDOS
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log('⏰ Timeout na sincronização');
      }, 30000);

      const response = await fetch('/api/sync-companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log(`📡 [FRONTEND] Response: ${response.status} ${response.statusText}`);
      setDebugInfo(`📡 Response: ${response.status} ${response.statusText}`);

      // ✅ TRATAR DIFERENTES STATUS DE ERRO
      if (!response.ok) {
        let errorDetails = `Status ${response.status}: ${response.statusText}`;
        
        try {
          const errorText = await response.text();
          console.log('❌ [FRONTEND] Erro detalhado:', errorText);
          
          // Tentar extrair mensagem de erro mais específica
          try {
            const errorJson = JSON.parse(errorText);
            errorDetails = errorJson.details || errorJson.error || errorDetails;
          } catch {
            // Se não for JSON, usar texto como está
            if (errorText && errorText.length < 300) {
              errorDetails = errorText;
            }
          }
        } catch (parseError) {
          console.error('❌ [FRONTEND] Erro ao ler resposta:', parseError);
        }
        
        setDebugInfo(`❌ Erro da API: ${errorDetails}`);
        throw new Error(`Erro ${response.status}: ${errorDetails}`);
      }

      // ✅ PROCESSAR RESPOSTA DE SUCESSO
      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        console.error('❌ [FRONTEND] Erro ao fazer parse do JSON:', jsonError);
        throw new Error('Resposta da API inválida');
      }
      
      console.log('📊 [FRONTEND] Resultado da sincronização:', result);
      setDebugInfo(`📊 Resultado: ${JSON.stringify(result.stats || {}, null, 2)}`);

      // ✅ VERIFICAR SE A SINCRONIZAÇÃO FOI BEM-SUCEDIDA
      if (!result.success) {
        const errorMsg = result.error || result.details || 'Erro desconhecido na sincronização';
        setDebugInfo(`❌ API retornou erro: ${errorMsg}`);
        throw new Error(errorMsg);
      }

      // ✅ MOSTRAR RESULTADO DE SUCESSO
      const stats = result.stats || { totalProcessed: 0, created: 0, updated: 0, errors: 0 };
      
      setSuccess(`✅ ${result.message || 'Sincronização concluída!'}

📊 Estatísticas:
• Total processadas: ${stats.totalProcessed}
• Criadas: ${stats.created}
• Atualizadas: ${stats.updated}
• Erros: ${stats.errors}

As empresas foram sincronizadas com sucesso!`);

      setDebugInfo('✅ Sincronização concluída com sucesso');

      // ✅ RECARREGAR DADOS
      console.log('🔄 [FRONTEND] Recarregando dados...');
      await loadData();

    } catch (err) {
      console.error('❌ [FRONTEND] Erro na sincronização:', err);
      
      let errorMessage = 'Erro desconhecido na sincronização';
      
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          errorMessage = 'Sincronização cancelada por timeout (30s). A API pode estar lenta, tente novamente.';
        } else if (err.message.includes('Failed to fetch')) {
          errorMessage = 'Erro de conexão com a API. Verifique sua internet e tente novamente.';
        } else if (err.message.includes('NetworkError')) {
          errorMessage = 'Erro de rede. Tente novamente em alguns minutos.';
        } else if (err.message.includes('500')) {
          errorMessage = 'Erro interno do servidor. Verifique se as variáveis de ambiente estão configuradas no Vercel.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(`❌ Erro na sincronização: ${errorMessage}`);
      setDebugInfo(`❌ Erro final: ${errorMessage}`);
      
      // ✅ SUGESTÕES DE SOLUÇÃO
      if (errorMessage.includes('500') || errorMessage.includes('servidor')) {
        setError(`❌ Erro na sincronização: ${errorMessage}

🔧 Possíveis soluções:
• Verifique se NEXT_PUBLIC_SUPABASE_URL está configurada no Vercel
• Verifique se SUPABASE_SERVICE_ROLE_KEY está configurada no Vercel  
• Confirme se a tabela 'companies' existe no Supabase
• Tente novamente em alguns minutos`);
      }
      
    } finally {
      setSyncing(false);
    }
  };

  // ✅ CRIAR USUÁRIO
  // Função handleCreateUser corrigida para usar API route
// Substitua apenas esta função no arquivo src/app/admin/users/page.tsx

// ✅ CRIAR USUÁRIO VIA API ROUTE (SERVER-SIDE)
const handleCreateUser = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  setSuccess('');
  setCreating(true);

  try {
    console.log('🔄 [FRONTEND] Iniciando criação de usuário...');

    // Validações no frontend
    if (!form.email || !form.password || !form.fullName || !form.companyId) {
      throw new Error('Todos os campos são obrigatórios');
    }
    if (form.password !== form.confirmPassword) {
      throw new Error('Senhas não coincidem');
    }
    if (form.password.length < 6) {
      throw new Error('Senha deve ter pelo menos 6 caracteres');
    }

    // Verificar se empresa existe
    const company = companies.find(c => c.id === form.companyId);
    if (!company) {
      throw new Error('Empresa não encontrada');
    }

    console.log('📝 [FRONTEND] Enviando dados para API...');

    // Chamar API route (server-side)
    const response = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        companyId: form.companyId,
        role: form.role
      })
    });

    console.log('📡 [FRONTEND] Resposta da API:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Erro ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Erro ao criar usuário');
    }

    console.log('✅ [FRONTEND] Usuário criado com sucesso:', result.user?.email);

    setSuccess(`✅ Usuário criado com sucesso!

📧 Email: ${form.email}
🏢 Empresa: ${company.display_name}
👤 Papel: ${form.role}
🔑 Senha: ${form.password}

O usuário já pode fazer login no sistema.`);

    // Reset form
    setForm({
      email: '',
      password: '',
      confirmPassword: '',
      fullName: '',
      companyId: companies[0]?.id || '',
      role: 'viewer'
    });
    
    // Recarregar lista de usuários
    await loadData();
    
  } catch (err) {
    console.error('❌ [FRONTEND] Erro na criação:', err);
    setError(err instanceof Error ? err.message : 'Erro ao criar usuário');
  } finally {
    setCreating(false);
  }
};

  // ✅ LOADING
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando administração...</p>
          {debugInfo && (
            <p className="text-sm text-gray-500 mt-2">{debugInfo}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ✅ HEADER */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft size={20} />
                <span>Voltar ao Dashboard</span>
              </button>
              
              <div className="bg-blue-100 p-2 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestão de Usuários</h1>
                <p className="text-gray-600">
                  Criar e gerenciar usuários do sistema • {companies.length} empresas disponíveis
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Status de Sincronização */}
              {syncStatus && (
                <div className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  syncStatus.needsSync 
                    ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                    : 'bg-green-100 text-green-800 border border-green-200'
                }`}>
                  <div className="flex items-center space-x-2">
                    <Database size={16} />
                    <span>
                      {syncStatus.companiesInDatabase} de {syncStatus.companiesInAsana} empresas
                    </span>
                  </div>
                </div>
              )}

              {/* Botão de Sincronização */}
              <button
                onClick={handleSyncCompanies}
                disabled={syncing}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center space-x-2 disabled:opacity-50"
              >
                {syncing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Sincronizando...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} />
                    <span>Sincronizar Empresas</span>
                  </>
                )}
              </button>
              
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <UserPlus size={20} />
                <span>Novo Usuário</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* ✅ DEBUG INFO EM DEV */}
        {process.env.NODE_ENV === 'development' && debugInfo && (
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <Bug size={20} className="text-gray-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-gray-800 font-medium text-sm">Debug Info</p>
                <p className="text-gray-700 text-xs mt-1 font-mono">{debugInfo}</p>
              </div>
            </div>
          </div>
        )}

        {/* ✅ ALERTA DE SINCRONIZAÇÃO */}
        {syncStatus?.needsSync && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start space-x-3">
            <Zap size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-amber-800 font-medium">Sincronização Necessária</p>
              <p className="text-amber-700 text-sm mt-1">
                Você tem {syncStatus.companiesInAsana} empresas no Asana, mas apenas {syncStatus.companiesInDatabase} no banco. 
                Clique em "Sincronizar Empresas" para importar todas as empresas do Asana.
              </p>
            </div>
          </div>
        )}

        {/* ✅ MENSAGENS */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
            <AlertCircle size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-red-800 font-medium">Erro</p>
              <pre className="text-red-700 text-sm mt-1 whitespace-pre-line">{error}</pre>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-3">
            <CheckCircle size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-green-800 font-medium">Sucesso</p>
              <pre className="text-green-700 text-sm mt-1 whitespace-pre-line font-mono">{success}</pre>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* ✅ FORMULÁRIO DE CRIAÇÃO */}
          {showCreateForm && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-xl font-bold mb-6 flex items-center space-x-2">
                  <UserPlus size={20} />
                  <span>Criar Novo Usuário</span>
                </h2>

                <form onSubmit={handleCreateUser} className="space-y-4">
                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="cliente@empresa.com"
                        required
                        disabled={creating}
                      />
                    </div>
                  </div>

                  {/* Nome Completo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nome Completo</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={form.fullName}
                        onChange={(e) => setForm(prev => ({ ...prev, fullName: e.target.value }))}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Nome do Cliente"
                        required
                        disabled={creating}
                      />
                    </div>
                  </div>

                  {/* Empresa */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Empresa ({companies.length} disponíveis)
                    </label>
                    <div className="relative">
                      <Building2 size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <select
                        value={form.companyId}
                        onChange={(e) => setForm(prev => ({ ...prev, companyId: e.target.value }))}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                        disabled={creating}
                      >
                        <option value="">Selecione uma empresa</option>
                        {companies.map(company => (
                          <option key={company.id} value={company.id}>
                            {company.display_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Papel */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Papel no Sistema</label>
                    <div className="relative">
                      <Shield size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <select
                        value={form.role}
                        onChange={(e) => setForm(prev => ({ ...prev, role: e.target.value as any }))}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={creating}
                      >
                        <option value="viewer">Visualizador (apenas leitura)</option>
                        <option value="operator">Operador (pode editar)</option>
                        <option value="manager">Gerente (controle total da empresa)</option>
                        <option value="admin">Administrador (controle total do sistema)</option>
                      </select>
                    </div>
                  </div>

                  {/* Senha */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Senha</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Mínimo 6 caracteres"
                        required
                        minLength={6}
                        disabled={creating}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                        disabled={creating}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirmar Senha */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Confirmar Senha</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={form.confirmPassword}
                        onChange={(e) => setForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Repita a senha"
                        required
                        disabled={creating}
                      />
                    </div>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={creating || companies.length === 0}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {creating ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Criando...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus size={16} />
                        <span>Criar Usuário</span>
                      </>
                    )}
                  </button>

                  {companies.length === 0 && (
                    <div className="text-center p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-amber-800 text-sm">
                        Nenhuma empresa disponível. Clique em "Sincronizar Empresas" primeiro.
                      </p>
                    </div>
                  )}
                </form>
              </div>
            </div>
          )}

          {/* ✅ LISTA DE USUÁRIOS */}
          <div className={showCreateForm ? "lg:col-span-2" : "lg:col-span-3"}>
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold">Usuários Cadastrados ({users.length})</h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usuário
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Empresa
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Papel
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Criado em
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.full_name || 'Nome não informado'}
                            </div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(user as any).companies?.display_name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.role === 'admin' ? 'bg-red-100 text-red-800' :
                            user.role === 'manager' ? 'bg-purple-100 text-purple-800' :
                            user.role === 'operator' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.active ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleDateString('pt-BR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {users.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Nenhum usuário cadastrado ainda</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}