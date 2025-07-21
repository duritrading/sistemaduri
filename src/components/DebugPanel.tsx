// src/components/DebugPanel.tsx - Panel para debug dos dados do Asana
'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Search, AlertTriangle, CheckCircle, XCircle, Database } from 'lucide-react';

interface Tracking {
  id: string;
  title: string;
  company: string;
  ref: string;
  status: string;
  maritimeStatus: string;
  transport: {
    exporter: string | null;
    company: string | null;
    vessel: string | null;
    blAwb: string | null;
    containers: string[];
    terminal: string | null;
    products: string[];
    transportadora: string | null;
    despachante: string | null;
  };
  schedule: {
    etd: string | null;
    eta: string | null;
    fimFreetime: string | null;
    fimArmazenagem: string | null;
    responsible: string | null;
  };
  business: {
    empresa: string | null;
    servicos: string | null;
    beneficioFiscal: string | null;
    canal: string | null;
    prioridade: string | null;
    adiantamento: string | null;
  };
  documentation: {
    invoice: string | null;
    blAwb: string | null;
  };
  regulatory: {
    orgaosAnuentes: string[];
  };
  customFields: Record<string, any>;
}

interface DebugPanelProps {
  trackings: Tracking[];
}

interface FieldAnalysis {
  fieldName: string;
  fillRate: number;
  sampleValues: string[];
  totalCount: number;
  filledCount: number;
  status: 'good' | 'warning' | 'error';
}

export function DebugPanel({ trackings }: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'fields' | 'samples'>('overview');

  // ✅ Análise dos campos essenciais para gráficos
  const analyzeFields = (): FieldAnalysis[] => {
    const essentialFields = [
      { key: 'Exportador', path: 'transport.exporter' },
      { key: 'PRODUTO', path: 'transport.products' },
      { key: 'CIA DE TRANSPORTE', path: 'transport.company' },
      { key: 'Órgãos Anuentes', path: 'regulatory.orgaosAnuentes' },
      { key: 'ETD', path: 'schedule.etd' }
    ];

    return essentialFields.map(field => {
      const values: string[] = [];
      let filledCount = 0;

      trackings.forEach(tracking => {
        const value = getNestedValue(tracking, field.path);
        if (value) {
          if (Array.isArray(value) && value.length > 0) {
            filledCount++;
            values.push(value.slice(0, 2).join(', ') + (value.length > 2 ? '...' : ''));
          } else if (typeof value === 'string' && value.trim() !== '') {
            filledCount++;
            values.push(value);
          }
        }
      });

      const fillRate = trackings.length > 0 ? (filledCount / trackings.length) * 100 : 0;
      const uniqueValues = [...new Set(values)].slice(0, 5);

      let status: 'good' | 'warning' | 'error' = 'error';
      if (fillRate >= 70) status = 'good';
      else if (fillRate >= 30) status = 'warning';

      return {
        fieldName: field.key,
        fillRate: Math.round(fillRate),
        sampleValues: uniqueValues,
        totalCount: trackings.length,
        filledCount,
        status
      };
    });
  };

  const getNestedValue = (obj: any, path: string): any => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  const fieldsAnalysis = analyzeFields();
  const totalFillRate = fieldsAnalysis.reduce((sum, field) => sum + field.fillRate, 0) / fieldsAnalysis.length;

  const getStatusIcon = (status: 'good' | 'warning' | 'error') => {
    switch (status) {
      case 'good': return <CheckCircle size={16} className="text-green-500" />;
      case 'warning': return <AlertTriangle size={16} className="text-yellow-500" />;
      case 'error': return <XCircle size={16} className="text-red-500" />;
    }
  };

  const getStatusColor = (status: 'good' | 'warning' | 'error') => {
    switch (status) {
      case 'good': return 'text-green-700 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'error': return 'text-red-700 bg-red-50 border-red-200';
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors z-50"
      >
        <Search size={16} className="inline mr-2" />
        Debug Dados
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border rounded-lg shadow-xl z-50 w-96 max-h-96 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-gray-900">Análise de Dados Asana</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <ChevronDown size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {[
          { key: 'overview', label: 'Visão Geral' },
          { key: 'fields', label: 'Campos' },
          { key: 'samples', label: 'Amostras' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setSelectedTab(tab.key as any)}
            className={`px-4 py-2 text-sm border-b-2 transition-colors ${
              selectedTab === tab.key
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 overflow-y-auto max-h-64">
        {selectedTab === 'overview' && (
          <div className="space-y-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{trackings.length}</div>
              <div className="text-sm text-gray-600">Total de Operações</div>
            </div>
            
            <div className="text-center">
              <div className={`text-xl font-semibold ${
                totalFillRate >= 70 ? 'text-green-600' : 
                totalFillRate >= 30 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {Math.round(totalFillRate)}%
              </div>
              <div className="text-sm text-gray-600">Taxa de Preenchimento Média</div>
            </div>

            <div className="space-y-2">
              {fieldsAnalysis.map(field => (
                <div key={field.fieldName} className="flex items-center justify-between">
                  <div className="flex items-center">
                    {getStatusIcon(field.status)}
                    <span className="text-sm ml-2">{field.fieldName}</span>
                  </div>
                  <span className="text-sm font-medium">{field.fillRate}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedTab === 'fields' && (
          <div className="space-y-3">
            {fieldsAnalysis.map(field => (
              <div key={field.fieldName} className={`border rounded-lg p-3 ${getStatusColor(field.status)}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    {getStatusIcon(field.status)}
                    <span className="font-medium ml-2">{field.fieldName}</span>
                  </div>
                  <span className="text-sm font-bold">{field.fillRate}%</span>
                </div>
                <div className="text-xs">
                  {field.filledCount} de {field.totalCount} preenchidos
                </div>
                {field.fillRate < 30 && (
                  <div className="text-xs mt-1 opacity-75">
                    ⚠️ Baixo preenchimento pode afetar gráficos
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {selectedTab === 'samples' && (
          <div className="space-y-3">
            {fieldsAnalysis.map(field => (
              <div key={field.fieldName}>
                <div className="font-medium text-sm mb-1">{field.fieldName}</div>
                {field.sampleValues.length > 0 ? (
                  <div className="space-y-1">
                    {field.sampleValues.map((value, index) => (
                      <div key={index} className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {value}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 italic">Nenhuma amostra disponível</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer com dicas */}
      <div className="border-t p-3 bg-gray-50">
        <div className="text-xs text-gray-600">
          {totalFillRate >= 70 
            ? '✅ Dados suficientes para gráficos precisos'
            : totalFillRate >= 30
            ? '⚠️ Alguns gráficos podem ter dados limitados'
            : '❌ Verificar preenchimento dos custom fields no Asana'
          }
        </div>
      </div>
    </div>
  );
}