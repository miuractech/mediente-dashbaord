import supabase from '../supabase';
import type { AdminUser, LoginCredentials, LoginResponse, PasswordResetResponse, ResetPasswordData } from './auth';

interface CustomClaims {
  user_role: string | null;
  department_id: string | null;
  project_id: string | null;
}

class AuthService {
  // Helper method to decode JWT and extract custom claims
  private decodeJWTCustomClaims(accessToken: string): CustomClaims | null {
    try {
      const base64Url = accessToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(jsonPayload);
      
      return {
        user_role: payload.user_role || null,
        department_id: payload.department_id || null,
        project_id: payload.project_id || null
      };
    } catch (error) {
      console.error('Error decoding JWT:', error);
      return null;
    }
  }
  // Admin login with email and password
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      // Authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (authError) {
        return {
          user: null,
          session: null,
          error: authError.message
        };
      }

      // Check custom claims for user role from JWT token
      const user = authData.user;
      const session = authData.session;
      
      if (!session?.access_token) {
        await supabase.auth.signOut();
        return {
          user: null,
          session: null,
          error: 'No access token found.'
        };
      }

      // Decode JWT to get custom claims
      const customClaims = this.decodeJWTCustomClaims(session.access_token);
      
      if (!customClaims) {
        await supabase.auth.signOut();
        return {
          user: null,
          session: null,
          error: 'Invalid access token.'
        };
      }
      
      const { user_role: userRole, department_id: departmentId, project_id: projectId } = customClaims;
      
      if (!userRole || (userRole !== 'admin' && userRole !== 'super_admin')) {
        // Sign out the user if they don't have admin role
        await supabase.auth.signOut();
        return {
          user: null,
          session: null,
          error: 'Admin access only. Unauthorized user.'
        };
      }

      // Create AdminUser object from auth user and custom claims
      const adminUser: AdminUser = {
        id: user.id,
        email: user.email!,
        name: user.user_metadata?.name || user.email!,
        role: userRole as 'admin' | 'super_admin',
        is_active: true,
        department_id: departmentId,
        project_id: projectId,
        last_login_at: new Date().toISOString(),
        created_at: user.created_at,
        updated_at: user.updated_at || user.created_at
      };

      return {
        user: adminUser,
        session: authData.session,
        error: undefined
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        user: null,
        session: null,
        error: 'An unexpected error occurred during login'
      };
    }
  }

  // Logout admin user
  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error);
      throw new Error(error.message);
    }
  }

  // Get current admin user session
  async getCurrentUser(): Promise<AdminUser | null> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (userError || sessionError || !user || !session?.access_token) {
        return null;
      }

      // Decode JWT to get custom claims
      const customClaims = this.decodeJWTCustomClaims(session.access_token);
      
      if (!customClaims) {
        return null;
      }
      
      const { user_role: userRole, department_id: departmentId, project_id: projectId } = customClaims;
      
      if (!userRole || (userRole !== 'admin' && userRole !== 'super_admin')) {
        return null;
      }

      // Create AdminUser object from auth user and custom claims
      const adminUser: AdminUser = {
        id: user.id,
        email: user.email!,
        name: user.user_metadata?.name || user.email!,
        role: userRole as 'admin' | 'super_admin',
        is_active: true,
        department_id: departmentId,
        project_id: projectId,
        last_login_at: user.last_sign_in_at || user.created_at,
        created_at: user.created_at,
        updated_at: user.updated_at || user.created_at
      };

      return adminUser;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  // Reset password
  async resetPassword(data: ResetPasswordData): Promise<PasswordResetResponse> {
    try {
      // Send password reset email directly - user validation will happen through custom claims
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/admin/reset-password`,
      });

      if (error) {
        return {
          success: false,
          message: 'Failed to send reset email',
          error: error.message
        };
      }

      return {
        success: true,
        message: 'Password reset link has been sent to your email'
      };
    } catch (error) {
      console.error('Reset password error:', error);
      return {
        success: false,
        message: 'An unexpected error occurred',
        error: 'Unexpected error'
      };
    }
  }

  // Log failed login attempt
  async logFailedAttempt(email: string, ipAddress?: string): Promise<void> {
    try {
      await supabase
        .from('login_attempts')
        .insert({
          email,
          ip_address: ipAddress || 'unknown',
          success: false,
          attempted_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to log login attempt:', error);
    }
  }

  // Check failed login attempts count
  async getFailedAttemptsCount(email: string): Promise<number> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('login_attempts')
        .select('id')
        .eq('email', email)
        .eq('success', false)
        .gte('attempted_at', oneHourAgo);

      if (error) {
        console.error('Failed to get login attempts:', error);
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Failed to get login attempts count:', error);
      return 0;
    }
  }
}

export default new AuthService();