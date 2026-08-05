import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { AppNotification, fetchNotifications, markAllRead } from '../lib/notifications';
import { colors, radius, shadow, spacing } from '../lib/theme';
import { ROW, RTL_TEXT } from '../lib/rtl';
import { TKey, useI18n } from '../lib/i18n';
import { EmptyState } from '../components/ui';

/** Icon + tint per notification type. */
const ICONS: Record<string, { icon: React.ComponentProps<typeof Ionicons>['name']; tint: string }> = {
  saved_search: { icon: 'car-sport', tint: colors.accent },
  favorite: { icon: 'heart', tint: colors.danger },
  listing_removed: { icon: 'eye-off', tint: colors.danger },
  video_approved: { icon: 'checkmark-circle', tint: colors.success },
  video_rejected: { icon: 'close-circle', tint: colors.danger },
  general: { icon: 'notifications', tint: colors.accent },
};

export default function Notifications() {
  const { session } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    setItems(await fetchNotifications(session.user.id));
    setLoading(false);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
      if (session) markAllRead(session.user.id).catch(() => {});
    }, [load, session])
  );

  function timeAgo(iso: string): string {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return t('justNow');
    if (diff < 3600) return `${Math.floor(diff / 60)} ${t('minutesAgoShort')}`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ${t('hoursAgoShort')}`;
    return `${Math.floor(diff / 86400)} ${t('daysAgoShort')}`;
  }

  /** Notifications carry the id of what they're about, so tapping opens it. */
  function open(n: AppNotification) {
    const vehicleId = n.payload?.vehicleId;
    if (typeof vehicleId === 'string') router.push(`/vehicle/${vehicleId}`);
  }

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.safe}
      data={items}
      keyExtractor={(n) => n.id}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={
        <EmptyState
          icon="notifications-outline"
          title={t('noNotifications')}
          subtitle={t('noNotificationsSub')}
        />
      }
      renderItem={({ item }) => {
        const meta = ICONS[item.type] ?? ICONS.general;
        const unread = !item.read_at;
        const tappable = typeof item.payload?.vehicleId === 'string';
        return (
          <TouchableOpacity
            activeOpacity={tappable ? 0.7 : 1}
            onPress={() => tappable && open(item)}
            style={[ROW, styles.card, unread && styles.cardUnread]}
          >
            <View style={[styles.iconWrap, { backgroundColor: `${meta.tint}1A` }]}>
              <Ionicons name={meta.icon} size={19} color={meta.tint} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, RTL_TEXT]} numberOfLines={2}>
                {item.title}
              </Text>
              {item.body ? (
                <Text style={[styles.body, RTL_TEXT]} numberOfLines={2}>
                  {item.body}
                </Text>
              ) : null}
              <Text style={[styles.time, RTL_TEXT]}>{timeAgo(item.created_at)}</Text>
            </View>
            {unread && <View style={styles.dot} />}
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  list: { padding: spacing.lg, paddingBottom: spacing.xl },
  card: {
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  cardUnread: { borderWidth: 1.5, borderColor: colors.accentSoft },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 14.5, fontWeight: '800', color: colors.text },
  body: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  time: { fontSize: 11.5, color: colors.textFaint, marginTop: 4 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.accent },
});
