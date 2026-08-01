import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Store } from '../lib/types';
import { colors, radius, shadow, spacing } from '../lib/theme';
import { ROW, RTL_TEXT } from '../lib/rtl';
import { useI18n } from '../lib/i18n';

export function StoreCard({ store, distanceKm }: { store: Store; distanceKm?: number }) {
  const router = useRouter();
  const { t } = useI18n();
  const count = store.vehicles?.[0]?.count ?? 0;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.card, ROW]}
      onPress={() => router.push(`/store/${store.id}`)}
    >
      <View style={styles.logo}>
        <Text style={styles.logoText}>{store.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={[ROW, { alignItems: 'center', gap: 5 }]}>
          <Text style={[styles.name, RTL_TEXT]} numberOfLines={1}>
            {store.name}
          </Text>
          {store.is_verified && (
            <Ionicons name="checkmark-circle" size={15} color={colors.accent} />
          )}
        </View>
        <Text style={[styles.meta, RTL_TEXT]} numberOfLines={1}>
          {store.city ? `${store.city} · ` : ''}
          {count} {t('vehiclesCount')}
          {store.rating_count > 0 ? ` · ★ ${store.rating_avg}` : ''}
          {distanceKm != null ? ` · ${distanceKm.toFixed(1)} ${t('kmAway')}` : ''}
        </Text>
        {store.description ? (
          <Text style={[styles.desc, RTL_TEXT]} numberOfLines={2}>
            {store.description}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-back" size={20} color={colors.textFaint} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
    ...shadow.card,
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: colors.accent, fontSize: 22, fontWeight: '800' },
  name: { fontSize: 16, fontWeight: '800', color: colors.text },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  desc: { fontSize: 12, color: colors.textFaint, marginTop: 4 },
});
