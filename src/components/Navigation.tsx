// src/components/Navigation.tsx - Versão simplificada
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 w-full bg-white border-b border-gray-200 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-gray-900">
          Portfolio
        </Link>
        
        <div className="flex items-center space-x-6">
          <Link 
            href="/" 
            className={pathname === '/' ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900'}
          >
            Home
          </Link>
          <Link 
            href="/15porcelanosa"
            className={pathname === '/15porcelanosa' ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900'}
          >
            15 Porcelanosa
          </Link>
          <Link 
            href="/645univar"
            className={pathname === '/645univar' ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900'}
          >
            645 Univar
          </Link>
          
            href="/api/test-asana"
            target="_blank"
            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
          >
            Debug
          </a>
        </div>
      </div>
    </nav>
  );
}