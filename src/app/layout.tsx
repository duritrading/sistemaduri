// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Navigation } from '@/components/Navigation';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Analytics } from '@/components/Analytics';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    template: '%s | Portfolio',
    default: 'Portfolio',
  },
  description: 'Portfolio profissional de projetos',
  keywords: ['portfolio', 'projetos', 'desenvolvimento'],
  authors: [{ name: 'Portfolio' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <ErrorBoundary>
          <div className="min-h-screen bg-gray-50">
            <Navigation />
            <main className="pt-16">
              {children}
            </main>
          </div>
        </ErrorBoundary>
        <Analytics />
      </body>
    </html>
  );
}