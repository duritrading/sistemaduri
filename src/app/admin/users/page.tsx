// src/app/admin/users/page.tsx - VERSÃO COM EDITAR/EXCLUIR + DEBUG DE SINCRONIZAÇÃO
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

  const { user, profile } = useAuth();
  const router = useRouter();

  // ✅ VERIFICAR PERMISSÕES
  useEffect(() => {
    if (!user || !profile) {
      router.push('/login');
      return;
    }

    if (profile.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    loadData();
  }, [user, profile, router]);

 const loadData = async () => {
  // ✅ TIMEOUT CONTROLLER para evitar loading infinito
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

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
    const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
    
    // ✅ DETECTAR TIMEOUT E MOSTRAR MENSAGEM ESPECÍFICA
    if (err instanceof Error && err.name === 'AbortError') {
      setError('⏰ Timeout: Carregamento demorou mais que 15 segundos. Tente novamente.');
      setDebugInfo('❌ Timeout no carregamento dos dados');
    } else {
      setError(`Erro ao carregar dados: ${errorMsg}`);
      setDebugInfo(`❌ Erro: ${errorMsg}`);
    }
    
    console.error('❌ Erro completo no loadData:', err);
  } finally {
    // ✅ SEMPRE LIMPAR TIMEOUT E RESETAR LOADING
    clearTimeout(timeoutId);
    setLoading(false);
    console.log('✅ loadData finalizado - loading definido como false');
  }
};

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

      // Recarregar dados
      await loadData();
      
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
      
      await loadData();
      
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
      await loadData();
      
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
      await loadData();
      
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

        {/* ✅ DETALHES DE SINCRONIZAÇÃO */}
        {lastSyncResult && lastSyncResult.errorDetails && lastSyncResult.errorDetails.length > 0 && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <AlertTriangle size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-amber-800 font-medium">Detalhes da Sincronização</p>
                  <p className="text-amber-700 text-sm mt-1">
                    {lastSyncResult.errorDetails.length} erros detectados durante a extração
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSyncDetails(!showSyncDetails)}
                className="text-amber-600 hover:text-amber-800 text-sm font-medium"
              >
                {showSyncDetails ? 'Ocultar' : 'Ver Detalhes'}
              </button>
            </div>
            
            {showSyncDetails && (
              <div className="mt-4 space-y-2">
                <h4 className="font-medium text-amber-800">Erros de Extração:</h4>
                <div className="bg-white rounded border max-h-40 overflow-y-auto">
                  {lastSyncResult.errorDetails.map((error, i) => (
                    <div key={i} className="px-3 py-2 text-sm text-gray-700 border-b border-gray-100 last:border-b-0">
                      {error}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-amber-600 mt-2">
                  Estes erros indicam tasks no Asana que não seguem o padrão esperado: "Nº EMPRESA (detalhes)"
                </p>
              </div>
            )}
          </div>
        )}

        {/* ✅ ALERTS */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <XCircle size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-800 font-medium">Erro</p>
                <pre className="text-red-700 text-sm mt-1 whitespace-pre-wrap">{error}</pre>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <CheckCircle size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-green-800 font-medium">Sucesso</p>
                <pre className="text-green-700 text-sm mt-1 whitespace-pre-wrap">{success}</pre>
              </div>
            </div>
          </div>
        )}

        {/* ✅ GRID LAYOUT */}
        <div className={`grid gap-8 ${showCreateForm ? 'lg:grid-cols-3' : 'lg:grid-cols-1'}`}>
          
          {/* ✅ FORMULÁRIO DE CRIAR USUÁRIO */}
          {showCreateForm && (
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold">Criar Novo Usuário</h2>
              </div>
              
              <div className="p-6">
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome Completo
                    </label>
                    <input
                      type="text"
                      value={form.fullName}
                      onChange={(e) => setForm(prev => ({ ...prev, fullName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Empresa
                    </label>
                    <select
                      value={form.companyId}
                      onChange={(e) => setForm(prev => ({ ...prev, companyId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      {companies.map(company => (
                        <option key={company.id} value={company.id}>
                          {company.display_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Papel
                    </label>
                    <select
                      value={form.role}
                      onChange={(e) => setForm(prev => ({ ...prev, role: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="operator">Operator</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Senha
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirmar Senha
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.confirmPassword}
                      onChange={(e) => setForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={creating || companies.length === 0}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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
                    <div className="text-center text-amber-600 text-sm">
                      <p>⚠️ Nenhuma empresa disponível.</p>
                      <p>Clique em "Sincronizar Empresas" primeiro.</p>
                    </div>
                  )}
                </form>
              </div>
            </div>
          )}

          {/* ✅ LISTA DE USUÁRIOS */}
          <div className={showCreateForm ? "lg:col-span-2" : "lg:col-span-1"}>
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                            title="Editar usuário"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                            title="Excluir usuário"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {users.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Users size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>Nenhum usuário cadastrado ainda.</p>
                    <p>Clique em "Novo Usuário" para começar.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ MODAL DE EDIÇÃO */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Editar Usuário</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                <input
                  type="text"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm(prev => ({ ...prev, fullName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                <select
                  value={editForm.companyId}
                  onChange={(e) => setEditForm(prev => ({ ...prev, companyId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>
                      {company.display_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Papel</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="viewer">Viewer</option>
                  <option value="operator">Operator</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
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
                <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
                  Usuário ativo
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
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

      {/* ✅ MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {deletingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4 text-red-800">Confirmar Exclusão</h3>
            
            <p className="text-gray-700 mb-2">
              Tem certeza que deseja excluir o usuário:
            </p>
            <p className="font-semibold text-gray-900 mb-4">
              {deletingUser.full_name} ({deletingUser.email})
            </p>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-800 text-sm">
                ⚠️ Esta ação não pode ser desfeita. O usuário perderá acesso imediatamente ao sistema.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
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
                Excluir Usuário
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}