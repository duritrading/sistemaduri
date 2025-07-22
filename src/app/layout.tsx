// src/app/layout.tsx - LAYOUT COM AUTHPROVIDER (PRODUCTION-READY)
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/providers/AuthProvider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Duri Trading - Sistema de Tracking Marítimo',
  description: 'Sistema de tracking marítimo com dados em tempo real do Asana',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}