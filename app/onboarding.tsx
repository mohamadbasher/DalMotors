import React, { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, spacing } from '../lib/theme';
import { useI18n } from '../lib/i18n';

const { width: SCREEN_W } = Dimensions.get('window');
const ONBOARDING_KEY = 'autohub.onboarding.seen';

export default function Onboarding() {
  const { t } = useI18n();
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const slides = [
    { icon: 'car-sport' as const, title: t('onboardTitle1'), body: t('onboardBody1') },
    { icon: 'barcode' as const, title: t('onboardTitle2'), body: t('onboardBody2') },
    { icon: 'notifications' as const, title: t('onboardTitle3'), body: t('onboardBody3') },
  ];

  async function finish() {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/(auth)/sign-in');
  }

  function next() {
    if (index < slides.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1 });
    } else {
      finish();
    }
  }

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W));
  }

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={['#1A2C55', '#0C1B33', '#070D1B']} style={StyleSheet.absoluteFill} />

      <TouchableOpacity style={styles.skipBtn} onPress={finish} hitSlop={8}>
        <Text style={styles.skipText}>{t('onboardSkip')}</Text>
      </TouchableOpacity>

      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width: SCREEN_W }]}>
            <View style={styles.iconTile}>
              <Ionicons name={item.icon} size={48} color={colors.primary} />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <TouchableOpacity style={styles.nextBtn} onPress={next} activeOpacity={0.85}>
          <Text style={styles.nextText}>
            {index === slides.length - 1 ? t('onboardStart') : t('onboardNext')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skipBtn: { position: 'absolute', top: 58, left: spacing.xl, zIndex: 1 },
  skipText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '600' },
  slide: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  iconTile: {
    width: 110,
    height: 110,
    borderRadius: 32,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  body: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 21,
  },
  footer: { position: 'absolute', bottom: spacing.xxl, left: 0, right: 0, alignItems: 'center' },
  dots: { flexDirection: 'row', gap: 6, marginBottom: spacing.lg },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive: { backgroundColor: colors.accent, width: 20 },
  nextBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xxl,
    paddingVertical: 14,
    borderRadius: 999,
  },
  nextText: { color: colors.primary, fontWeight: '800', fontSize: 15 },
});
