// src/types/database.ts - TIPOS GERADOS AUTOMATICAMENTE DO SUPABASE
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          company_id: string | null
          action: string
          resource: string | null
          details: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          company_id?: string | null
          action: string
          resource?: string | null
          details?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          company_id?: string | null
          action?: string
          resource?: string | null
          details?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      companies: {
        Row: {
          id: string
          name: string
          display_name: string
          slug: string
          active: boolean
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          display_name: string
          slug: string
          active?: boolean
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          display_name?: string
          slug?: string
          active?: boolean
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      tracking_data: {
        Row: {
          id: string
          company_id: string
          asana_task_id: string
          raw_data: Json
          processed_data: Json
          status: string | null
          maritime_status: string | null
          reference: string | null
          last_sync: string
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          asana_task_id: string
          raw_data: Json
          processed_data: Json
          status?: string | null
          maritime_status?: string | null
          reference?: string | null
          last_sync?: string
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          asana_task_id?: string
          raw_data?: Json
          processed_data?: Json
          status?: string | null
          maritime_status?: string | null
          reference?: string | null
          last_sync?: string
          created_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          company_id: string
          email: string
          full_name: string | null
          role: string
          active: boolean
          last_login: string | null
          preferences: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          company_id: string
          email: string
          full_name?: string | null
          role?: string
          active?: boolean
          last_login?: string | null
          preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          email?: string
          full_name?: string | null
          role?: string
          active?: boolean
          last_login?: string | null
          preferences?: Json
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      log_user_action: {
        Args: {
          action_name: string
          resource_name?: string
          action_details?: Json
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ==========================================

// .env.local.example - TEMPLATE DE ENVIRONMENT VARIABLES
/**
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Asana Integration (mantido do sistema atual)
ASANA_ACCESS_TOKEN=your_asana_token_here

# Next.js
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:3000

# Optional: Database Direct Connection (para migrations)
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
 */

// ==========================================

// package.json - DEPENDÊNCIAS ADICIONAIS NECESSÁRIAS
/**
{
  "dependencies": {
    "@supabase/auth-helpers-nextjs": "^0.8.7",
    "@supabase/supabase-js": "^2.39.1",
    "framer-motion": "^12.23.6",
    "lucide-react": "^0.525.0",
    "next": "14.2.5",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "recharts": "^3.1.0"
  },
  "devDependencies": {
    "@types/node": "^20.14.11",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.19",
    "eslint": "^8.57.0",
    "eslint-config-next": "14.2.5",
    "postcss": "^8.4.39",
    "supabase": "^1.142.2",
    "tailwindcss": "^3.4.6",
    "typescript": "^5.5.3"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:generate-types": "supabase gen types typescript --project-id your_project_id --schema public > src/types/database.ts",
    "db:reset": "supabase db reset",
    "db:seed": "supabase db seed"
  }
}
 */

// ==========================================

// supabase/seed.sql - DADOS DE TESTE PARA DESENVOLVIMENTO
/**
-- Seed data para desenvolvimento e testes

-- Criar usuários de teste (executar via Supabase Auth UI ou API)
-- admin@wcb.com / senha123 (WCB - Admin)
-- user@agrivale.com / senha123 (AGRIVALE - Manager)
-- operator@naturally.com / senha123 (NATURALLY - Operator)

-- Inserir perfis de usuário de teste (após criar usuários)
-- INSERT INTO public.user_profiles (id, company_id, email, full_name, role) VALUES
-- (auth_user_id_1, wcb_company_id, 'admin@wcb.com', 'Admin WCB', 'admin'),
-- (auth_user_id_2, agrivale_company_id, 'user@agrivale.com', 'User Agrivale', 'manager'),
-- (auth_user_id_3, naturally_company_id, 'operator@naturally.com', 'Operator Naturally', 'operator');

-- Dados de tracking de exemplo
INSERT INTO public.tracking_data (company_id, asana_task_id, raw_data, processed_data, status, maritime_status, reference) VALUES
(
  (SELECT id FROM public.companies WHERE slug = 'wcb'),
  'task_wcb_001',
  '{"title": "122º WCB Importação Container", "status": "Em Andamento"}',
  '{"title": "122º WCB Importação Container", "exporter": "Global Foods", "product": "Fertilizantes"}',
  'Em Andamento',
  'Rastreio da Carga',
  'WCB-122'
),
(
  (SELECT id FROM public.companies WHERE slug = 'agrivale'),
  'task_agri_001', 
  '{"title": "28º AGRIVALE Exportação", "status": "Finalizado"}',
  '{"title": "28º AGRIVALE Exportação", "exporter": "Agrivale SA", "product": "Soja"}',
  'Finalizado',
  'Entrega',
  'AGRI-028'
);
 */

// ==========================================

// src/lib/auth-admin.ts - FUNÇÕES ADMIN PARA GERENCIAR USUÁRIOS
export async function createUserWithCompany(
  email: string,
  password: string,
  companySlug: string,
  fullName: string,
  role: 'admin' | 'manager' | 'operator' | 'viewer' = 'viewer'
) {
  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('slug', companySlug)
    .single();

  if (!company) throw new Error('Company not found');

  // Criar usuário via Admin API
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      company_slug: companySlug
    }
  });

  if (authError) throw authError;

  // Atualizar perfil com role específica
  const { error: profileError } = await supabase
    .from('user_profiles')
    .update({
      company_id: company.id,
      full_name: fullName,
      role: role
    })
    .eq('id', authData.user.id);

  if (profileError) throw profileError;

  return authData.user;
}

export async function updateUserRole(userId: string, newRole: string) {
  const { error } = await supabase
    .from('user_profiles')
    .update({ role: newRole })
    .eq('id', userId);

  if (error) throw error;
}

export async function deactivateUser(userId: string) {
  const { error } = await supabase
    .from('user_profiles')
    .update({ active: false })
    .eq('id', userId);

  if (error) throw error;
}