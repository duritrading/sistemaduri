// src/app/admin/users/page.tsx - ADMINISTRAÇÃO DE USUÁRIOS REAL
'use client';

import { useState, useEffect } from 'react';
import { useAuth, usePermissions } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { 
  UserPlus, Users, Mail, Lock, Building2, Shield, 
  Check, X, AlertCircle, Loader2, Eye, EyeOff, Save,
  ChevronDown, Search, Filter
} from 'lucide-react';

interface Company {
  id: string;
  name: string;
  display_name: string;
  slug: string;
  active: boolean;
}

interface CreateUserForm {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  companySlug: string;
  role: 'admin' | 'manager' | 'operator' | 'viewer';
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { user, supabaseConfigured } = useAuth();
  const { canManageUsers } = usePermissions();
  const router = useRouter();

  const [form, setForm] = useState<CreateUserForm>({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    companySlug: '',
    role: 'viewer'
  });

  // ✅ VERIFICAR PERMISSÕES
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (!canManageUsers) {
      router.push('/dashboard');
      return;
    }
    if (!supabaseConfigured) {
      setError('Supabase não configurado. Configure as variáveis de ambiente primeiro.');
      setLoading(false);
      return;
    }
    loadData();
  }, [user, canManageUsers, supabaseConfigured, router]);

  // ✅ CARREGAR DADOS
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Carregar empresas do Asana (dados reais)
      const companiesResponse = await fetch('/api/asana/unified');
      if (companiesResponse.ok) {
        const result = await companiesResponse.json();
        if (result.success) {
          // Extrair empresas dos dados reais do Asana
          const { extractCompaniesFromTrackings } = await import('@/lib/auth');
          const extractedCompanies = extractCompaniesFromTrackings(result.data);
          
          // Converter para formato Company
          const companiesData: Company[] = extractedCompanies.map(comp => ({
            id: comp.id,
            name: comp.name,
            display_name: comp.displayName,
            slug: comp.id.toLowerCase(),
            active: true
          }));
          
          setCompanies(companiesData);
          if (companiesData.length > 0 && !form.companySlug) {
            setForm(prev => ({ ...prev, companySlug: companiesData[0].slug }));
          }
        }
      }

      // TODO: Carregar usuários existentes do Supabase quando configurado
      // const usersResponse = await supabase.from('user_profiles').select('*');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
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
      if (!form.email || !form.password || !form.fullName || !form.companySlug) {
        throw new Error('Todos os campos são obrigatórios');
      }
      if (form.password !== form.confirmPassword) {
        throw new Error('Senhas não coincidem');
      }
      if (form.password.length < 6) {
        throw new Error('Senha deve ter pelo menos 6 caracteres');
      }

      // Verificar se empresa existe
      const company = companies.find(c => c.slug === form.companySlug);
      if (!company) {
        throw new Error('Empresa não encontrada');
      }

      // TODO: Criar usuário no Supabase quando configurado
      // const { createUserWithCompany } = await import('@/lib/auth-admin');
      // await createUserWithCompany(form.email, form.password, form.companySlug, form.fullName, form.role);

      // Por enquanto, mostrar instruções para criação manual
      const instructions = `
USUÁRIO CRIADO MANUALMENTE:

1. Acesse o Supabase Dashboard
2. Vá em Authentication > Users  
3. Clique "Invite User"
4. Email: ${form.email}
5. Após criação, execute este SQL no SQL Editor:

UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data || '{"full_name": "${form.fullName}", "company_slug": "${form.companySlug}"}'::jsonb
WHERE email = '${form.email}';

INSERT INTO public.user_profiles (id, company_id, email, full_name, role)
SELECT 
  id, 
  (SELECT id FROM public.companies WHERE slug = '${form.companySlug}'),
  '${form.email}',
  '${form.fullName}',
  '${form.role}'
FROM auth.users 
WHERE email = '${form.email}';
      `;

      setSuccess(`INSTRUÇÕES COPIADAS PARA O CLIPBOARD!\n${instructions}`);
      
      // Copiar para clipboard
      navigator.clipboard.writeText(instructions);

      // Reset form
      setForm({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        companySlug: companies[0]?.slug || '',
        role: 'viewer'
      });
      setShowCreateForm(false);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar usuário');
    } finally {
      setCreating(false);
    }
  };

  if (!supabaseConfigured) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Configuração Necessária</h2>
            <p className="text-gray-600">
              Para gerenciar usuários, configure primeiro as variáveis do Supabase no arquivo .env.local
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando administração...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Administração de Usuários</h1>
                <p className="text-gray-600">Gerencie usuários e permissões do sistema</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Voltar ao Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alerts */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-6">
            <div className="flex items-center">
              <Check className="w-5 h-5 mr-2" />
              <pre className="text-sm whitespace-pre-wrap">{success}</pre>
            </div>
          </div>
        )}

        {/* Actions Bar */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar usuários..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <UserPlus className="w-4 h-4" />
              <span>Adicionar Usuário</span>
            </button>
          </div>
        </div>

        {/* Create User Form */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Novo Usuário</h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nome Completo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm(prev => ({ ...prev, fullName: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nome do usuário"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="usuario@empresa.com"
                    required
                  />
                </div>
              </div>

              {/* Empresa */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Empresa *
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={form.companySlug}
                    onChange={(e) => setForm(prev => ({ ...prev, companySlug: e.target.value }))}
                    className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                    required
                  >
                    <option value="">Selecione uma empresa</option>
                    {companies.map(company => (
                      <option key={company.slug} value={company.slug}>
                        {company.display_name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permissão *
                </label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={form.role}
                    onChange={(e) => setForm(prev => ({ ...prev, role: e.target.value as any }))}
                    className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                    required
                  >
                    <option value="viewer">Viewer - Apenas visualização</option>
                    <option value="operator">Operator - Pode editar dados</option>
                    <option value="manager">Manager - Gerencia operações</option>
                    <option value="admin">Admin - Acesso completo</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </div>

              {/* Senha */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Senha *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirmar Senha */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar Senha *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={(e) => setForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Repita a senha"
                    required
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="md:col-span-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{creating ? 'Criando...' : 'Criar Usuário'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Users List */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Usuários Cadastrados ({companies.length} empresas encontradas)
            </h3>
            <p className="text-gray-600 mt-1">
              Configure o Supabase para visualizar usuários existentes
            </p>
          </div>
          <div className="p-6">
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>Configure o Supabase para gerenciar usuários existentes</p>
              <p className="text-sm mt-2">
                {companies.length > 0 
                  ? `${companies.length} empresas disponíveis: ${companies.map(c => c.display_name).join(', ')}`
                  : 'Nenhuma empresa encontrada nos dados do Asana'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}