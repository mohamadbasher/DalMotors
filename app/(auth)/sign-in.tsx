import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { isValidPhone, useAuth } from '../../context/AuthContext';
import { AuthInput } from '../../components/AuthInput';
import { Button } from '../../components/ui';
import { colors, radius, spacing } from '../../lib/theme';
import { ROW, RTL_TEXT } from '../../lib/rtl';
import { LANG_NAMES, useI18n } from '../../lib/i18n';
import { isSupabaseConfigured } from '../../lib/supabase';

export default function SignIn() {
  const { signIn } = useAuth();
  const { t, lang, toggleLang } = useI18n();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    if (!phone.trim() || !password) {
      Alert.alert(t('missingInfo'), t('fillPhonePassword'));
      return;
    }
    if (!phone.includes('@') && !isValidPhone(phone)) {
      Alert.alert(t('error'), t('invalidPhone'));
      return;
    }
    if (!isSupabaseConfigured) {
      Alert.alert(t('setupNeeded'), t('setupNeededBody'));
      return;
    }
    setLoading(true);
    const { error } = await signIn(phone, password);
    setLoading(false);
    if (error) Alert.alert(t('signInFailed'), error);
    else router.replace('/(tabs)');
  }

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={['#1A2C55', '#0C1B33', '#070D1B']}
        style={StyleSheet.absoluteFill}
      />
      {/* ambient glow */}
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* language toggle */}
          <TouchableOpacity style={styles.langBtn} onPress={toggleLang} activeOpacity={0.7}>
            <Ionicons name="language" size={14} color="#FFFFFF" />
            <Text style={styles.langText}>{LANG_NAMES[lang]}</Text>
          </TouchableOpacity>

          {/* brand */}
          <View style={styles.hero}>
            <View style={styles.logoTile}>
              <Ionicons name="car-sport" size={38} color={colors.primary} />
            </View>
            <Text style={styles.brand}>
              Auto<Text style={{ color: colors.accent }}>Hub</Text>
            </Text>
            <Text style={styles.tagline}>{t('tagline')}</Text>
          </View>

          {/* card */}
          <View style={styles.card}>
            <Text style={[styles.title, RTL_TEXT]}>{t('signInTitle')}</Text>
            <Text style={[styles.subtitle, RTL_TEXT]}>{t('signInSub')}</Text>

            <AuthInput
              icon="call-outline"
              value={phone}
              onChangeText={setPhone}
              placeholder={t('phoneNumber')}
              keyboardType="phone-pad"
              autoComplete="tel"
            />
            <AuthInput
              icon="lock-closed-outline"
              value={password}
              onChangeText={setPassword}
              placeholder={t('password')}
              isPassword
            />

            <Button
              title={t('signIn')}
              variant="accent"
              onPress={handleSignIn}
              loading={loading}
              style={{ marginTop: 6, height: 54, borderRadius: radius.lg }}
            />

            <Link href="/forgot-password" asChild>
              <TouchableOpacity hitSlop={8} style={{ alignSelf: 'center', marginTop: spacing.md }}>
                <Text style={styles.forgotText}>{t('forgotPassword')}</Text>
              </TouchableOpacity>
            </Link>

            <View style={[ROW, styles.switchRow]}>
              <Text style={styles.switchText}>{t('noAccount')} </Text>
              <Link href="/(auth)/sign-up" asChild>
                <TouchableOpacity hitSlop={8}>
                  <Text style={styles.link}>{t('signUp')}</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  glowTop: {
    position: 'absolute',
    top: -120,
    right: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: colors.accent,
    opacity: 0.13,
  },
  glowBottom: {
    position: 'absolute',
    bottom: -140,
    left: -120,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#3B5BA5',
    opacity: 0.18,
  },
  langBtn: {
    position: 'absolute',
    top: 58,
    left: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  langText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  hero: { alignItems: 'center', marginBottom: spacing.xl },
  logoTile: {
    width: 84,
    height: 84,
    borderRadius: 26,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 12,
  },
  brand: { color: '#FFFFFF', fontSize: 34, fontWeight: '800', letterSpacing: 0.5 },
  tagline: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 32,
    elevation: 16,
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: 4, marginBottom: spacing.lg },
  forgotText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  switchRow: { justifyContent: 'center', marginTop: spacing.lg },
  switchText: { color: colors.textMuted, fontSize: 14 },
  link: { color: '#B45309', fontWeight: '800', fontSize: 14 },
});
