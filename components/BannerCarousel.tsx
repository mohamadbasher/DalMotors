import React, { useEffect, useState } from 'react';
import { Dimensions, Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { supabase } from '../lib/supabase';
import { Banner } from '../lib/types';
import { colors, radius, shadow, spacing } from '../lib/theme';

const CARD_W = Dimensions.get('window').width - spacing.lg * 2;

/**
 * Admin-managed promo strip on the home screen. Renders nothing when there
 * are no active banners, so the feed looks the same as before until an
 * admin adds one.
 */
export function BannerCarousel() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    supabase
      .from('banners')
      .select('*')
      .eq('is_active', true)
      .order('sort', { ascending: true })
      .then(({ data }) => {
        const now = Date.now();
        setBanners(
          ((data ?? []) as Banner[]).filter(
            (b) => !b.expires_at || new Date(b.expires_at).getTime() > now
          )
        );
      });
  }, []);

  if (banners.length === 0) return null;

  return (
    <View style={{ marginBottom: spacing.md }}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) =>
          setIndex(Math.round(e.nativeEvent.contentOffset.x / (CARD_W + spacing.sm)))
        }
        contentContainerStyle={{ flexDirection: 'row-reverse', gap: spacing.sm }}
      >
        {banners.map((b) => (
          <TouchableOpacity
            key={b.id}
            activeOpacity={b.link ? 0.85 : 1}
            onPress={() => b.link && Linking.openURL(b.link).catch(() => {})}
          >
            <Image source={{ uri: b.image_url }} style={styles.image} contentFit="cover" transition={180} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {banners.length > 1 && (
        <View style={styles.dots}>
          {banners.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    width: CARD_W,
    aspectRatio: 5 / 2,
    borderRadius: radius.lg,
    backgroundColor: colors.chipBg,
    ...shadow.card,
  },
  dots: { flexDirection: 'row', gap: 5, alignSelf: 'center', marginTop: spacing.sm },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.accent, width: 16 },
});
