// src/app/select-company/page.tsx - CORREÇÃO DOS BUGS IDENTIFICADOS
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { 
  Building2, ArrowRight, Loader2, AlertCircle, Check, Search, 
  Anchor, Compass, Ship, Globe, Crown 
} from 'lucide-react';

interface Company {
  id: string;
  name: string;
  displayName: string;
}

export default function SelectCompanyPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [proceeding, setProceeding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { user, profile, company: userCompany } = useAuth();
  const router = useRouter();

  // ✅ VERIFICAR SE É ADMIN E REDIRECIONAR SE NÃO FOR
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (profile && profile.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
  }, [user, profile, router]);

  // ✅ CARREGAR EMPRESAS DO ASANA
  useEffect(() => {
    if (profile?.role === 'admin') {
      loadCompanies();
    }
  }, [profile]);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/companies');
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Erro ao carregar empresas');
      }

      setCompanies(result.companies || []);

    } catch (err) {
      console.error('❌ Erro ao carregar empresas:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar empresas');
    } finally {
      setLoading(false);
    }
  };

  // ✅ FILTRAR EMPRESAS - CORRIGIDO COM VALIDAÇÕES DEFENSIVAS
  const filteredCompanies = useMemo(() => {
    if (!searchTerm.trim()) {
      return companies;
    }

    const search = searchTerm.toLowerCase().trim();
    return companies.filter(company => {
      // ✅ VALIDAÇÕES DEFENSIVAS PARA EVITAR UNDEFINED
      const displayName = company.displayName || company.name || '';
      const name = company.name || '';
      
      return displayName.toLowerCase().includes(search) ||
             name.toLowerCase().includes(search);
    });
  }, [companies, searchTerm]);

  // ✅ PROSSEGUIR PARA DASHBOARD - APENAS EMPRESAS EXTERNAS
  const handleProceed = async () => {
    setProceeding(true);

    try {
      if (selectedCompany) {
        // ✅ EMPRESA ESPECÍFICA: Salvar empresa selecionada
        const company = companies.find(c => c.name === selectedCompany);
        if (company) {
          localStorage.setItem('admin_selected_company', JSON.stringify(company));
          console.log('✅ Admin selecionou empresa:', company.displayName);
        }
      }

      // ✅ REDIRECIONAR PARA DASHBOARD
      router.push('/dashboard');
      
    } catch (error) {
      console.error('❌ Erro ao processar seleção:', error);
      setError('Erro ao processar seleção da empresa');
    } finally {
      setProceeding(false);
    }
  };

  // ✅ LOADING STATE COM TEMA MARÍTIMO
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{
        background: 'linear-gradient(180deg, #0c1427 0%, #1e3a5f 35%, #2d5282 70%, #1a365d 100%)'
      }}>
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-12 opacity-8">
            <Ship size={120} className="text-slate-400 rotate-12" />
          </div>
          <div className="absolute bottom-24 right-16 opacity-10">
            <Compass size={100} className="text-red-400 animate-spin" style={{ animationDuration: '30s' }} />
          </div>
          <div className="absolute top-1/3 right-1/4 opacity-6">
            <Globe size={80} className="text-slate-500" />
          </div>
          <div className="absolute bottom-1/3 left-1/4 opacity-8">
            <Anchor size={60} className="text-red-500 rotate-45" />
          </div>
        </div>

        {/* Loading Card */}
        <div className="relative bg-slate-900/80 border border-slate-700/50 rounded-2xl shadow-2xl max-w-md w-full">
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Crown size={32} className="text-white" />
            </div>
            <div className="mb-4">
              <Loader2 size={24} className="animate-spin text-red-400 mx-auto" />
            </div>
            <p className="text-slate-300 text-lg font-medium">Carregando empresas...</p>
          </div>
        </div>
      </div>
    );
  }

  // ✅ ERROR STATE
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{
        background: 'linear-gradient(180deg, #0c1427 0%, #1e3a5f 35%, #2d5282 70%, #1a365d 100%)'
      }}>
        <div className="bg-slate-900/80 border border-red-500/50 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Erro ao Carregar</h2>
          <p className="text-slate-300 mb-6">{error}</p>
          <button
            onClick={loadCompanies}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{
      background: 'linear-gradient(180deg, #0c1427 0%, #1e3a5f 35%, #2d5282 70%, #1a365d 100%)'
    }}>
      {/* ✅ BACKGROUND ELEMENTS MARÍTIMOS */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-12 opacity-8">
          <Ship size={120} className="text-slate-400 rotate-12" />
        </div>
        <div className="absolute bottom-24 right-16 opacity-10">
          <Compass size={100} className="text-red-400 animate-spin" style={{ animationDuration: '30s' }} />
        </div>
        <div className="absolute top-1/3 right-1/4 opacity-6">
          <Globe size={80} className="text-slate-500" />
        </div>
        <div className="absolute bottom-1/3 left-1/4 opacity-8">
          <Anchor size={60} className="text-red-500 rotate-45" />
        </div>

        {/* Ocean Depth Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/20 to-slate-800/30"></div>
      </div>

      {/* ✅ MAIN CONTAINER PREMIUM */}
      <div className="relative bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        
        {/* Top Corporate Border */}
        <div className="h-1 bg-gradient-to-r from-red-600 via-red-500 to-red-600"></div>
        
        {/* ✅ HEADER ADMIN */}
        <div className="p-8 pb-6">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6 relative">
              <div className="relative bg-slate-800/50 p-6 rounded-xl border border-slate-600/30">
                <img 
                  src="/duriLogo.webp" 
                  alt="Duri Trading" 
                  className="h-16 w-auto filter brightness-110 contrast-110"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="absolute -top-2 -right-2">
                  <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center">
                    <Crown size={12} className="text-white" />
                  </div>
                </div>
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-white mb-2">
              Selecionar Empresa
            </h1>
            <p className="text-slate-300 mb-4">
              Escolha uma empresa para visualizar seus dados
            </p>
            
            <div className="flex items-center justify-center space-x-2">
              <Building2 size={16} className="text-red-400" />
              <span className="text-red-300 text-sm font-medium">Dashboard Empresarial</span>
            </div>
          </div>

          {/* ✅ CAMPO DE BUSCA PREMIUM */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-800/60 border border-slate-600/50 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-white placeholder-slate-400 transition-all"
                placeholder="Buscar empresa..."
              />
            </div>
            
            {/* Contador de resultados */}
            <div className="mt-2 text-center">
              <span className="text-slate-400 text-sm">
                {filteredCompanies.length} de {companies.length} empresas
              </span>
            </div>
          </div>



          {/* ✅ LISTA DE EMPRESAS FILTRADAS */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredCompanies.length > 0 ? (
              filteredCompanies.map((company) => (
                <div
                  key={company.id || company.name}
                  onClick={() => setSelectedCompany(company.name)}
                  className={`p-3 rounded-lg cursor-pointer transition-all border ${
                    selectedCompany === company.name 
                    ? 'bg-red-500/20 border-red-400' 
                    : 'bg-slate-800/40 border-slate-600/30 hover:bg-slate-800/60 hover:border-slate-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">
                        {company.displayName || company.name}
                      </div>
                      <div className="text-slate-400 text-sm">
                        {company.name}
                      </div>
                    </div>
                    {selectedCompany === company.name && (
                      <Check size={18} className="text-red-400" />
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Search size={40} className="text-slate-400 mx-auto mb-4" />
                <p className="text-slate-400">
                  Nenhuma empresa encontrada para "{searchTerm}"
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ✅ PROCEED BUTTON */}
        <div className="p-8 pt-0">
          <button
            onClick={handleProceed}
            disabled={!selectedCompany || proceeding}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-4 px-6 rounded-xl font-semibold shadow-lg hover:from-red-700 hover:to-red-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
          >
            {proceeding ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>Carregando Dashboard...</span>
              </>
            ) : (
              <>
                <span>Acessar Dashboard</span>
                <ArrowRight size={20} />
              </>
            )}
          </button>

          {/* Footer Info */}
          <div className="mt-6 text-center">
            <p className="text-slate-500 text-sm">
              {companies.length} empresas disponíveis no Asana
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}