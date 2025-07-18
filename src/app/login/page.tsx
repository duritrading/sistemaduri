// src/app/page.tsx - Redirecionar para login
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentCompany } from '@/lib/auth';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const company = getCurrentCompany();
    if (company) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-600 mt-2">Redirecionando...</p>
      </div>
    </div>
  );
}