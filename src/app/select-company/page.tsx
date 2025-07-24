// src/app/select-company/page.tsx - TELA DE SELEÇÃO DE EMPRESA PARA ADMIN
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Building2, ArrowRight, Loader2, AlertCircle, Check } from 'lucide-react';

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

  // ✅ LOADING STATE
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)'
      }}>
        <div className="bg-white/15 backdrop-blur-2xl border border-white/30 rounded-3xl p-8 shadow-2xl max-w-md w-full">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-red-600 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 size={40} className="text-white animate-spin" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Carregando Empresas</h3>
            <p className="text-white/70 text-lg">Buscando empresas do Asana...</p>
          </div>
        </div>
      </div>
    );
  }

  // ✅ ERROR STATE
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)'
      }}>
        <div className="bg-white/15 backdrop-blur-2xl border border-red-400/30 rounded-3xl p-8 shadow-2xl max-w-md w-full">
          <div className="text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={40} className="text-red-600" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Erro ao Carregar</h3>
            <p className="text-white/70 mb-6">{error}</p>
            <button
              onClick={loadCompanies}
              className="w-full bg-gradient-to-r from-red-600 to-red-500 text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:from-red-700 hover:to-red-600 transition-all"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)'
    }}>
      {/* ✅ SUBTLE TEXTURE LINES */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(45deg, transparent 48%, rgba(255,255,255,0.02) 49%, rgba(255,255,255,0.02) 51%, transparent 52%),
            linear-gradient(-45deg, transparent 48%, rgba(255,255,255,0.01) 49%, rgba(255,255,255,0.01) 51%, transparent 52%)
          `,
          backgroundSize: '60px 60px'
        }}></div>
      </div>

      {/* ✅ MAIN SELECTION CONTAINER */}
      <div className="relative bg-white/15 backdrop-blur-2xl border border-white/30 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden">
        
        {/* Header */}
        <div className="p-8 pb-6">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <img 
                  src="/duriLogo.webp" 
                  alt="Duri Trading" 
                  className="h-20 w-auto drop-shadow-2xl"
                />
                <div className="absolute -inset-3 bg-gradient-to-r from-red-600/20 to-red-500/20 rounded-full blur-xl -z-10"></div>
              </div>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-red-200 to-white bg-clip-text text-transparent">
              Selecionar Empresa
            </h1>
            <p className="text-white/70 mt-3 text-lg">
              Como administrador, escolha qual empresa visualizar
            </p>
            <div className="flex items-center justify-center mt-4 space-x-2">
              <Building2 size={16} className="text-red-400" />
              <span className="text-red-300 text-sm font-medium">Dashboard Empresarial</span>
            </div>
          </div>

            {/* Lista de Empresas do Asana */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {companies.map((company) => (
                <div
                  key={company.name}
                  onClick={() => setSelectedCompany(company.name)}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    selectedCompany === company.name 
                    ? 'bg-red-500/20 border-2 border-red-400' 
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">
                        {company.displayName}
                      </div>
                      <div className="text-white text-sm">
                        {company.name}
                      </div>
                    </div>
                    {selectedCompany === company.name && (
                      <Check size={18} className="text-red-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ✅ PROCEED BUTTON */}
          <div className="mt-8">
            <button
              onClick={handleProceed}
              disabled={!selectedCompany || proceeding}
              className="w-full bg-gradient-to-r from-red-600 to-red-500 text-white py-4 px-6 rounded-xl font-semibold shadow-lg hover:from-red-700 hover:to-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
            >
              {proceeding ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Carregando Dashboard...</span>
                </>
              ) : (
                <>
                  <span>Acessar Dashboard</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>

          {/* Footer Info */}
          <div className="mt-6 text-center">
            <p className="text-white/50 text-sm">
              {companies.length} empresas disponíveis no Asana
            </p>
          </div>
        </div>
      </div>
  )
  }