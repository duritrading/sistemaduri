// src/middleware.ts - MIDDLEWARE SIMPLIFICADO (funciona com e sem Supabase)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // ✅ VERIFICAR SE SUPABASE ESTÁ CONFIGURADO
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseConfigured = supabaseUrl && supabaseKey && 
    !supabaseUrl.includes('your_') && !supabaseKey.includes('your_');

  // ✅ ROTAS PROTEGIDAS
  const protectedRoutes = ['/dashboard', '/admin'];
  const authRoutes = ['/login'];
  const isProtectedRoute = protectedRoutes.some(route => 
    req.nextUrl.pathname.startsWith(route)
  );
  const isAuthRoute = authRoutes.some(route => 
    req.nextUrl.pathname.startsWith(route)
  );

  // ✅ SE SUPABASE NÃO CONFIGURADO
  if (!supabaseConfigured) {
    // Permitir acesso ao login (que mostrará instruções de configuração)
    if (isAuthRoute || req.nextUrl.pathname === '/') {
      return res;
    }
    
    // Redirecionar rotas protegidas para login (com instruções)
    if (isProtectedRoute) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    
    return res;
  }

  // ✅ SE SUPABASE CONFIGURADO, USAR MIDDLEWARE REAL
  try {
    const { createMiddlewareClient } = await import('@supabase/auth-helpers-nextjs');
    const supabase = createMiddlewareClient({ req, res });

    // Verificar sessão ativa
    const { data: { session }, error } = await supabase.auth.getSession();

    // Redirecionamento baseado em autenticação
    if (isProtectedRoute && (!session || error)) {
      const redirectUrl = new URL('/login', req.url);
      redirectUrl.searchParams.set('redirect', req.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    if (isAuthRoute && session) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Verificar acesso à empresa (para rotas específicas de empresa)
    if (session && req.nextUrl.pathname.startsWith('/dashboard')) {
      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('company_id, companies!inner(slug)')
          .eq('id', session.user.id)
          .single();

        if (!profile) {
          return NextResponse.redirect(new URL('/login?error=no_profile', req.url));
        }
      } catch (error) {
        console.error('Middleware error:', error);
        // Não redirecionar em caso de erro, permitir acesso
      }
    }

  } catch (error) {
    console.error('Middleware Supabase error:', error);
    // Em caso de erro do Supabase, permitir acesso normal
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};