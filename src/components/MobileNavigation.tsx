// src/components/MobileNavigation.tsx - NAVEGAÇÃO MOBILE PARA DASHBOARD
'use client';

import { useState } from 'react';
import { BarChart3, TrendingUp, List, Menu, X } from 'lucide-react';

interface MobileNavigationProps {
  activeSection: string;
  onSectionChange: (section: 'resumo' | 'graficos' | 'operacoes') => void;
}

export function MobileNavigation({ activeSection, onSectionChange }: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);

  const navigationItems = [
    {
      id: 'resumo' as const,
      label: 'Resumo Operacional',
      icon: BarChart3
    },
    {
      id: 'graficos' as const,
      label: 'Gráficos Operacionais', 
      icon: TrendingUp
    },
    {
      id: 'operacoes' as const,
      label: 'Operações Detalhadas',
      icon: List
    }
  ];

  const handleSectionChange = (section: 'resumo' | 'graficos' | 'operacoes') => {
    onSectionChange(section);
    setIsOpen(false);
  };

  return (
    <div className="md:hidden">
      {/* ✅ BOTÃO TOGGLE SEXY */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-12 h-12 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-2xl hover:border-[#b51c26] hover:shadow-lg transition-all duration-300"
      >
        {isOpen ? <X size={20} className="text-gray-700" /> : <Menu size={20} className="text-gray-700" />}
      </button>

      {/* ✅ MENU MOBILE SEXY */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/20 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu Dropdown Premium */}
          <div className="absolute top-14 right-0 w-72 bg-white/95 backdrop-blur-md border border-gray-200/50 rounded-2xl shadow-2xl z-50 overflow-hidden">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleSectionChange(item.id)}
                  className={`w-full flex items-center space-x-4 px-6 py-4 text-left transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#b51c26] to-[#dc2626] text-white shadow-lg'
                      : 'text-gray-700 hover:bg-[#b51c26]/5 hover:text-[#b51c26]'
                  } ${item.id === navigationItems[0].id ? 'rounded-t-2xl' : ''} ${item.id === navigationItems[navigationItems.length - 1].id ? 'rounded-b-2xl' : ''}`}
                >
                  <Icon size={20} />
                  <span className="font-semibold">{item.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}