// src/app/admin/users/page.tsx - CORREÇÃO FINAL DOS PROBLEMAS ESPECÍFICOS
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation'; // ✅ ADICIONADO usePathname
import { useAuth } from '@/hooks/useAuth';
import { 
  Users, ArrowLeft, UserPlus, RefreshCw, Loader2, 
  Database, Zap, Bug, CheckCircle, XCircle, 
  Edit2, Trash2, Eye, EyeOff, AlertTriangle 
} from 'lucide-react';

// ✅ INTERFACES
interface Company {
  id: string;
  name: string;
  display_name: string;
  slug: string;
  active: boolean;
}

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'manager' | 'operator' | 'viewer';
  active: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
  company_id: string;
  companies?: Company;
}

interface SyncStatus {
  success: boolean;
  companiesInDatabase: number;
  companiesInAsana: string;
  needsSync: boolean;
  asanaConfigured: boolean;
  companies: Company[];
}

interface SyncResult {
  success: boolean;
  message: string;
  stats: {
    totalProcessed: number;
    created: number;
    updated: number;
    errors: number;
  };
  errorDetails?: string[];
  skippedTasks?: string[];
}

export default function UsersAdminPage() {
  // ✅ STATES
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showSyncDetails, setShowSyncDetails] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  // ✅ STATES PARA EDIÇÃO/EXCLUSÃO
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // ✅ FORM STATES
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    companyId: '',
    role: 'viewer' as 'admin' | 'manager' | 'operator' | 'viewer'
  });

  const [editForm, setEditForm] = useState({
    email: '',
    fullName: '',
    companyId: '',
    role: 'viewer' as 'admin' | 'manager' | 'operator' | 'viewer',
    active: true
  });

  // ✅ REFS PARA CONTROLE DE LOOPS
  const isLoadingDataRef = useRef(false);
  const hasLoadedInitialDataRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { user, profile } = useAuth();
  const router = useRouter();
  const pathname = usePathname(); // ✅ ADICIONADO para detectar mudanças de rota

  // ✅ RESETAR REF QUANDO SAIR DA PÁGINA - NOVO USEEFFECT
  useEffect(() => {
    // Se não estiver na página admin/users, resetar a flag
    if (!pathname?.includes('/admin/users')) {
      hasLoadedInitialDataRef.current = false;
      console.log('🔄 Usuário saiu da página admin/users - resetando flag');
    }
  }, [pathname]);

  // ✅ VERIFICAR PERMISSÕES
  useEffect(() => {
    const userId = user?.id;
    const userRole = profile?.role;

    if (!userId || !userRole) {
      router.push('/login');
      return;
    }

    if (userRole !== 'admin') {
      router.push('/dashboard');
      return;
    }

    // ✅ CARREGAR DADOS APENAS UMA VEZ OU APÓS ERRO
    if (!hasLoadedInitialDataRef.current) {
      hasLoadedInitialDataRef.current = true;
      loadData();
    }
  }, [user?.id, profile?.role, router]);

  // ✅ CLEANUP AO DESMONTAR - MELHORADO
  useEffect(() => {
    return () => {
      console.log('🧹 Componente sendo desmontado - limpando refs');
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // ✅ RESETAR REF AO DESMONTAR
      hasLoadedInitialDataRef.current = false;
      isLoadingDataRef.current = false;
    };
  }, []);

  // ✅ LOAD DATA COM PROTEÇÃO ANTI-LOOP - MELHORADO COM ERROR HANDLING
  const loadData = useCallback(async () => {
    // ✅ PREVENIR MÚLTIPLAS EXECUÇÕES SIMULTÂNEAS
    if (isLoadingDataRef.current) {
      console.log('⏭️ loadData já em execução, ignorando...');
      return;
    }

    isLoadingDataRef.current = true;

    // ✅ ABORTAR REQUEST ANTERIOR SE EXISTIR
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // ✅ CRIAR NOVO CONTROLLER
    abortControllerRef.current = new AbortController();
    const controller = abortControllerRef.current;
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      setLoading(true);
      setError(null);
      setDebugInfo('🔄 Carregando dados...');
      
      const { supabase } = await import('@/lib/supabase');
      
      // ✅ CARREGAR EMPRESAS COM TIMEOUT
      setDebugInfo('📊 Buscando empresas...');
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .eq('active', true)
        .order('display_name')
        .abortSignal(controller.signal);

      if (companiesError) {
        setDebugInfo(`❌ Erro ao buscar empresas: ${companiesError.message}`);
        throw companiesError;
      }
      
      setCompanies(companiesData || []);
      setDebugInfo(`✅ ${companiesData?.length || 0} empresas encontradas`);
      
      if (companiesData && companiesData.length > 0 && !form.companyId) {
        setForm(prev => ({ ...prev, companyId: companiesData[0].id }));
      }

      // ✅ CARREGAR USUÁRIOS COM TIMEOUT
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
        .order('created_at', { ascending: false })
        .abortSignal(controller.signal);

      if (usersError) {
        setDebugInfo(`❌ Erro ao buscar usuários: ${usersError.message}`);
        throw usersError;
      }
      
      setUsers(usersData || []);
      setDebugInfo(`✅ ${usersData?.length || 0} usuários encontrados`);

      // ✅ VERIFICAR STATUS DE SINCRONIZAÇÃO (COM TIMEOUT)
      try {
        setDebugInfo('🔄 Verificando sincronização...');
        
        const syncResponse = await fetch('/api/admin/companies', {
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (syncResponse.ok) {
          const syncResult = await syncResponse.json();
          setSyncStatus({
            success: syncResult.success,
            companiesInDatabase: companiesData?.length || 0,
            companiesInAsana: syncResult.companies?.length?.toString() || '0',
            needsSync: (syncResult.companies?.length || 0) > (companiesData?.length || 0),
            asanaConfigured: !!syncResult.success,
            companies: syncResult.companies || []
          });
          setDebugInfo('✅ Status de sincronização verificado');
        } else {
          setDebugInfo('⚠️ Erro ao verificar sincronização - continuando...');
          setSyncStatus({
            success: false,
            companiesInDatabase: companiesData?.length || 0,
            companiesInAsana: 'N/A',
            needsSync: false,
            asanaConfigured: false,
            companies: []
          });
        }
      } catch (syncError) {
        setDebugInfo('⚠️ Sincronização falhou - continuando...');
        setSyncStatus({
          success: false,
          companiesInDatabase: companiesData?.length || 0,
          companiesInAsana: 'Erro',
          needsSync: false,
          asanaConfigured: false,
          companies: []
        });
      }
      
      setDebugInfo('✅ Todos os dados carregados com sucesso');
      
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('ℹ️ Request abortado - isso é normal');
        return;
      }

      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      
      // ✅ DETECTAR TIMEOUT E MOSTRAR MENSAGEM ESPECÍFICA
      if (err instanceof Error && err.name === 'AbortError') {
        setError('⏰ Timeout: Carregamento demorou mais que 15 segundos. Tente novamente.');
        setDebugInfo('❌ Timeout no carregamento dos dados');
      } else {
        setError(`Erro ao carregar dados: ${errorMsg}`);
        setDebugInfo(`❌ Erro: ${errorMsg}`);
      }
      
      // ✅ RESETAR FLAG PARA PERMITIR RETRY QUANDO HÁ ERRO
      hasLoadedInitialDataRef.current = false;
      
      console.error('❌ Erro completo no loadData:', err);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
      isLoadingDataRef.current = false;
      console.log('✅ loadData finalizado - loading definido como false');
    }
  }, [form.companyId]);

  // ✅ FUNÇÃO DE REFRESH MANUAL - NOVA
  const refreshData = useCallback(() => {
    console.log('🔄 Refresh manual solicitado');
    hasLoadedInitialDataRef.current = false; // Reset para permitir novo carregamento
    loadData();
  }, [loadData]);

  // ✅ VERIFICAR STATUS DE SINCRONIZAÇÃO
  const checkSyncStatus = async () => {
    try {
      setDebugInfo('🔍 Verificando status de sincronização...');
      
      const response = await fetch('/api/sync-companies', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
      
      const status = await response.json();
      setSyncStatus(status);
      setDebugInfo(`✅ Status: ${status.companiesInDatabase} no banco, Asana: ${status.asanaConfigured ? 'configurado' : 'não configurado'}`);
      
    } catch (error) {
      console.error('Erro ao verificar status de sincronização:', error);
      setDebugInfo(`❌ Erro no status: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  // ✅ SINCRONIZAR EMPRESAS COM DEBUG
  const handleSyncCompanies = async () => {
    if (syncing) return;

    setSyncing(true);
    setError('');
    setSuccess('');
    setDebugInfo('🔄 Iniciando sincronização...');
    setLastSyncResult(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch('/api/sync-companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Status ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      setLastSyncResult(result);
      
      if (!result.success) {
        throw new Error(result.error || 'Erro na sincronização');
      }

      const stats = result.stats || { totalProcessed: 0, created: 0, updated: 0, errors: 0 };
      
      setSuccess(`✅ ${result.message}

📊 Estatísticas:
• Total processadas: ${stats.totalProcessed}
• Criadas: ${stats.created}
• Atualizadas: ${stats.updated}
• Erros: ${stats.errors}

As empresas foram sincronizadas com sucesso!`);

      // Recarregar dados usando refresh manual
      await refreshData();
      
    } catch (err) {
      console.error('❌ Erro na sincronização:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(`❌ Erro na sincronização: ${errorMessage}`);
      setDebugInfo(`❌ Erro final: ${errorMessage}`);
    } finally {
      setSyncing(false);
    }
  };

  // ✅ CRIAR USUÁRIO
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setCreating(true);

    try {
      // Validações
      if (!form.email || !form.password || !form.fullName || !form.companyId) {
        throw new Error('Todos os campos são obrigatórios');
      }
      if (form.password !== form.confirmPassword) {
        throw new Error('Senhas não coincidem');
      }
      if (form.password.length < 6) {
        throw new Error('Senha deve ter pelo menos 6 caracteres');
      }

      const company = companies.find(c => c.id === form.companyId);
      if (!company) {
        throw new Error('Empresa não encontrada');
      }

      // Chamar API
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          fullName: form.fullName,
          companyId: form.companyId,
          role: form.role
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Erro ao criar usuário');
      }

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
      
      await refreshData();
      
    } catch (err) {
      console.error('❌ Erro na criação:', err);
      setError(err instanceof Error ? err.message : 'Erro ao criar usuário');
    } finally {
      setCreating(false);
    }
  };

  // ✅ INICIAR EDIÇÃO
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditForm({
      email: user.email,
      fullName: user.full_name || '',
      companyId: user.company_id,
      role: user.role,
      active: user.active
    });
    setError('');
    setSuccess('');
  };

  // ✅ SALVAR EDIÇÃO
  const handleSaveEdit = async () => {
    if (!editingUser) return;

    try {
      setError('');
      
      const { supabase } = await import('@/lib/supabase');
      
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          email: editForm.email,
          full_name: editForm.fullName,
          company_id: editForm.companyId,
          role: editForm.role,
          active: editForm.active,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingUser.id);

      if (updateError) {
        throw updateError;
      }

      setSuccess(`✅ Usuário ${editForm.email} atualizado com sucesso!`);
      setEditingUser(null);
      await refreshData();
      
    } catch (err) {
      console.error('❌ Erro ao atualizar:', err);
      setError(err instanceof Error ? err.message : 'Erro ao atualizar usuário');
    }
  };

  // ✅ CONFIRMAR EXCLUSÃO
  const handleDeleteUser = (user: User) => {
    setDeletingUser(user);
    setError('');
    setSuccess('');
  };

  // ✅ EXECUTAR EXCLUSÃO
  const handleConfirmDelete = async () => {
    if (!deletingUser) return;

    try {
      setError('');
      
      const { supabase } = await import('@/lib/supabase');
      
      const { error: deleteError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', deletingUser.id);

      if (deleteError) {
        throw deleteError;
      }

      setSuccess(`✅ Usuário ${deletingUser.email} removido com sucesso!`);
      setDeletingUser(null);
      await refreshData();
      
    } catch (err) {
      console.error('❌ Erro ao excluir:', err);
      setError(err instanceof Error ? err.message : 'Erro ao excluir usuário');
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
      {/* ✅ HEADER - ADICIONADO BOTÃO REFRESH */}
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
                <div className={`px-3 py-2 rounded-lg text-sm font-medium border ${
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

              {/* ✅ BOTÃO REFRESH MANUAL */}
              <button
                onClick={refreshData}
                disabled={loading}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center space-x-2 disabled:opacity-50"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                <span>Atualizar</span>
              </button>

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
        
        {/* ✅ DEBUG INFO */}
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

        {/* ✅ ALERTS */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertTriangle size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-800 font-medium text-sm">Erro</p>
                <pre className="text-red-700 text-xs mt-1 whitespace-pre-wrap font-mono">{error}</pre>
                {/* ✅ BOTÃO PARA TENTAR NOVAMENTE */}
                <button
                  onClick={refreshData}
                  className="mt-2 text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                >
                  Tentar Novamente
                </button>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <CheckCircle size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-green-800 font-medium text-sm">Sucesso</p>
                <pre className="text-green-700 text-xs mt-1 whitespace-pre-wrap font-mono">{success}</pre>
              </div>
            </div>
          </div>
        )}

        {/* Resto do código permanece igual... */}
        {/* (Cards, formulário, tabela, modais) */}

        {/* ✅ STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Usuários</p>
                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Empresas Ativas</p>
                <p className="text-2xl font-bold text-gray-900">{companies.length}</p>
              </div>
              <Database className="w-8 h-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Usuários Ativos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter(u => u.active).length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Administradores</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter(u => u.role === 'admin').length}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>

        {/* ✅ CRIAR USUÁRIO FORM */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow-sm border mb-8">
            <div className="border-b px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Criar Novo Usuário</h2>
              <p className="text-sm text-gray-600">Preencha as informações para criar um novo usuário</p>
            </div>
            
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={(e) => setForm(prev => ({ ...prev, fullName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Digite o nome completo"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="email@exemplo.com"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                      placeholder="Mínimo 6 caracteres"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmar Senha
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={(e) => setForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Digite a senha novamente"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Empresa
                  </label>
                  <select
                    value={form.companyId}
                    onChange={(e) => setForm(prev => ({ ...prev, companyId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Selecione uma empresa</option>
                    {companies.map(company => (
                      <option key={company.id} value={company.id}>
                        {company.display_name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Papel
                  </label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm(prev => ({ ...prev, role: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="viewer">Visualizador</option>
                    <option value="operator">Operador</option>
                    <option value="manager">Gerente</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 disabled:opacity-50"
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
              </div>
            </form>
          </div>
        )}

        {/* ✅ TABELA DE USUÁRIOS */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Lista de Usuários</h2>
            <p className="text-sm text-gray-600">Gerencie todos os usuários do sistema</p>
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
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {user.companies?.display_name || 'Empresa não encontrada'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.role === 'admin' ? 'bg-red-100 text-red-800' :
                        user.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                        user.role === 'operator' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role === 'admin' ? 'Administrador' :
                         user.role === 'manager' ? 'Gerente' :
                         user.role === 'operator' ? 'Operador' : 'Visualizador'}
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
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {users.length === 0 && (
              <div className="text-center py-12">
                <Users size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">Nenhum usuário encontrado</p>
                <button
                  onClick={refreshData}
                  className="mt-3 text-blue-600 hover:text-blue-800 text-sm"
                >
                  Tentar carregar novamente
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ✅ MODAL DE EDIÇÃO */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Editar Usuário</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm(prev => ({ ...prev, fullName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Empresa
                </label>
                <select
                  value={editForm.companyId}
                  onChange={(e) => setEditForm(prev => ({ ...prev, companyId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>
                      {company.display_name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Papel
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="viewer">Visualizador</option>
                  <option value="operator">Operador</option>
                  <option value="manager">Gerente</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="active"
                  checked={editForm.active}
                  onChange={(e) => setEditForm(prev => ({ ...prev, active: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="active" className="ml-2 block text-sm text-gray-700">
                  Usuário ativo
                </label>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t flex justify-end space-x-3">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ MODAL DE EXCLUSÃO */}
      {deletingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Confirmar Exclusão</h3>
            </div>
            
            <div className="p-6">
              <p className="text-gray-700">
                Tem certeza que deseja remover o usuário{' '}
                <strong>{deletingUser.email}</strong>?
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Esta ação não pode ser desfeita.
              </p>
            </div>
            
            <div className="px-6 py-4 border-t flex justify-end space-x-3">
              <button
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}