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
import { CityPicker } from '../../components/CityPicker';
import { Button } from '../../components/ui';
import { colors, radius, spacing } from '../../lib/theme';
import { ROW, RTL_TEXT } from '../../lib/rtl';
import { useI18n } from '../../lib/i18n';

export default function SignUp() {
  const { signUp } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    if (!fullName.trim() || !phone.trim() || !password) {
      Alert.alert(t('missingInfo'), t('fillNamePhonePassword'));
      return;
    }
    if (!isValidPhone(phone)) {
      Alert.alert(t('error'), t('invalidPhone'));
      return;
    }
    if (!city) {
      Alert.alert(t('missingInfo'), t('chooseCity'));
      return;
    }
    if (password.length < 6) {
      Alert.alert(t('weakPassword'), t('passwordHint'));
      return;
    }
    setLoading(true);
    const { error, needsConfirmation } = await signUp({ phone, password, fullName, city });
    setLoading(false);
    if (error) {
      Alert.alert(t('signUpFailed'), error);
    } else if (needsConfirmation) {
      Alert.alert(t('confirmEmailTitle'), t('confirmEmailBody'), [
        { text: t('ok'), onPress: () => router.replace('/(auth)/sign-in') },
      ]);
    } else {
      router.replace('/(tabs)');
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={['#1A2C55', '#0C1B33', '#070D1B']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glowTop} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* small brand row */}
          <View style={styles.brandRow}>
            <View style={styles.logoTileSm}>
              <Ionicons name="car-sport" size={22} color={colors.primary} />
            </View>
            <Text style={styles.brandSm}>
              Auto<Text style={{ color: colors.accent }}>Hub</Text>
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={[styles.title, RTL_TEXT]}>{t('signUpTitle')}</Text>
            <Text style={[styles.subtitle, RTL_TEXT]}>{t('signUpSub')}</Text>

            <AuthInput
              icon="person-outline"
              value={fullName}
              onChangeText={setFullName}
              placeholder={t('fullName')}
            />
            <AuthInput
              icon="call-outline"
              value={phone}
              onChangeText={setPhone}
              placeholder={t('phoneNumber')}
              keyboardType="phone-pad"
              autoComplete="tel"
            />
            <CityPicker value={city} onChange={setCity} />
            <AuthInput
              icon="lock-closed-outline"
              value={password}
              onChangeText={setPassword}
              placeholder={`${t('password')} (${t('passwordHint')})`}
              isPassword
            />

            <Button
              title={t('createAccount')}
              variant="accent"
              onPress={handleSignUp}
              loading={loading}
              style={{ marginTop: 6, height: 54, borderRadius: radius.lg }}
            />

            <View style={[ROW, styles.switchRow]}>
              <Text style={styles.switchText}>{t('haveAccount')} </Text>
              <Link href="/(auth)/sign-in" asChild>
                <TouchableOpacity hitSlop={8}>
                  <Text style={styles.link}>{t('signIn')}</Text>
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
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: spacing.lg,
  },
  logoTileSm: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandSm: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
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
  switchRow: { justifyContent: 'center', marginTop: spacing.lg },
  switchText: { color: colors.textMuted, fontSize: 14 },
  link: { color: '#B45309', fontWeight: '800', fontSize: 14 },
});
