import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile, Store } from '../lib/types';
import { registerForPushNotifications } from '../lib/notifications';

/** 'personal' = normal experience; 'store' = dealer dashboard; 'admin' = management. */
export type AccountMode = 'personal' | 'store' | 'admin';
const MODE_KEY = 'autohub.mode';

/**
 * Phone-first auth: the login identifier is a phone number, mapped to a
 * synthetic email under the hood (Supabase email auth, no SMS costs).
 * Inputs containing "@" are treated as real emails (back-compat).
 */
export function phoneToEmail(input: string): string {
  const trimmed = input.trim();
  if (trimmed.includes('@')) return trimmed;
  return `${trimmed.replace(/\D/g, '')}@phone.autohub.app`;
}

export function isValidPhone(input: string): boolean {
  const digits = input.replace(/\D/g, '');
  return digits.length >= 9 && digits.length <= 15;
}

interface SignUpParams {
  phone: string;
  password: string;
  fullName: string;
  city: string;
}

interface BecomeDealerParams {
  storeName: string;
  city: string;
  phone: string;
  description: string;
}

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  store: Store | null; // the user's own store (dealers only)
  mode: AccountMode;
  loading: boolean;
  isDealer: boolean;
  isAdmin: boolean;
  signIn: (phoneOrEmail: string, password: string) => Promise<{ error: string | null }>;
  signUp: (params: SignUpParams) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  becomeDealer: (params: BecomeDealerParams) => Promise<{ error: string | null }>;
  setMode: (mode: AccountMode) => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [mode, setModeState] = useState<AccountMode>('personal');
  const [loading, setLoading] = useState(true);

  const loadAccount = useCallback(async (userId: string) => {
    const [{ data: prof }, { data: st }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('stores').select('*').eq('owner_id', userId).maybeSingle(),
    ]);
    if (prof?.is_banned) {
      Alert.alert('החשבון הושעה', 'החשבון שלכם הושעה על ידי מנהל.');
      await supabase.auth.signOut();
      setProfile(null);
      setStore(null);
      return;
    }
    setProfile((prof as Profile) ?? null);
    setStore((st as Store) ?? null);
    if (!st) setModeState('personal'); // no store → force personal mode
    registerForPushNotifications(userId).catch(() => {});
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(MODE_KEY).then((v) => {
      if (v === 'store' || v === 'personal' || v === 'admin') setModeState(v);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadAccount(session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) loadAccount(session.user.id);
      else {
        setProfile(null);
        setStore(null);
        setModeState('personal');
      }
    });
    return () => subscription.unsubscribe();
  }, [loadAccount]);

  const signIn = useCallback(async (phoneOrEmail: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: phoneToEmail(phoneOrEmail),
      password,
    });
    return { error: error ? friendlyAuthError(error.message) : null };
  }, []);

  const signUp = useCallback(async (params: SignUpParams) => {
    const { data, error } = await supabase.auth.signUp({
      email: phoneToEmail(params.phone),
      password: params.password,
      options: {
        data: {
          full_name: params.fullName.trim(),
          phone: params.phone.trim(),
          city: params.city.trim(),
        },
      },
    });
    if (error) return { error: friendlyAuthError(error.message), needsConfirmation: false };
    return { error: null, needsConfirmation: !data.session };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    await AsyncStorage.removeItem(MODE_KEY);
  }, []);

  const becomeDealer = useCallback(
    async (params: BecomeDealerParams) => {
      const { error } = await supabase.rpc('become_dealer', {
        p_store_name: params.storeName.trim(),
        p_city: params.city.trim(),
        p_phone: params.phone.trim(),
        p_description: params.description.trim(),
      });
      if (error) return { error: error.message };
      if (session) await loadAccount(session.user.id);
      setModeState('store');
      AsyncStorage.setItem(MODE_KEY, 'store');
      return { error: null };
    },
    [session, loadAccount]
  );

  const setMode = useCallback((m: AccountMode) => {
    setModeState(m);
    AsyncStorage.setItem(MODE_KEY, m);
  }, []);

  const refresh = useCallback(async () => {
    if (session) await loadAccount(session.user.id);
  }, [session, loadAccount]);

  const value = useMemo(
    () => ({
      session,
      profile,
      store,
      mode:
        mode === 'admin'
          ? profile?.role === 'admin'
            ? mode
            : ('personal' as AccountMode)
          : mode === 'store'
            ? store
              ? mode
              : ('personal' as AccountMode)
            : mode,
      loading,
      isDealer: !!store,
      isAdmin: profile?.role === 'admin',
      signIn,
      signUp,
      signOut,
      becomeDealer,
      setMode,
      refresh,
    }),
    [session, profile, store, mode, loading, signIn, signUp, signOut, becomeDealer, setMode, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function friendlyAuthError(message: string): string {
  if (message.includes('Invalid login credentials')) return 'מספר טלפון או סיסמה שגויים.';
  if (message.includes('Email not confirmed')) return 'החשבון עדיין לא אושר.';
  if (message.includes('already registered')) return 'מספר הטלפון הזה כבר רשום.';
  return message;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
