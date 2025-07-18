// src/components/Navigation.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

const navigation = [
  { name: 'Home', href: '/' },
  { name: '15 Porcelanosa', href: '/15porcelanosa' },
  { name: '645 Univar', href: '/645univar' },
];

export function Navigation() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-200 z-50">
      <div className="page-container">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-xl font-bold text-gray-900">
            Portfolio
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  'px-3 py-2 text-sm font-medium transition-colors relative',
                  pathname === item.href
                    ? 'text-primary-500'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                {item.name}
                {pathname === item.href && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-primary-500"
                  />
                )}
              </Link>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            <div className="w-6 h-6 flex flex-col justify-center space-y-1">
              <span className={clsx(
                'block w-full h-0.5 bg-gray-600 transition-transform',
                isOpen && 'rotate-45 translate-y-1.5'
              )} />
              <span className={clsx(
                'block w-full h-0.5 bg-gray-600 transition-opacity',
                isOpen && 'opacity-0'
              )} />
              <span className={clsx(
                'block w-full h-0.5 bg-gray-600 transition-transform',
                isOpen && '-rotate-45 -translate-y-1.5'
              )} />
            </div>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden py-4 space-y-2"
          >
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  'block px-3 py-2 text-base font-medium',
                  pathname === item.href
                    ? 'text-primary-500'
                    : 'text-gray-600'
                )}
                onClick={() => setIsOpen(false)}
              >
                {item.name}
              </Link>
            ))}
          </motion.div>
        )}
      </div>
    </nav>
  );
}