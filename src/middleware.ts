// src/middleware.ts - VERSÃO MÍNIMA PARA EVITAR HYDRATION ISSUES
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // ✅ DEIXAR O AUTHPROVIDER LIDAR COM REDIRECIONAMENTOS
  // Middleware mínimo apenas para casos críticos
  
  const res = NextResponse.next();
  
  // ✅ APENAS VERIFICAÇÕES ESSENCIAIS PARA EVITAR LOOPS
  const isApiRoute = req.nextUrl.pathname.startsWith('/api');
  const isStaticFile = req.nextUrl.pathname.includes('.');
  
  // Permitir todas as rotas - AuthProvider será responsável pelos redirecionamentos
  if (isApiRoute || isStaticFile) {
    return res;
  }
  
  // ✅ Log para debugging (removível em produção)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔄 Middleware:', req.nextUrl.pathname);
  }
  
  return res;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};