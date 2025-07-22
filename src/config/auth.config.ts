// src/config/auth.config.ts
export interface AuthConfig {
  supabaseUrl: string | undefined;
  supabaseAnonKey: string | undefined;
  isConfigured: boolean;
  isDevelopment: boolean;
}

export const authConfig: AuthConfig = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  isDevelopment: process.env.NODE_ENV === 'development',
  get isConfigured() {
    return !!(
      this.supabaseUrl && 
      this.supabaseAnonKey && 
      !this.supabaseUrl.includes('your_') && 
      !this.supabaseAnonKey.includes('your_')
    );
  }
};

export const validateAuthConfig = (): void => {
  if (!authConfig.isConfigured) {
    const missing = [];
    if (!authConfig.supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!authConfig.supabaseAnonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env.local file and ensure all Supabase variables are set.'
    );
  }
};

export const getSupabaseConfig = () => ({
  url: authConfig.supabaseUrl!,
  anonKey: authConfig.supabaseAnonKey!
});