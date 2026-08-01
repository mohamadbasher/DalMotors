import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../lib/theme';
import { RTL_TEXT } from '../../lib/rtl';
import { useI18n } from '../../lib/i18n';
import { Button } from '../../components/ui';

// TODO: replace with your real support number when you have one
const SUPPORT_PHONE = '0500000000';

export default function ForgotPassword() {
  const { t } = useI18n();

  function contactSupport() {
    Linking.openURL(`https://wa.me/${SUPPORT_PHONE.replace(/^0/, '972')}`);
  }

  return (
    <View style={styles.safe}>
      <View style={styles.iconWrap}>
        <Ionicons name="key-outline" size={34} color={colors.accent} />
      </View>
      <Text style={[styles.title, RTL_TEXT]}>{t('forgotPasswordTitle')}</Text>
      <Text style={[styles.body, RTL_TEXT]}>{t('forgotPasswordBody')}</Text>
      <Button
        title={t('contactSupport')}
        icon="logo-whatsapp"
        variant="accent"
        onPress={contactSupport}
        style={{ marginTop: spacing.xl }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl, paddingTop: spacing.xxl },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' },
  body: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: spacing.sm,
  },
});
