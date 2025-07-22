// src/app/api/debug/env-check/route.ts - API PARA DEBUG ENV VARS
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🔍 Debug: Verificando variáveis de ambiente...');

    // Variáveis críticas para verificar
    const variables = {
      'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
      'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'ASANA_ACCESS_TOKEN': process.env.ASANA_ACCESS_TOKEN,
      'NEXTAUTH_SECRET': process.env.NEXTAUTH_SECRET,
      'NEXTAUTH_URL': process.env.NEXTAUTH_URL
    };

    const result: any = {
      success: true,
      variables: {},
      summary: {
        total: Object.keys(variables).length,
        ok: 0,
        missing: 0,
        invalid: 0
      }
    };

    // Analisar cada variável
    Object.entries(variables).forEach(([key, value]) => {
      let status = 'missing';
      let masked = 'NÃO DEFINIDA';
      let preview = 'NÃO DEFINIDA';

      if (value) {
        if (value.includes('your_') || value === '') {
          status = 'invalid';
          masked = 'VALOR INVÁLIDO';
          preview = value;
        } else {
          status = 'ok';
          result.summary.ok++;
          
          // Mascarar valor para segurança
          if (value.length > 20) {
            masked = `${value.substring(0, 8)}...${value.substring(value.length - 4)}`;
            preview = `${value.substring(0, 20)}...${value.substring(value.length - 10)}`;
          } else {
            masked = '***';
            preview = value;
          }
        }
      } else {
        result.summary.missing++;
      }

      result.variables[key] = {
        status,
        masked,
        preview,
        length: value ? value.length : 0,
        defined: !!value
      };

      console.log(`${status === 'ok' ? '✅' : '❌'} ${key}: ${masked}`);
    });

    // Status específico para SERVICE_ROLE_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceKey) {
      result.serviceKeyDetails = {
        present: true,
        startsWithEyJ: serviceKey.startsWith('eyJ'),
        hasDotsLikeJWT: serviceKey.includes('.'),
        length: serviceKey.length,
        isLikelyJWT: serviceKey.startsWith('eyJ') && serviceKey.includes('.') && serviceKey.length > 100
      };
    } else {
      result.serviceKeyDetails = {
        present: false,
        error: 'SUPABASE_SERVICE_ROLE_KEY não está definida'
      };
    }

    // Teste de conexão com Supabase
    if (result.variables['NEXT_PUBLIC_SUPABASE_URL'].status === 'ok' && 
        result.variables['SUPABASE_SERVICE_ROLE_KEY'].status === 'ok') {
      
      try {
        console.log('🧪 Testando conexão com Supabase...');
        
        const { createClient } = await import('@supabase/supabase-js');
        
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          }
        );

        // Teste simples: listar usuários
        const { data, error } = await supabaseAdmin.auth.admin.listUsers();
        
        if (error) {
          result.supabaseTest = {
            success: false,
            error: error.message
          };
        } else {
          result.supabaseTest = {
            success: true,
            userCount: data.users.length,
            message: 'Conexão com Supabase funcionando!'
          };
        }

      } catch (supabaseError) {
        result.supabaseTest = {
          success: false,
          error: supabaseError instanceof Error ? supabaseError.message : 'Erro desconhecido'
        };
      }
    }

    // Resumo final
    if (result.summary.missing > 0 || result.summary.invalid > 0) {
      result.success = false;
      result.message = `${result.summary.missing} variáveis faltando, ${result.summary.invalid} inválidas`;
    } else {
      result.message = 'Todas as variáveis estão configuradas corretamente!';
    }

    console.log('📊 Resultado do debug:', {
      ok: result.summary.ok,
      missing: result.summary.missing,
      invalid: result.summary.invalid
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Erro no debug de environment:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno no debug',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}