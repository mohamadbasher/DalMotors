import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Report } from '../lib/types';
import { colors, radius, shadow, spacing } from '../lib/theme';
import { ROW, RTL_TEXT } from '../lib/rtl';
import { TKey, useI18n } from '../lib/i18n';
import { Badge, Button, Chip, EmptyState } from '../components/ui';

const REASON_LABELS: Record<string, TKey> = {
  scam: 'reportScam',
  wrong_info: 'reportWrongInfo',
  already_sold: 'reportSold',
  offensive: 'reportOffensive',
  other: 'reportOther',
};

export default function AdminReports() {
  const { isAdmin } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [showResolved, setShowResolved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('reports')
      .select(
        '*, vehicle:vehicles(id, title, photos), reporter:profiles!reports_reporter_id_fkey(full_name, phone)'
      )
      .eq('status', showResolved ? 'resolved' : 'open')
      .order('created_at', { ascending: false })
      .limit(100);
    setReports((data ?? []) as Report[]);
    setLoading(false);
  }, [showResolved]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!isAdmin) return <Redirect href="/(tabs)" />;

  async function resolve(report: Report) {
    const { error } = await supabase
      .from('reports')
      .update({ status: 'resolved' })
      .eq('id', report.id);
    if (error) Alert.alert(t('error'), error.message);
    else load();
  }

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <View style={styles.safe}>
      <FlatList
        data={reports}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View style={[ROW, { gap: 6, marginBottom: spacing.md }]}>
            <Chip
              label={t('openReports')}
              selected={!showResolved}
              onPress={() => setShowResolved(false)}
            />
            <Chip
              label={t('resolveReport')}
              selected={showResolved}
              onPress={() => setShowResolved(true)}
            />
          </View>
        }
        ListEmptyComponent={
          loading ? null : <EmptyState icon="flag-outline" title={t('noReports')} />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <TouchableOpacity
              style={[ROW, styles.head]}
              onPress={() => item.vehicle && router.push(`/vehicle/${item.vehicle.id}`)}
              activeOpacity={item.vehicle ? 0.7 : 1}
            >
              {item.vehicle?.photos?.[0] ? (
                <Image source={{ uri: item.vehicle.photos[0] }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbEmpty]}>
                  <Ionicons name="car-sport" size={18} color={colors.textFaint} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, RTL_TEXT]} numberOfLines={1}>
                  {item.vehicle?.title ?? '—'}
                </Text>
                <Text style={[styles.sub, RTL_TEXT]} numberOfLines={1}>
                  {item.reporter?.full_name ?? '—'} · {item.reporter?.phone ?? ''}
                </Text>
              </View>
              <Badge
                label={t(REASON_LABELS[item.reason] ?? 'reportOther')}
                tone={item.reason === 'scam' ? 'danger' : 'neutral'}
              />
            </TouchableOpacity>

            {item.note ? <Text style={[styles.note, RTL_TEXT]}>{item.note}</Text> : null}

            {item.status === 'open' && (
              <View style={[ROW, { marginTop: spacing.md }]}>
                <Button
                  title={t('resolveReport')}
                  small
                  variant="outline"
                  icon="checkmark-done"
                  onPress={() => resolve(item)}
                />
              </View>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  head: { alignItems: 'center', gap: spacing.md },
  thumb: { width: 46, height: 46, borderRadius: radius.sm },
  thumbEmpty: { backgroundColor: colors.chipBg, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14.5, fontWeight: '800', color: colors.text },
  sub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  note: {
    fontSize: 12.5,
    color: colors.textMuted,
    marginTop: spacing.sm,
    lineHeight: 18,
    backgroundColor: colors.chipBg,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
});
