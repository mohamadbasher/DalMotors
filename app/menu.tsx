import React from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { colors, radius, shadow, spacing } from '../lib/theme';
import { ROW, RTL_TEXT } from '../lib/rtl';
import { LANG_NAMES, showLanguagePicker, useI18n } from '../lib/i18n';
import { Badge } from '../components/ui';

// TODO: replace with your real support phone when you have one
const SUPPORT_PHONE = '0500000000';

export default function Menu() {
  const { profile, isDealer, isAdmin } = useAuth();
  const { t, lang, setLang } = useI18n();
  const router = useRouter();

  function contactUs() {
    Alert.alert(t('contactUs'), '', [
      { text: t('contactCall'), onPress: () => Linking.openURL(`tel:${SUPPORT_PHONE}`) },
      {
        text: t('contactWhatsapp'),
        onPress: () =>
          Linking.openURL(`https://wa.me/${SUPPORT_PHONE.replace(/^0/, '972')}`),
      },
      { text: t('cancel'), style: 'cancel' },
    ]);
  }

  const roleLabel = isAdmin ? t('admin') : isDealer ? t('dealer') : t('customer');
  const roleTone = isAdmin ? 'danger' : isDealer ? 'accent' : 'neutral';

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.container}>
      {/* profile header — same look as the profile page */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push('/(tabs)/profile')}
        style={styles.profileCard}
      >
        <LinearGradient
          colors={['#1E335E', '#101C33']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[ROW, { alignItems: 'center', gap: spacing.lg }]}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(profile?.full_name ?? '?').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, RTL_TEXT]}>{profile?.full_name}</Text>
            <Text style={[styles.phone, RTL_TEXT]}>{profile?.phone}</Text>
            <View style={{ marginTop: 6, alignSelf: 'flex-start' }}>
              <Badge label={roleLabel} tone={roleTone as any} />
            </View>
          </View>
          <Ionicons name="chevron-back" size={18} color="rgba(255,255,255,0.5)" />
        </View>
      </TouchableOpacity>

      {/* items */}
      <MenuRow
        icon="settings-outline"
        label={t('settings')}
        onPress={() => router.push('/settings')}
      />
      <MenuRow
        icon="language-outline"
        label={t('language')}
        sub={LANG_NAMES[lang]}
        onPress={() => showLanguagePicker(setLang, t('cancel'))}
      />
      <MenuRow icon="call-outline" label={t('contactUs')} onPress={contactUs} />
      <MenuRow
        icon="document-text-outline"
        label={t('terms')}
        onPress={() => router.push('/legal?type=terms')}
      />
      <MenuRow
        icon="shield-checkmark-outline"
        label={t('privacy')}
        onPress={() => router.push('/legal?type=privacy')}
      />
      <MenuRow
        icon="information-circle-outline"
        label={t('aboutUs')}
        onPress={() => router.push('/legal?type=about')}
      />

      <Text style={styles.version}>
        {t('appVersion')} 1.0.0 · AutoHub
      </Text>
    </ScrollView>
  );
}

function MenuRow({
  icon,
  label,
  sub,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  sub?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[ROW, styles.row]} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={19} color={colors.primary} />
      </View>
      <Text style={[styles.rowLabel, RTL_TEXT]}>{label}</Text>
      {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      <Ionicons name="chevron-back" size={17} color={colors.textFaint} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },
  profileCard: {
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: { width: 58, height: 58, borderRadius: 29 },
  avatarText: { color: colors.accent, fontSize: 24, fontWeight: '800' },
  name: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  phone: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 2 },
  row: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    paddingVertical: 14,
    gap: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.chipBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  rowSub: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  version: {
    textAlign: 'center',
    color: colors.textFaint,
    fontSize: 12,
    marginTop: spacing.xl,
  },
});
