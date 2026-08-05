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
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Video } from '../../lib/types';
import { colors, radius, shadow, spacing } from '../../lib/theme';
import { ROW, RTL_TEXT } from '../../lib/rtl';
import { useI18n } from '../../lib/i18n';
import { Badge, Button, EmptyState, ScreenHeader } from '../../components/ui';
import { TopBar } from '../../components/TopBar';

export default function MyVideos() {
  const { store, mode } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchVideos = useCallback(async () => {
    if (!store) return;
    const { data } = await supabase
      .from('videos')
      .select('*, vehicle:vehicles(id, title, price, photos)')
      .eq('store_id', store.id)
      .order('created_at', { ascending: false });
    setVideos((data ?? []) as Video[]);
    setLoading(false);
  }, [store]);

  useFocusEffect(
    useCallback(() => {
      fetchVideos();
    }, [fetchVideos])
  );

  if (mode === 'personal' || !store) return <Redirect href="/(tabs)" />;

  function confirmDelete(video: Video) {
    Alert.alert(t('deleteVideo'), t('deleteConfirmBody'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          await supabase.from('videos').delete().eq('id', video.id);
          fetchVideos();
        },
      },
    ]);
  }

  async function onRefresh() {
    setRefreshing(true);
    await fetchVideos();
    setRefreshing(false);
  }

  return (
    <View style={styles.safe}>
      <TopBar />
      <FlatList
        data={videos}
        keyExtractor={(v) => v.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View>
            <ScreenHeader title={t('myVideosTitle')} subtitle={store.name} />
            <Button
              title={t('uploadVideo')}
              icon="videocam"
              variant="accent"
              onPress={() => router.push('/video-upload')}
              style={{ marginVertical: spacing.md }}
            />
          </View>
        }
        ListEmptyComponent={
          loading ? null : <EmptyState icon="videocam-outline" title={t('noMyVideos')} />
        }
        renderItem={({ item }) => (
          <View style={[ROW, styles.card]}>
            {item.vehicle?.photos?.[0] ? (
              <Image source={{ uri: item.vehicle.photos[0] }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.thumbPlaceholder]}>
                <Ionicons name="videocam" size={20} color={colors.textFaint} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.caption, RTL_TEXT]} numberOfLines={1}>
                {item.caption || item.vehicle?.title || '🎬'}
              </Text>
              {item.status !== 'approved' && (
                <View style={{ alignSelf: 'flex-end', marginTop: 3 }}>
                  <Badge
                    label={item.status === 'pending' ? t('videoPending') : t('videoRejected')}
                    tone={item.status === 'pending' ? 'accent' : 'danger'}
                  />
                </View>
              )}
              <View style={[ROW, { alignItems: 'center', gap: 4, marginTop: 4 }]}>
                <Ionicons name="heart" size={13} color="#FF3B5C" />
                <Text style={styles.meta}>{item.like_count}</Text>
                <Text style={styles.meta}>
                  {' · '}
                  {new Date(item.created_at).toLocaleDateString('he-IL')}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => confirmDelete(item)} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={19} color={colors.danger} />
            </TouchableOpacity>
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
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  thumb: { width: 52, height: 52, borderRadius: radius.sm },
  thumbPlaceholder: {
    backgroundColor: colors.chipBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: { fontSize: 14, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
