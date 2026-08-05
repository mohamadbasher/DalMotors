import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useFocusEffect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Video } from '../lib/types';
import { colors, radius, shadow, spacing } from '../lib/theme';
import { ROW, RTL_TEXT } from '../lib/rtl';
import { useI18n } from '../lib/i18n';
import { Button, EmptyState } from '../components/ui';

export default function AdminVideoQueue() {
  const { isAdmin } = useAuth();
  const { t } = useI18n();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('videos')
      .select('*, store:stores(id, name), vehicle:vehicles(id, title, price, photos)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    setVideos((data ?? []) as Video[]);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!isAdmin) return <Redirect href="/(tabs)" />;

  async function decide(video: Video, status: 'approved' | 'rejected') {
    const { error } = await supabase.from('videos').update({ status }).eq('id', video.id);
    if (error) Alert.alert(t('error'), error.message);
    // Drop it from the queue immediately — the DB trigger notifies the dealer.
    else setVideos((prev) => prev.filter((v) => v.id !== video.id));
  }

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <View style={styles.safe}>
      <FlatList
        data={videos}
        keyExtractor={(v) => v.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          loading ? null : <EmptyState icon="checkmark-done-outline" title={t('noPendingVideos')} />
        }
        renderItem={({ item }) => (
          <PendingVideoCard video={item} onDecide={decide} approveLabel={t('approve')} rejectLabel={t('reject')} />
        )}
      />
    </View>
  );
}

function PendingVideoCard({
  video,
  onDecide,
  approveLabel,
  rejectLabel,
}: {
  video: Video;
  onDecide: (v: Video, status: 'approved' | 'rejected') => void;
  approveLabel: string;
  rejectLabel: string;
}) {
  // Muted preview, paused by default — the reviewer taps play via native controls.
  const player = useVideoPlayer(video.url, (p) => {
    p.loop = true;
    p.muted = true;
  });

  return (
    <View style={styles.card}>
      <VideoView player={player} style={styles.video} contentFit="cover" nativeControls />
      <View style={styles.body}>
        <Text style={[styles.caption, RTL_TEXT]} numberOfLines={2}>
          {video.caption || '—'}
        </Text>
        <View style={[ROW, { alignItems: 'center', gap: 4, marginTop: 3 }]}>
          <Ionicons name="storefront-outline" size={12} color={colors.textMuted} />
          <Text style={styles.meta}>{video.store?.name ?? '—'}</Text>
        </View>
        {video.vehicle ? (
          <Text style={[styles.meta, RTL_TEXT, { marginTop: 2 }]} numberOfLines={1}>
            🚗 {video.vehicle.title}
          </Text>
        ) : null}

        <View style={[ROW, styles.actions]}>
          <Button
            title={approveLabel}
            small
            icon="checkmark"
            onPress={() => onDecide(video, 'approved')}
          />
          <Button
            title={rejectLabel}
            small
            variant="danger"
            icon="close"
            onPress={() => onDecide(video, 'rejected')}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    ...shadow.card,
  },
  video: { width: '100%', height: 220, backgroundColor: '#000' },
  body: { padding: spacing.md },
  caption: { fontSize: 14.5, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted },
  actions: { gap: spacing.sm, marginTop: spacing.md },
});
