import React, { useCallback, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { colors, formatPrice, radius, shadow, spacing } from '../../lib/theme';
import { ROW, RTL_TEXT } from '../../lib/rtl';
import { useI18n } from '../../lib/i18n';
import { TopBar } from '../../components/TopBar';

interface Stats {
  active: number;
  sold: number;
  videos: number;
  totalValue: number;
}

export default function Dashboard() {
  const { store, mode } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({ active: 0, sold: 0, videos: 0, totalValue: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!store) return;
    const [vehiclesRes, videosRes] = await Promise.all([
      supabase.from('vehicles').select('status, price').eq('store_id', store.id),
      supabase.from('videos').select('id', { count: 'exact', head: true }).eq('store_id', store.id),
    ]);
    const rows = (vehiclesRes.data ?? []) as { status: string; price: number }[];
    setStats({
      active: rows.filter((r) => r.status === 'active').length,
      sold: rows.filter((r) => r.status === 'sold').length,
      videos: videosRes.count ?? 0,
      totalValue: rows.filter((r) => r.status === 'active').reduce((s, r) => s + r.price, 0),
    });
  }, [store]);

  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [fetchStats])
  );

  if (mode === 'personal') return <Redirect href="/(tabs)" />;
  if (!store) return <Redirect href="/(tabs)" />;

  async function onRefresh() {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  }

  return (
    <View style={styles.safe}>
      <TopBar />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={[styles.title, RTL_TEXT]}>{t('dashboardTitle')}</Text>
        <Text style={[styles.storeName, RTL_TEXT]}>{store.name}</Text>

        {/* stats grid */}
        <View style={[ROW, styles.statsRow]}>
          <Stat icon="car-sport" label={t('statActive')} value={String(stats.active)} />
          <Stat icon="checkmark-done" label={t('statSold')} value={String(stats.sold)} />
        </View>
        <View style={[ROW, styles.statsRow]}>
          <Stat icon="videocam" label={t('statVideos')} value={String(stats.videos)} />
          <Stat icon="wallet" label={t('statValue')} value={formatPrice(stats.totalValue)} small />
        </View>

        {/* quick actions */}
        <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
          <BigAction
            icon="add-circle"
            label={t('addVehicle')}
            onPress={() => router.push('/sell')}
          />
          <BigAction
            icon="videocam"
            label={t('addVideo')}
            onPress={() => router.push('/video-upload')}
          />
          <BigAction
            icon="settings-outline"
            label={t('storeSettings')}
            onPress={() => router.push('/edit-store')}
            muted
          />
          <BigAction
            icon="eye-outline"
            label={t('viewMyStore')}
            onPress={() => router.push(`/store/${store.id}`)}
            muted
          />
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({
  icon,
  label,
  value,
  small,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <View style={styles.stat}>
      <LinearGradient
        colors={['#1E335E', '#101C33']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={16} color={colors.accent} />
      </View>
      <Text style={[styles.statValue, small && { fontSize: 15 }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function BigAction({
  icon,
  label,
  onPress,
  muted,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  muted?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[ROW, styles.bigAction, muted && styles.bigActionMuted]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name={icon} size={24} color={muted ? colors.primary : colors.primary} />
      <Text style={[styles.bigActionText, RTL_TEXT]}>{label}</Text>
      <Ionicons name="chevron-back" size={18} color={muted ? colors.textFaint : colors.primary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  storeName: { fontSize: 14, color: colors.textMuted, marginTop: 2, marginBottom: spacing.lg },
  statsRow: { gap: spacing.sm, marginBottom: spacing.sm },
  stat: {
    flex: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: 4,
    overflow: 'hidden',
  },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(245,158,11,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statValue: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  statLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600' },
  bigAction: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.card,
  },
  bigActionMuted: { backgroundColor: colors.surface },
  bigActionText: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.text },
});
