import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Vehicle } from '../lib/types';
import { colors, formatPrice, radius, shadow, spacing } from '../lib/theme';
import { ROW, RTL_TEXT } from '../lib/rtl';
import { useI18n } from '../lib/i18n';
import { Badge } from './ui';

export function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  const router = useRouter();
  const { t } = useI18n();
  const photo = vehicle.photos?.[0];

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.card}
      onPress={() => router.push(`/vehicle/${vehicle.id}`)}
    >
      {/* image with gradient + price overlay */}
      <View>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.image} contentFit="cover" transition={200} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons name="car-sport-outline" size={46} color={colors.textFaint} />
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(5,12,28,0.82)']}
          style={styles.imageFade}
        />
        <Text style={styles.priceOnImage}>{formatPrice(vehicle.price)}</Text>

        {vehicle.condition === 'new' && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>{t('brandNew')}</Text>
          </View>
        )}
        <View style={styles.topLeftBadges}>
          {vehicle.is_featured && (
            <View style={styles.featuredChip}>
              <Ionicons name="star" size={10} color={colors.primary} />
              <Text style={styles.featuredChipText}>{t('featured')}</Text>
            </View>
          )}
          {vehicle.status === 'sold' && <Badge label={t('sold')} tone="danger" />}
        </View>
      </View>

      {/* body */}
      <View style={styles.body}>
        <Text style={[styles.title, RTL_TEXT]} numberOfLines={1}>
          {vehicle.title}
        </Text>

        {/* icon spec row */}
        <View style={[ROW, styles.specRow]}>
          <SpecChip icon="calendar-outline" text={String(vehicle.year)} />
          <SpecChip icon="speedometer-outline" text={`${(vehicle.mileage / 1000).toFixed(0)}K ק״מ`} />
          <SpecChip
            icon="cog-outline"
            text={vehicle.transmission === 'automatic' ? t('automatic') : t('manual')}
          />
          {vehicle.city ? <SpecChip icon="location-outline" text={vehicle.city} /> : null}
        </View>

        <View style={styles.divider} />

        <View style={[ROW, styles.footer]}>
          <View style={[ROW, styles.sellerChip]}>
            <View
              style={[
                styles.sellerDot,
                { backgroundColor: vehicle.store ? colors.accent : colors.border },
              ]}
            >
              <Ionicons
                name={vehicle.store ? 'storefront' : 'person'}
                size={10}
                color={vehicle.store ? colors.primary : colors.textMuted}
              />
            </View>
            <Text
              style={[styles.sellerText, !vehicle.store && { color: colors.textMuted }]}
              numberOfLines={1}
            >
              {vehicle.store ? vehicle.store.name : t('private')}
            </Text>
          </View>
          <Text style={styles.fuelText}>{t(vehicle.fuel_type)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function SpecChip({
  icon,
  text,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  text: string;
}) {
  return (
    <View style={[ROW, styles.specChip]}>
      <Ionicons name={icon} size={12} color={colors.textMuted} />
      <Text style={styles.specChipText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    ...shadow.card,
    shadowOpacity: 0.09,
    shadowRadius: 14,
    elevation: 3,
  },
  image: { width: '100%', height: 190 },
  imagePlaceholder: {
    backgroundColor: colors.chipBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 80 },
  priceOnImage: {
    position: 'absolute',
    bottom: 10,
    right: 14,
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowRadius: 6,
  },
  newBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  newBadgeText: { color: colors.primary, fontSize: 11, fontWeight: '800' },
  topLeftBadges: { position: 'absolute', top: 10, left: 10, gap: 4 },
  featuredChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  featuredChipText: { color: colors.primary, fontSize: 10.5, fontWeight: '800' },
  body: { padding: spacing.md, paddingTop: 10 },
  title: { fontSize: 16.5, fontWeight: '800', color: colors.text },
  specRow: { flexWrap: 'wrap', gap: 6, marginTop: 8 },
  specChip: {
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.chipBg,
    borderRadius: radius.full,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  specChipText: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 10, opacity: 0.7 },
  footer: { alignItems: 'center', justifyContent: 'space-between' },
  sellerChip: { alignItems: 'center', gap: 6, maxWidth: '65%' },
  sellerDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerText: { fontSize: 12.5, fontWeight: '700', color: '#B45309' },
  fuelText: { fontSize: 12, color: colors.textFaint, fontWeight: '600' },
});
