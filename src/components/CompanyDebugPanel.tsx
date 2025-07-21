// src/components/CompanyDebugPanel.tsx - Painel de Debug para Extração de Empresas
'use client';

import { useState } from 'react';
import { extractCompaniesFromTrackings, extractCompanyFromTracking, getCompanyStats } from '@/lib/auth';

interface CompanyDebugPanelProps {
  trackings: any[];
  isVisible?: boolean;
  onToggle?: (visible: boolean) => void;
}

export function CompanyDebugPanel({ trackings, isVisible = false, onToggle }: CompanyDebugPanelProps) {
  const [activeTab, setActiveTab] = useState<'extraction' | 'stats' | 'examples'>('extraction');

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => onToggle?.(true)}
          className="bg-gray-800 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 transition-colors"
          title="Mostrar Debug Panel"
        >
          🔧
        </button>
      </div>
    );
  }

  const extractedCompanies = extractCompaniesFromTrackings(trackings);
  const companyStats = getCompanyStats(trackings);

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-2xl z-50 max-w-lg w-full max-h-96 overflow-hidden">
      
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">🔧 Company Extraction Debug</h3>
        <button
          onClick={() => onToggle?.(false)}
          className="text-gray-400 hover:text-gray-600 text-lg"
        >
          ×
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { id: 'extraction', label: 'Extração', icon: '🏢' },
          { id: 'stats', label: 'Estatísticas', icon: '📊' },
          { id: 'examples', label: 'Exemplos', icon: '📝' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-2 text-xs font-medium flex-1 flex items-center justify-center space-x-1 ${
              activeTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 overflow-y-auto max-h-80">
        
        {/* Extraction Tab */}
        {activeTab === 'extraction' && (
          <div className="space-y-3">
            <div className="text-xs text-gray-600 mb-2">
              📋 {trackings.length} trackings → {extractedCompanies.length} empresas
            </div>
            
            {extractedCompanies.map((company, index) => (
              <div key={company.id} className="bg-gray-50 p-2 rounded text-xs">
                <div className="font-medium text-gray-900">{index + 1}. {company.name}</div>
                <div className="text-gray-600">ID: {company.id}</div>
                <div className="text-gray-600">Display: {company.displayName}</div>
              </div>
            ))}
            
            {extractedCompanies.length === 0 && (
              <div className="text-center text-gray-500 py-4">
                ⚠️ Nenhuma empresa extraída
              </div>
            )}
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div className="space-y-3">
            <div className="text-xs text-gray-600 mb-2">
              📊 Distribuição por empresa
            </div>
            
            {Object.entries(companyStats)
              .sort(([,a], [,b]) => b - a)
              .map(([company, count]) => (
                <div key={company} className="flex justify-between items-center p-2 bg-gray-50 rounded text-xs">
                  <span className="font-medium truncate">{company}</span>
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">{count}</span>
                </div>
              ))}
            
            {Object.keys(companyStats).length === 0 && (
              <div className="text-center text-gray-500 py-4">
                📊 Sem estatísticas disponíveis
              </div>
            )}
          </div>
        )}

        {/* Examples Tab */}
        {activeTab === 'examples' && (
          <div className="space-y-3">
            <div className="text-xs text-gray-600 mb-2">
              📝 Primeiros 5 títulos para análise
            </div>
            
            {trackings.slice(0, 5).map((tracking, index) => {
              const extractedCompany = extractCompanyFromTracking(tracking);
              const regex = /^\d+\s+([^(]+?)(?:\s*\([^)]*\))?$/;
              const match = tracking.title?.match(regex);
              
              return (
                <div key={index} className="bg-gray-50 p-2 rounded text-xs">
                  <div className="font-mono text-gray-800 mb-1">
                    "{tracking.title}"
                  </div>
                  <div className={`text-xs ${extractedCompany ? 'text-green-600' : 'text-red-600'}`}>
                    {extractedCompany ? `✅ ${extractedCompany}` : '❌ Não extraído'}
                  </div>
                  {match && (
                    <div className="text-xs text-blue-600 mt-1">
                      Regex match: "{match[1]?.trim()}"
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-4 py-2 border-t border-gray-200 text-xs text-gray-500 space-y-1">
        <div>Pattern 1: /^\d+º(?:\.\d+)?\s+([^(]+?)(?:\s*\(.*)?$/i (sem parênteses)</div>
        <div>Pattern 2: /^([A-Z][^(]*?)(?:\s*\(.*)?$/i (empresa no início)</div>
        <div>Console: testDuriSystem.runFullDiagnosis() para teste completo</div>
      </div>
    </div>
  );
}

// Hook para gerenciar estado do debug panel
export function useCompanyDebug() {
  const [debugVisible, setDebugVisible] = useState(false);
  
  // Atalho do teclado para toggle (Ctrl+Shift+D)
  useState(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        setDebugVisible(prev => !prev);
      }
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  });
  
  return {
    debugVisible,
    toggleDebug: setDebugVisible,
    showDebug: () => setDebugVisible(true),
    hideDebug: () => setDebugVisible(false)
  };
}