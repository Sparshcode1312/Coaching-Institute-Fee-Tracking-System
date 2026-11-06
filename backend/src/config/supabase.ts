import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env, isLiveSupabaseConfigured } from './env.js';

let adminClient: SupabaseClient | null = null;
let publicClient: SupabaseClient | null = null;

/**
 * Returns the Supabase Admin client with service_role privileges.
 * CRITICAL: This client bypasses RLS and must NEVER be exposed to clients.
 */
export const getSupabaseAdmin = (): SupabaseClient => {
  if (!adminClient) {
    adminClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return adminClient;
};

/**
 * Returns public Supabase client initialized with the anonymous key.
 */
export const getSupabaseClient = (): SupabaseClient => {
  if (!publicClient) {
    publicClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: false,
      },
    });
  }
  return publicClient;
};

/**
 * Creates a scoped Supabase client authenticated as the specific user.
 * This guarantees that queries adhere strictly to PostgreSQL Row Level Security (RLS) policies.
 */
export const createScopedSupabaseClient = (accessToken: string): SupabaseClient => {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

/**
 * Tests live connection to Supabase and verifies credentials.
 */
export const checkSupabaseConnection = async (): Promise<{
  connected: boolean;
  message: string;
  isConfigured: boolean;
}> => {
  if (!isLiveSupabaseConfigured()) {
    return {
      connected: false,
      isConfigured: false,
      message: 'Supabase credentials are placeholders in .env. Live remote connection not configured.',
    };
  }

  try {
    const admin = getSupabaseAdmin();
    // Probe database with lightweight query
    const { error } = await admin.from('centres').select('id').limit(1);

    if (error) {
      return {
        connected: false,
        isConfigured: true,
        message: `Supabase query failed: ${error.message} (code: ${error.code})`,
      };
    }

    return {
      connected: true,
      isConfigured: true,
      message: 'Successfully connected to Supabase PostgreSQL.',
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      connected: false,
      isConfigured: true,
      message: `Failed to connect to Supabase: ${errorMessage}`,
    };
  }
};

