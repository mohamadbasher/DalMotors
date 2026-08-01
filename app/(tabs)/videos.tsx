import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Video } from '../../lib/types';
import { colors, formatPrice, radius, spacing } from '../../lib/theme';
import { RTL_TEXT } from '../../lib/rtl';
import { useI18n } from '../../lib/i18n';
import { EmptyState } from '../../components/ui';

export default function VideosFeed() {
  const { session, mode } = useAuth();
  const { t } = useI18n();
  const [videos, setVideos] = useState<Video[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [activeIndex, setActiveIndex] = useState(0);
  const [pageHeight, setPageHeight] = useState(0);
  const [loading, setLoading] = useState(true);
  const [focused, setFocused] = useState(false);

  const fetchVideos = useCallback(async () => {
    const { data } = await supabase
      .from('videos')
      .select('*, store:stores(id, name), vehicle:vehicles(id, title, price, photos)')
      .order('created_at', { ascending: false })
      .limit(50);
    const list = (data ?? []) as Video[];
    setVideos(list);
    if (session && list.length) {
      const { data: likes } = await supabase
        .from('video_likes')
        .select('video_id')
        .eq('user_id', session.user.id)
        .in('video_id', list.map((v) => v.id));
      setLikedIds(new Set((likes ?? []).map((l: { video_id: string }) => l.video_id)));
    }
    setLoading(false);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      fetchVideos();
      return () => setFocused(false);
    }, [fetchVideos])
  );

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  const toggleLike = useCallback(
    async (video: Video) => {
      if (!session) return;
      const liked = likedIds.has(video.id);
      // optimistic update
      setLikedIds((prev) => {
        const next = new Set(prev);
        liked ? next.delete(video.id) : next.add(video.id);
        return next;
      });
      setVideos((prev) =>
        prev.map((v) =>
          v.id === video.id ? { ...v, like_count: v.like_count + (liked ? -1 : 1) } : v
        )
      );
      if (liked) {
        await supabase
          .from('video_likes')
          .delete()
          .eq('user_id', session.user.id)
          .eq('video_id', video.id);
      } else {
        await supabase.from('video_likes').insert({ user_id: session.user.id, video_id: video.id });
      }
    },
    [session, likedIds]
  );

  if (mode === 'store') return <Redirect href="/(tabs)/dashboard" />;

  return (
    <View style={styles.safe} onLayout={(e) => setPageHeight(e.nativeEvent.layout.height)}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : videos.length === 0 ? (
        <View style={styles.center}>
          <EmptyState icon="videocam-outline" title={t('videosEmpty')} subtitle={t('videosEmptySub')} />
        </View>
      ) : pageHeight > 0 ? (
        <FlatList
          data={videos}
          keyExtractor={(v) => v.id}
          renderItem={({ item, index }) => (
            <VideoItem
              video={item}
              height={pageHeight}
              active={focused && index === activeIndex}
              liked={likedIds.has(item.id)}
              onToggleLike={() => toggleLike(item)}
            />
          )}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          getItemLayout={(_, index) => ({
            length: pageHeight,
            offset: pageHeight * index,
            index,
          })}
          windowSize={3}
        />
      ) : null}
    </View>
  );
}

function VideoItem({
  video,
  height,
  active,
  liked,
  onToggleLike,
}: {
  video: Video;
  height: number;
  active: boolean;
  liked: boolean;
  onToggleLike: () => void;
}) {
  const router = useRouter();
  const player = useVideoPlayer(video.url, (p) => {
    p.loop = true;
    p.muted = false;
  });

  React.useEffect(() => {
    if (active) player.play();
    else player.pause();
  }, [active, player]);

  return (
    <View style={[styles.page, { height }]}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />

      {/* like column (physical left, like TikTok mirrored for RTL) */}
      <View style={styles.likeCol}>
        <TouchableOpacity onPress={onToggleLike} activeOpacity={0.7} style={styles.likeBtn}>
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={34}
            color={liked ? '#FF3B5C' : '#FFFFFF'}
          />
          <Text style={styles.likeCount}>{video.like_count}</Text>
        </TouchableOpacity>
      </View>

      {/* bottom overlay */}
      <View style={styles.overlay}>
        {video.store && (
          <TouchableOpacity
            onPress={() => router.push(`/store/${video.store!.id}`)}
            activeOpacity={0.8}
            style={styles.storeRow}
          >
            <Text style={[styles.storeName, RTL_TEXT]}>{video.store.name}</Text>
            <View style={styles.storeBadge}>
              <Ionicons name="storefront" size={13} color={colors.primary} />
            </View>
          </TouchableOpacity>
        )}
        {video.caption ? (
          <Text style={[styles.caption, RTL_TEXT]} numberOfLines={2}>
            {video.caption}
          </Text>
        ) : null}
        {video.vehicle && (
          <TouchableOpacity
            style={styles.vehicleCard}
            activeOpacity={0.85}
            onPress={() => router.push(`/vehicle/${video.vehicle!.id}`)}
          >
            {video.vehicle.photos?.[0] ? (
              <Image source={{ uri: video.vehicle.photos[0] }} style={styles.vehicleThumb} />
            ) : (
              <View style={[styles.vehicleThumb, styles.thumbPlaceholder]}>
                <Ionicons name="car-sport" size={18} color={colors.textFaint} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.vehicleTitle, RTL_TEXT]} numberOfLines={1}>
                {video.vehicle.title}
              </Text>
              <Text style={[styles.vehiclePrice, RTL_TEXT]}>
                {formatPrice(video.vehicle.price)}
              </Text>
            </View>
            <Ionicons name="chevron-back" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  page: { width: '100%', backgroundColor: '#000000' },
  likeCol: {
    position: 'absolute',
    left: spacing.md,
    bottom: 140,
  },
  likeBtn: { alignItems: 'center', gap: 2 },
  likeCount: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  storeRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-end',
  },
  storeBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeName: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  caption: { color: 'rgba(255,255,255,0.9)', fontSize: 14 },
  vehicleCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  vehicleThumb: { width: 44, height: 44, borderRadius: radius.sm },
  thumbPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleTitle: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  vehiclePrice: { color: colors.accent, fontWeight: '800', fontSize: 13, marginTop: 1 },
});
