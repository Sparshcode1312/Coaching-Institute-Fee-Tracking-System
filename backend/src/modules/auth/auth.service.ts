import { getSupabaseAdmin, getSupabaseClient } from '../../config/supabase.js';
import { isLiveSupabaseConfigured, env } from '../../config/env.js';
import { RequestOtpInput, VerifyOtpInput, StaffLoginInput } from './auth.validator.js';
import { BadRequestError, UnauthorizedError, ForbiddenError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

export interface LinkedStudentSummary {
  studentId: string;
  rollNumber: string;
  fullName: string;
  batchName: string;
  centreName: string;
}

export interface AuthSessionResult {
  token: string;
  user: {
    id: string;
    phone: string;
    fullName: string;
    role: string;
  };
  linkedStudents?: LinkedStudentSummary[];
}

export class AuthService {
  /**
   * Step 1-4: Initiates phone OTP challenge through Supabase Auth
   */
  async requestParentOtp(input: RequestOtpInput): Promise<{
    message: string;
    phone: string;
    expiresInSeconds: number;
  }> {
    const formattedPhone = `+91${input.phone}`;

    // 1. Production Mode with Live Supabase Auth
    if (isLiveSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
        options: {
          channel: 'sms',
        },
      });

      if (error) {
        logger.error(`Supabase Auth OTP dispatch failure: ${error.message}`, { phone: input.phone });
        throw new BadRequestError(`Failed to send OTP: ${error.message}`);
      }

      logger.info('OTP challenge dispatched successfully via Supabase Auth', { phone: input.phone });
    } else {
      // 2. Documented Local Development / Test Mode
      // Never return the OTP secret in response!
      logger.info(
        `[LOCAL DEV] OTP challenge initiated for ${formattedPhone}. (Live Supabase credentials not set)`,
        { phone: input.phone }
      );
    }

    return {
      message: 'OTP challenge initiated successfully. Please enter the 6-digit code received on your mobile.',
      phone: input.phone,
      expiresInSeconds: env.OTP_EXPIRY_SECONDS,
    };
  }

  /**
   * Step 5-9: Submits OTP, establishes identity, and verifies parent-student link
   */
  async verifyParentOtp(input: VerifyOtpInput): Promise<AuthSessionResult> {
    const formattedPhone = `+91${input.phone}`;

    let sessionToken: string;
    let authUserId: string;

    if (isLiveSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: input.otp,
        type: 'sms',
      });

      if (error || !data.session || !data.user) {
        throw new UnauthorizedError('Invalid or expired OTP code.');
      }

      sessionToken = data.session.access_token;
      authUserId = data.user.id;
    } else {
      // Local development test verification (strictly in non-configured dev/test)
      if (input.otp !== '123456' && !input.otp.startsWith('99')) {
        throw new UnauthorizedError('Invalid or expired OTP code.');
      }
      authUserId = `auth-mock-${input.phone}`;
      sessionToken = `test-token-parent-${input.phone}`;
    }

    const admin = getSupabaseAdmin();

    // Look up or establish parent profile
    let profileId: string;
    let parentFullName = 'Parent / Guardian';

    if (isLiveSupabaseConfigured()) {
      const { data: profile } = await admin
        .from('profiles')
        .select('id, full_name, role')
        .eq('phone', input.phone)
        .single();

      if (!profile) {
        // Create initial parent profile on first verified login
        const { data: newProfile, error: createError } = await admin
          .from('profiles')
          .insert({
            auth_user_id: authUserId,
            phone: input.phone,
            full_name: 'Parent / Guardian',
            role: 'parent',
          })
          .select('id, full_name')
          .single();

        if (createError || !newProfile) {
          throw new BadRequestError('Failed to initialize parent profile.');
        }

        profileId = newProfile.id;
        // Also create parent extension record
        await admin.from('parents').insert({ profile_id: profileId });
      } else {
        profileId = profile.id;
        parentFullName = profile.full_name;
      }
    } else {
      profileId = `prof-mock-${input.phone}`;
    }

    // Step 8: Check and resolve verified parent-student relationships
    let linkedStudents: LinkedStudentSummary[] = [];

    if (isLiveSupabaseConfigured()) {
      const { data: relationships } = await admin
        .from('parent_student_relationships')
        .select(`
          student:students (
            id,
            roll_number,
            full_name,
            batch:batches ( name ),
            centre:centres ( name )
          )
        `)
        .eq('parent_id', profileId)
        .eq('verification_status', 'VERIFIED');

      if (relationships && Array.isArray(relationships)) {
        linkedStudents = relationships.map((r: any) => ({
          studentId: r.student.id,
          rollNumber: r.student.roll_number,
          fullName: r.student.full_name,
          batchName: r.student.batch?.name || 'Unassigned Batch',
          centreName: r.student.centre?.name || 'Unassigned Centre',
        }));
      }
    } else {
      // Deterministic dev fixture linked to the 3 assignment students
      if (input.phone.endsWith('0412')) {
        linkedStudents = [
          {
            studentId: 's0412000-0000-0000-0000-000000000412',
            rollNumber: 'STU-0412',
            fullName: 'Aarav Meena',
            batchName: 'JEE 2027 Morning',
            centreName: 'Jaipur Centre 1',
          },
        ];
      } else if (input.phone.endsWith('0587')) {
        linkedStudents = [
          {
            studentId: 's0587000-0000-0000-0000-000000000587',
            rollNumber: 'STU-0587',
            fullName: 'Ishita Sharma',
            batchName: 'JEE 2027 Evening',
            centreName: 'Jaipur Centre 1',
          },
        ];
      } else if (input.phone.endsWith('0219')) {
        linkedStudents = [
          {
            studentId: 's0219000-0000-0000-0000-000000000219',
            rollNumber: 'STU-0219',
            fullName: 'Mohit Gurjar',
            batchName: 'NEET 2027 Morning',
            centreName: 'Jaipur Centre 2',
          },
        ];
      }
    }

    return {
      token: sessionToken,
      user: {
        id: profileId,
        phone: input.phone,
        fullName: parentFullName,
        role: 'parent',
      },
      linkedStudents,
    };
  }

  /**
   * Accounts Executive & Staff Login (Email/Password with server-enforced role verification)
   */
  async staffLogin(input: StaffLoginInput): Promise<AuthSessionResult> {
    if (isLiveSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });

      if (error || !data.session || !data.user) {
        throw new UnauthorizedError('Invalid staff credentials.');
      }

      const admin = getSupabaseAdmin();
      const { data: profile } = await admin
        .from('profiles')
        .select('id, full_name, role, is_active')
        .eq('auth_user_id', data.user.id)
        .single();

      if (!profile || !['accounts_executive', 'super_admin'].includes(profile.role)) {
        throw new ForbiddenError('Access denied: Staff accounts role required.');
      }

      return {
        token: data.session.access_token,
        user: {
          id: profile.id,
          phone: '',
          fullName: profile.full_name,
          role: profile.role,
        },
      };
    } else {
      // Local development test verification for staff
      if (input.email === 'accounts@companya.in' && input.password === 'CompanyA@2026') {
        return {
          token: 'test-token-accounts-staff',
          user: {
            id: 'prof-mock-accounts-exec',
            phone: '9829099999',
            fullName: 'Senior Accounts Officer',
            role: 'accounts_executive',
          },
        };
      }
      throw new UnauthorizedError('Invalid staff credentials.');
    }
  }
}

export const authService = new AuthService();

