import { supabase, isSupabaseConfigured } from './supabase';
import { AppUser } from './types';

/**
 * Maps a Supabase user object to the uniform AppUser interface used by the frontend.
 * Always utilizes Supabase auth.users.id (UUID) as the primary identity.
 */
export function mapSupabaseUser(sbUser: any): AppUser | null {
  if (!sbUser) return null;
  const meta = sbUser.user_metadata || {};
  return {
    id: sbUser.id,
    uid: sbUser.id,
    email: sbUser.email || null,
    displayName: meta.full_name || meta.name || sbUser.email?.split('@')[0] || 'Pengguna',
    photoURL: meta.avatar_url || meta.picture || null,
  };
}

/**
 * Helper to translate Supabase Auth error messages into friendly Indonesian messages
 */
export function formatAuthError(error: any): string {
  if (!error) return 'Terjadi kesalahan autentikasi.';
  const msg = (error.message || '').toLowerCase();

  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
    return 'Email atau password salah. Silakan periksa kembali.';
  }
  if (msg.includes('user already registered') || msg.includes('already exists')) {
    return 'Email ini sudah terdaftar. Silakan login atau gunakan menu Lupa Password.';
  }
  if (msg.includes('password should be at least')) {
    return 'Password minimal harus terdiri dari 6 karakter.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Email Anda belum dikonfirmasi. Harap periksa inbox/spam email Anda untuk verifikasi.';
  }
  if (msg.includes('over_email_send_rate_limit') || msg.includes('rate limit')) {
    return 'Terlalu banyak permintaan. Silakan tunggu beberapa saat sebelum mencoba kembali.';
  }
  if (msg.includes('network') || msg.includes('failed to fetch')) {
    return 'Gagal terhubung ke server Supabase. Periksa koneksi internet Anda.';
  }

  return error.message || 'Terjadi kesalahan saat memproses permintaan autentikasi.';
}

/**
 * Sign in with Email and Password
 */
export const loginWithEmail = async (email: string, password: string): Promise<AppUser> => {
  if (!isSupabaseConfigured()) {
    const cleanEmail = email.trim();
    return {
      id: cleanEmail.toLowerCase(),
      uid: cleanEmail.toLowerCase(),
      email: cleanEmail,
      displayName: cleanEmail.split('@')[0] || 'Pengguna',
      photoURL: null,
    };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    console.error('[Supabase Auth] Login error:', error);
    throw new Error(formatAuthError(error));
  }

  if (!data.user) {
    throw new Error('Gagal mendapatkan informasi pengguna dari Supabase.');
  }

  const appUser = mapSupabaseUser(data.user);
  if (!appUser) {
    throw new Error('Gagal memetakan profil pengguna.');
  }

  return appUser;
};

/**
 * Register / Sign up with Email and Password
 */
export const registerWithEmail = async (
  email: string,
  password: string
): Promise<{ user: AppUser | null; requiresEmailConfirmation: boolean }> => {
  if (!isSupabaseConfigured()) {
    throw new Error('CONFIG_MISSING: Supabase belum dikonfigurasi. Harap sediakan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.');
  }

  const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      emailRedirectTo: redirectTo,
    },
  });

  if (error) {
    console.error('[Supabase Auth] Register error:', error);
    throw new Error(formatAuthError(error));
  }

  // If session is null but user exists, email confirmation is enabled on Supabase
  const requiresEmailConfirmation = Boolean(data.user && !data.session);
  const appUser = data.user ? mapSupabaseUser(data.user) : null;

  return {
    user: appUser,
    requiresEmailConfirmation,
  };
};

/**
 * Request password reset email
 */
export const requestPasswordReset = async (email: string): Promise<void> => {
  if (!isSupabaseConfigured()) {
    throw new Error('CONFIG_MISSING: Supabase belum dikonfigurasi.');
  }

  const redirectTo = typeof window !== 'undefined'
    ? `${window.location.origin}?reset_password=true`
    : undefined;

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo,
  });

  if (error) {
    console.error('[Supabase Auth] Password reset request error:', error);
    throw new Error(formatAuthError(error));
  }
};

/**
 * Update password (used during password reset flow with active recovery session)
 */
export const updateNewPassword = async (newPassword: string): Promise<void> => {
  if (!isSupabaseConfigured()) {
    throw new Error('CONFIG_MISSING: Supabase belum dikonfigurasi.');
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    console.error('[Supabase Auth] Update password error:', error);
    throw new Error(formatAuthError(error));
  }
};

/**
 * Sign out current session from Supabase
 */
export const logout = async (): Promise<void> => {
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('[Supabase Auth] Sign out error:', error.message);
    throw error;
  }
};

/**
 * Get current session user
 */
export const getCurrentUser = async (): Promise<AppUser | null> => {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return mapSupabaseUser(user);
  } catch (err) {
    console.error('[Supabase Auth] Failed to get current user:', err);
    return null;
  }
};

/**
 * Initialize Supabase Auth listener
 */
export const initAuth = (
  onAuthChange: (user: AppUser | null) => void,
  onPasswordRecovery?: () => void
): (() => void) => {
  if (!isSupabaseConfigured()) {
    onAuthChange(null);
    return () => {};
  }

  // Check URL query parameters or hash for password recovery
  if (typeof window !== 'undefined') {
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    const isRecovery =
      hash.includes('type=recovery') ||
      search.includes('type=recovery') ||
      search.includes('reset_password=true');

    if (isRecovery && onPasswordRecovery) {
      setTimeout(() => onPasswordRecovery(), 300);
    }
  }

  // Check initial active session
  supabase.auth.getSession().then(({ data: { session }, error }) => {
    if (error) {
      console.error('[Supabase Auth] Error getting session:', error);
      onAuthChange(null);
      return;
    }
    onAuthChange(session?.user ? mapSupabaseUser(session.user) : null);
  }).catch((err) => {
    console.error('[Supabase Auth] Unexpected session error:', err);
    onAuthChange(null);
  });

  // Subscribe to auth state changes (login, logout, token refresh, password recovery)
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      if (onPasswordRecovery) {
        onPasswordRecovery();
      }
    }
    onAuthChange(session?.user ? mapSupabaseUser(session.user) : null);
  });

  return () => {
    subscription.unsubscribe();
  };
};
