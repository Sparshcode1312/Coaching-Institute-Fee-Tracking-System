import { Request, Response, NextFunction } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin, createScopedSupabaseClient } from '../config/supabase.js';
import { isLiveSupabaseConfigured } from '../config/env.js';
import { AuthenticatedUser } from '../types/index.js';
import { UnauthorizedError } from '../utils/errors.js';

// Extend Express Request declaration
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      scopedSupabase?: SupabaseClient;
    }
  }
}

/**
 * Authentication middleware verifying Supabase JWT.
 * Validates identity, extracts role and centre assignments, and binds user to request.
 */
export const requireAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or malformed Authorization header. Expected Bearer token.');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Token not provided in Authorization header.');
    }

    // Handle Local Test / Simulation Mode when live Supabase credentials are not yet configured
    if (!isLiveSupabaseConfigured()) {
      if (token.startsWith('test-token-')) {
        const parts = token.replace('test-token-', '').split('-');
        const role = parts[0] === 'accounts' ? 'accounts_executive' : parts[0] === 'admin' ? 'super_admin' : 'parent';
        const phone = parts[1] || '9829000000';

        req.user = {
          id: `test-user-${phone}`,
          authUserId: `test-auth-${phone}`,
          phone,
          fullName: `Test ${role}`,
          role,
          assignedCentres: role === 'accounts_executive' ? ['c1111111-1111-1111-1111-111111111111'] : undefined,
        };
        return next();
      }
    }

    // Production Supabase Auth Verification
    const admin = getSupabaseAdmin();
    const { data: authData, error: authError } = await admin.auth.getUser(token);

    if (authError || !authData.user) {
      throw new UnauthorizedError('Invalid or expired authentication token');
    }

    const authUser = authData.user;

    // Fetch profile and role from database
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id, auth_user_id, phone, email, full_name, role, is_active')
      .eq('auth_user_id', authUser.id)
      .single();

    if (profileError || !profile || !profile.is_active) {
      throw new UnauthorizedError('User profile not found or inactive');
    }

    let assignedCentres: string[] | undefined = undefined;

    // If accounts executive, retrieve assigned centre boundaries
    if (profile.role === 'accounts_executive') {
      const { data: execData } = await admin
        .from('accounts_executives')
        .select('assigned_centre_ids')
        .eq('profile_id', profile.id)
        .single();

      assignedCentres = execData?.assigned_centre_ids || [];
    }

    req.user = {
      id: profile.id,
      authUserId: profile.auth_user_id,
      phone: profile.phone,
      email: profile.email || undefined,
      fullName: profile.full_name,
      role: profile.role,
      assignedCentres,
    };

    // Attach RLS-scoped Supabase client for subsequent queries
    req.scopedSupabase = createScopedSupabaseClient(token);

    next();
  } catch (error) {
    next(error);
  }
};

