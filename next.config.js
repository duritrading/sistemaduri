// next.config.js - CONFIGURAÇÃO PARA RESOLVER HYDRATION ISSUES
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ CONFIGURAÇÕES PARA EVITAR HYDRATION MISMATCHES
  experimental: {
    // Remover em produção se não precisar
    esmExternals: 'loose'
  },
  
  // ✅ CONFIGURAÇÃO PARA SUPABASE
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  
  // ✅ CONFIGURAÇÕES DE WEBPACK PARA EVITAR ERROS DE SSR
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Evitar problemas com módulos que só funcionam no servidor
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    return config;
  },
  
  // ✅ CONFIGURAÇÕES DE IMAGES
  images: {
    domains: ['localhost'],
    unoptimized: true, // Para desenvolvimento local
  },
  
  // ✅ CONFIGURAÇÕES DE RUNTIME
  swcMinify: true,
  
  // ✅ HEADERS PARA DEVELOPMENT
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;