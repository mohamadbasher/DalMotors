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
import { Redirect, useFocusEffect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Video } from '../lib/types';
import { colors, radius, shadow, spacing } from '../lib/theme';
import { ROW, RTL_TEXT } from '../lib/rtl';
import { useI18n } from '../lib/i18n';
import { EmptyState } from '../components/ui';

export default function AdminVideos() {
  const { isAdmin } = useAuth();
  const { t } = useI18n();
  const [videos, setVideos] = useState<Video[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchVideos = useCallback(async () => {
    const { data } = await supabase
      .from('videos')
      .select('*, store:stores(id, name), vehicle:vehicles(id, title, price, photos)')
      .order('created_at', { ascending: false });
    setVideos((data ?? []) as Video[]);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchVideos();
    }, [fetchVideos])
  );

  if (!isAdmin) return <Redirect href="/(tabs)" />;

  function handleDelete(video: Video) {
    Alert.alert(t('deleteVideo'), t('deleteConfirmBody'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('videos').delete().eq('id', video.id);
          if (error) Alert.alert(t('error'), error.message);
          else fetchVideos();
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
      <FlatList
        data={videos}
        keyExtractor={(v) => v.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          loading ? null : <EmptyState icon="videocam-outline" title={t('videosEmpty')} />
        }
        renderItem={({ item: video }) => (
          <View style={[ROW, styles.card]}>
            {video.vehicle?.photos?.[0] ? (
              <Image source={{ uri: video.vehicle.photos[0] }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.thumbPlaceholder]}>
                <Ionicons name="videocam" size={18} color={colors.textFaint} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.caption, RTL_TEXT]} numberOfLines={1}>
                {video.caption || video.vehicle?.title || '🎬'}
              </Text>
              <View style={[ROW, { alignItems: 'center', gap: 4, marginTop: 3 }]}>
                <Ionicons name="storefront-outline" size={12} color={colors.textMuted} />
                <Text style={styles.meta}>{video.store?.name ?? '—'}</Text>
                <Ionicons name="heart" size={12} color="#FF3B5C" style={{ marginRight: 6 }} />
                <Text style={styles.meta}>{video.like_count}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => handleDelete(video)} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  thumb: { width: 50, height: 50, borderRadius: radius.sm },
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
