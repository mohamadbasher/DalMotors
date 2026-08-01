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
import { colors, radius, shadow, spacing } from '../../lib/theme';
import { ROW, RTL_TEXT } from '../../lib/rtl';
import { useI18n } from '../../lib/i18n';
import { TopBar } from '../../components/TopBar';

interface Counts {
  users: number;
  stores: number;
  active: number;
  sold: number;
  videos: number;
  cities: number;
}

export default function AdminDashboard() {
  const { mode, isAdmin } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [counts, setCounts] = useState<Counts>({
    users: 0,
    stores: 0,
    active: 0,
    sold: 0,
    videos: 0,
    cities: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  const head = { count: 'exact' as const, head: true };

  const fetchCounts = useCallback(async () => {
    const [users, stores, active, sold, videos, cities] = await Promise.all([
      supabase.from('profiles').select('id', head),
      supabase.from('stores').select('id', head),
      supabase.from('vehicles').select('id', head).eq('status', 'active'),
      supabase.from('vehicles').select('id', head).eq('status', 'sold'),
      supabase.from('videos').select('id', head),
      supabase.from('cities').select('id', head),
    ]);
    setCounts({
      users: users.count ?? 0,
      stores: stores.count ?? 0,
      active: active.count ?? 0,
      sold: sold.count ?? 0,
      videos: videos.count ?? 0,
      cities: cities.count ?? 0,
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchCounts();
    }, [fetchCounts])
  );

  if (mode !== 'admin' || !isAdmin) return <Redirect href="/(tabs)" />;

  async function onRefresh() {
    setRefreshing(true);
    await fetchCounts();
    setRefreshing(false);
  }

  return (
    <View style={styles.safe}>
      <TopBar />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={[styles.title, RTL_TEXT]}>{t('adminDashboard')}</Text>

        <View style={[ROW, styles.statsRow]}>
          <Stat icon="people" label={t('users')} value={counts.users} />
          <Stat icon="storefront" label={t('dealers')} value={counts.stores} />
        </View>
        <View style={[ROW, styles.statsRow]}>
          <Stat icon="car-sport" label={t('activeListings')} value={counts.active} />
          <Stat icon="checkmark-done" label={t('sold')} value={counts.sold} />
        </View>
        <View style={[ROW, styles.statsRow]}>
          <Stat icon="videocam" label={t('statVideos')} value={counts.videos} />
          <Stat icon="location" label={t('manageCities')} value={counts.cities} />
        </View>

        <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
          <Action
            icon="pricetags"
            label={t('manageBrands')}
            onPress={() => router.push('/admin-brands')}
          />
          <Action
            icon="location"
            label={t('manageCities')}
            onPress={() => router.push('/admin-cities')}
          />
          <Action
            icon="videocam"
            label={t('manageVideos')}
            onPress={() => router.push('/admin-videos')}
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
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: number;
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
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function Action({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[ROW, styles.action]} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={19} color={colors.primary} />
      </View>
      <Text style={[styles.actionText, RTL_TEXT]}>{label}</Text>
      <Ionicons name="chevron-back" size={18} color={colors.textFaint} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: spacing.lg },
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
  statLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11.5, fontWeight: '600' },
  action: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.card,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { flex: 1, fontSize: 15.5, fontWeight: '800', color: colors.text },
});
