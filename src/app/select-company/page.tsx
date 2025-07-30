// src/app/select-company/page.tsx - LAYOUT PREMIUM + CAMPO DE BUSCA
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { 
  Building2, ArrowRight, Loader2, AlertCircle, Check, Search, 
  Anchor, Compass, Ship, Globe, Users, Crown 
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

  // ✅ FILTRAR EMPRESAS BASEADO NA BUSCA
  const filteredCompanies = useMemo(() => {
    if (!searchTerm.trim()) {
      return companies;
    }

    const search = searchTerm.toLowerCase().trim();
    return companies.filter(company => 
      company.displayName.toLowerCase().includes(search) ||
      company.name.toLowerCase().includes(search)
    );
  }, [companies, searchTerm]);

  // ✅ PROSSEGUIR PARA DASHBOARD
  const handleProceed = async () => {
    setProceeding(true);

    // Salvar empresa selecionada no localStorage
    if (selectedCompany && selectedCompany !== 'user-company') {
      const company = companies.find(c => c.name === selectedCompany);
      if (company) {
        localStorage.setItem('admin_selected_company', JSON.stringify(company));
      }
    } else {
      // Remover seleção anterior se escolheu "Minha Empresa"
      localStorage.removeItem('admin_selected_company');
    }

    // Redirecionar para dashboard
    router.push('/dashboard');
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

        <div className="relative bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-red-600 via-red-500 to-red-600"></div>
          
          <div className="p-8 text-center">
            <div className="flex justify-center mb-6 relative">
              <div className="relative bg-slate-800/50 p-6 rounded-xl border border-slate-600/30">
                <img 
                  src="/duriLogo.webp" 
                  alt="Duri Trading" 
                  className="h-16 w-auto filter brightness-110 contrast-110"
                />
                <div className="absolute -top-2 -right-2">
                  <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center">
                    <Crown size={12} className="text-white" />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="w-20 h-20 bg-gradient-to-r from-red-600 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 size={40} className="text-white animate-spin" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Carregando Empresas</h3>
            <p className="text-slate-300 text-lg">Buscando empresas do Asana...</p>
          </div>
        </div>
      </div>
    );
  }

  // ✅ ERROR STATE
  if (error) {
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
        </div>

        <div className="relative bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-red-600 via-red-500 to-red-600"></div>
          
          <div className="p-8 text-center">
            <div className="flex justify-center mb-6 relative">
              <div className="relative bg-slate-800/50 p-6 rounded-xl border border-slate-600/30">
                <img 
                  src="/duriLogo.webp" 
                  alt="Duri Trading" 
                  className="h-16 w-auto filter brightness-110 contrast-110"
                />
              </div>
            </div>
            
            <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-4">Erro ao Carregar</h3>
            <p className="text-slate-300 mb-6">{error}</p>
            
            <button
              onClick={loadCompanies}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:from-red-700 hover:to-red-800 transition-all"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ✅ MAIN INTERFACE - DESIGN MARÍTIMO PREMIUM
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{
      background: 'linear-gradient(180deg, #0c1427 0%, #1e3a5f 35%, #2d5282 70%, #1a365d 100%)'
    }}>
      
      {/* ✅ NAUTICAL CORPORATE BACKGROUND ELEMENTS */}
      <div className="absolute inset-0 overflow-hidden">
        {/* World Map Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-1/4 left-1/4 w-96 h-64" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='worldmap' x='0' y='0' width='20' height='20' patternUnits='userSpaceOnUse'%3E%3Ccircle cx='10' cy='10' r='1' fill='%23ffffff'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100' height='100' fill='url(%23worldmap)'/%3E%3C/svg%3E")`,
            backgroundSize: '40px 40px'
          }}></div>
        </div>

        {/* Maritime Elements */}
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

      {/* ✅ MAIN CONTAINER */}
      <div className="relative bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        
        {/* Top Corporate Border */}
        <div className="h-1 bg-gradient-to-r from-red-600 via-red-500 to-red-600"></div>
        
        {/* ✅ PREMIUM HEADER */}
        <div className="p-8 pb-6">
          <div className="text-center mb-8">
            {/* Logo com Admin Badge */}
            <div className="flex justify-center mb-6 relative">
              <div className="relative bg-slate-800/50 p-6 rounded-xl border border-slate-600/30">
                <img 
                  src="/duriLogo.webp" 
                  alt="Duri Trading" 
                  className="h-16 w-auto filter brightness-110 contrast-110"
                />
                {/* Admin Crown */}
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
              Como administrador, escolha qual empresa visualizar
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

          {/* ✅ OPÇÃO "MINHA EMPRESA" DESTACADA */}
          <div className="mb-4">
            <div
              onClick={() => setSelectedCompany('user-company')}
              className={`p-4 rounded-xl cursor-pointer transition-all border-2 ${
                selectedCompany === 'user-company' 
                ? 'bg-red-500/20 border-red-400 shadow-lg' 
                : 'bg-slate-800/40 border-slate-600/30 hover:bg-slate-800/60 hover:border-slate-500/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                    <Users size={20} className="text-white" />
                  </div>
                  <div>
                    <div className="text-white font-medium">
                      Minha Empresa
                    </div>
                    <div className="text-slate-400 text-sm">
                      {userCompany?.display_name || 'Empresa padrão'}
                    </div>
                  </div>
                </div>
                {selectedCompany === 'user-company' && (
                  <Check size={20} className="text-red-400" />
                )}
              </div>
            </div>
          </div>

          {/* ✅ LISTA DE EMPRESAS FILTRADAS */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredCompanies.length > 0 ? (
              filteredCompanies.map((company) => (
                <div
                  key={company.name}
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
                        {company.displayName}
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