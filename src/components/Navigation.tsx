// src/components/Navigation.tsx - Versão corrigida
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const navigation = [
  { name: 'Home', href: '/' },
  { name: '15 Porcelanosa', href: '/15porcelanosa' },
  { name: '645 Univar', href: '/645univar' },
];

export function Navigation() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md border-b border-gray-200 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-xl font-bold text-gray-900">
            Portfolio
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`px-3 py-2 text-sm font-medium transition-colors relative ${
                  pathname === item.href
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {item.name}
                {pathname === item.href && (
                  <div className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-600" />
                )}
              </Link>
            ))}
            
            
              href="/api/test-asana"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-md hover:bg-blue-200 transition-colors"
            >
              Debug
            </a>
          </div>

          <button
            className="md:hidden p-2"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            <div className="w-6 h-6 flex flex-col justify-center space-y-1">
              <span className={`block w-full h-0.5 bg-gray-600 transition-transform ${
                isOpen ? 'rotate-45 translate-y-1.5' : ''
              }`} />
              <span className={`block w-full h-0.5 bg-gray-600 transition-opacity ${
                isOpen ? 'opacity-0' : ''
              }`} />
              <span className={`block w-full h-0.5 bg-gray-600 transition-transform ${
                isOpen ? '-rotate-45 -translate-y-1.5' : ''
              }`} />
            </div>
          </button>
        </div>

        {isOpen && (
          <div className="md:hidden py-4 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="block px-3 py-2 text-base font-medium text-gray-600 hover:text-gray-900"
                onClick={() => setIsOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            
              href="/api/test-asana"
              target="_blank"
              rel="noopener noreferrer"
              className="block px-3 py-2 text-sm text-blue-600 hover:text-blue-800"
            >
              Debug Asana
            </a>
          </div>
        )}
      </div>
    </nav>
  );
}