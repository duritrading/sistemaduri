// src/app/layout.tsx - LAYOUT HYDRATION SAFE + FAVICON
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/providers/AuthProvider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Duri Trading - Sistema de Tracking Marítimo',
  description: 'Sistema de tracking marítimo com dados em tempo real do Asana',
  
  // ✅ FAVICON CONFIGURATION - USING faviconduri.png
  icons: {
    icon: '/faviconduri.png',
    shortcut: '/faviconduri.png',
    apple: '/faviconduri.png'
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning={true}>
      <body className={inter.className} suppressHydrationWarning={true}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}