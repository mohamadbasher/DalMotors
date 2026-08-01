import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Vehicle } from '../../lib/types';
import { colors, formatKm, formatPrice, radius, shadow, spacing } from '../../lib/theme';
import { ROW, RTL_TEXT } from '../../lib/rtl';
import { TKey, useI18n } from '../../lib/i18n';
import { Badge, Button } from '../../components/ui';

const { width: SCREEN_W } = Dimensions.get('window');

interface PriceGuidance {
  avg: number;
  count: number;
}

export default function VehicleDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session, isAdmin } = useAuth();
  const { t } = useI18n();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [guidance, setGuidance] = useState<PriceGuidance | null>(null);
  const viewCounted = useRef(false);

  const isOwner = session?.user.id === vehicle?.seller_id;

  const fetchData = useCallback(async () => {
    if (!id || !session) return;
    const [vehicleRes, favRes] = await Promise.all([
      supabase
        .from('vehicles')
        .select(
          '*, store:stores(id, name), seller:profiles!vehicles_seller_id_fkey(full_name, phone)'
        )
        .eq('id', id)
        .single(),
      supabase
        .from('favorites')
        .select('vehicle_id')
        .eq('user_id', session.user.id)
        .eq('vehicle_id', id)
        .maybeSingle(),
    ]);
    if (vehicleRes.data) setVehicle(vehicleRes.data as Vehicle);
    setIsFavorite(!!favRes.data);
    setLoading(false);
  }, [id, session]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  // Count a view once per screen visit, skipping the owner's own views.
  useEffect(() => {
    if (!vehicle || viewCounted.current) return;
    if (session?.user.id === vehicle.seller_id) return;
    viewCounted.current = true;
    supabase.rpc('increment_vehicle_view', { p_vehicle_id: vehicle.id }).then(() => {});
  }, [vehicle, session]);

  // Price guidance: average price of similar active/sold listings.
  useEffect(() => {
    if (!vehicle) return;
    supabase
      .from('vehicles')
      .select('price')
      .eq('make', vehicle.make)
      .eq('model', vehicle.model)
      .gte('year', vehicle.year - 1)
      .lte('year', vehicle.year + 1)
      .in('status', ['active', 'sold'])
      .neq('id', vehicle.id)
      .limit(50)
      .then(({ data }) => {
        const prices = (data ?? []).map((r: { price: number }) => r.price);
        if (prices.length >= 3) {
          setGuidance({ avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length), count: prices.length });
        } else {
          setGuidance(null);
        }
      });
  }, [vehicle]);

  async function toggleFavorite() {
    if (!session || !vehicle) return;
    setIsFavorite((f) => !f);
    if (isFavorite) {
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', session.user.id)
        .eq('vehicle_id', vehicle.id);
    } else {
      await supabase.from('favorites').insert({ user_id: session.user.id, vehicle_id: vehicle.id });
    }
  }

  async function shareVehicle() {
    if (!vehicle) return;
    try {
      await Share.share({
        message: `${vehicle.title} — ${formatPrice(vehicle.price)}\n${t('shareMessage')}\nautohub://vehicle/${vehicle.id}`,
      });
    } catch {}
  }

  async function setStatus(status: Vehicle['status']) {
    if (!vehicle) return;
    const { error } = await supabase.from('vehicles').update({ status }).eq('id', vehicle.id);
    if (error) Alert.alert(t('error'), error.message);
    else fetchData();
  }

  function confirmDelete() {
    Alert.alert(t('deleteConfirmTitle'), t('deleteConfirmBody'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          if (!vehicle) return;
          const { error } = await supabase.from('vehicles').delete().eq('id', vehicle.id);
          if (error) Alert.alert(t('error'), error.message);
          else router.back();
        },
      },
    ]);
  }

  const contactPhone = vehicle?.phone || vehicle?.seller?.phone;

  function callSeller() {
    if (contactPhone) Linking.openURL(`tel:${contactPhone}`);
  }

  function whatsappSeller() {
    if (!contactPhone || !vehicle) return;
    const clean = contactPhone.replace(/[^0-9]/g, '').replace(/^0/, '972');
    const msg = encodeURIComponent(t('whatsappMsg'));
    Linking.openURL(`https://wa.me/${clean}?text=${msg}`);
  }

  if (loading || !vehicle) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const photos = vehicle.photos?.length ? vehicle.photos : [null];
  const statusLabel: Record<Vehicle['status'], TKey> = {
    active: 'active',
    sold: 'sold',
    removed: 'removed',
  };
  const handLabel = vehicle.ownership_hand === 1 ? t('hand1') : vehicle.ownership_hand === 2 ? t('hand2') : vehicle.ownership_hand ? t('hand3Plus') : null;
  const accidentLabel =
    vehicle.accident_status === 'none'
      ? t('accidentNone')
      : vehicle.accident_status === 'minor'
        ? t('accidentMinor')
        : vehicle.accident_status === 'major'
          ? t('accidentMajor')
          : null;
  const priceDiffPct = guidance ? Math.round(((vehicle.price - guidance.avg) / guidance.avg) * 100) : null;

  return (
    <View style={styles.safe}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* photo carousel */}
        <View>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) =>
              setPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))
            }
          >
            {photos.map((p, i) =>
              p ? (
                <Image
                  key={i}
                  source={{ uri: p }}
                  style={styles.heroImage}
                  contentFit="cover"
                  transition={150}
                />
              ) : (
                <View key={i} style={[styles.heroImage, styles.heroPlaceholder]}>
                  <Ionicons name="car-sport-outline" size={64} color={colors.textFaint} />
                </View>
              )
            )}
          </ScrollView>
          {photos.length > 1 && (
            <View style={styles.dots}>
              {photos.map((_, i) => (
                <View key={i} style={[styles.dot, i === photoIndex && styles.dotActive]} />
              ))}
            </View>
          )}
          {vehicle.is_featured && (
            <View style={styles.featuredBadge}>
              <Ionicons name="star" size={12} color={colors.primary} />
              <Text style={styles.featuredBadgeText}>{t('featured')}</Text>
            </View>
          )}
          <View style={styles.topRightBtns}>
            <TouchableOpacity style={styles.roundBtn} onPress={shareVehicle}>
              <Ionicons name="share-social-outline" size={20} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.roundBtn} onPress={toggleFavorite}>
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={22}
                color={isFavorite ? colors.danger : colors.text}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.body}>
          <View style={[ROW, styles.titleRow]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, RTL_TEXT]}>{vehicle.title}</Text>
              <Text style={[styles.price, RTL_TEXT]}>{formatPrice(vehicle.price)}</Text>
            </View>
            {vehicle.status !== 'active' && (
              <Badge
                label={t(statusLabel[vehicle.status])}
                tone={vehicle.status === 'sold' ? 'danger' : 'neutral'}
              />
            )}
          </View>

          <View style={[ROW, styles.viewsRow]}>
            <Ionicons name="eye-outline" size={13} color={colors.textFaint} />
            <Text style={styles.viewsText}>
              {vehicle.view_count} {t('views')}
            </Text>
          </View>

          {/* price guidance */}
          {guidance && priceDiffPct !== null && (
            <View style={styles.guidanceBox}>
              <View style={[ROW, { alignItems: 'center', gap: 6 }]}>
                <Ionicons
                  name={priceDiffPct <= 0 ? 'trending-down' : 'trending-up'}
                  size={16}
                  color={priceDiffPct <= 0 ? colors.success : '#B45309'}
                />
                <Text style={[styles.guidanceTitle, RTL_TEXT]}>
                  {priceDiffPct <= -3 ? t('priceGuidanceGoodDeal') : priceDiffPct >= 8 ? t('priceGuidanceAboveAvg') : t('priceGuidance')}
                </Text>
              </View>
              <Text style={[styles.guidanceBody, RTL_TEXT]}>
                {t('priceGuidanceBody')}: {formatPrice(guidance.avg)}
              </Text>
            </View>
          )}

          {/* specs grid */}
          <View style={[ROW, styles.specGrid]}>
            <Spec icon="calendar-outline" label={t('year')} value={String(vehicle.year)} />
            <Spec icon="speedometer-outline" label={t('mileage')} value={formatKm(vehicle.mileage)} />
            <Spec
              icon="cog-outline"
              label={t('gearbox')}
              value={vehicle.transmission === 'automatic' ? t('automatic') : t('manual')}
            />
            <Spec icon="flash-outline" label={t('fuel')} value={t(vehicle.fuel_type)} />
            <Spec
              icon="sparkles-outline"
              label={t('condition')}
              value={vehicle.condition === 'new' ? t('brandNew') : t('used')}
            />
            {vehicle.color ? (
              <Spec icon="color-palette-outline" label={t('colorLabel')} value={vehicle.color} />
            ) : null}
            {vehicle.city ? (
              <Spec icon="location-outline" label={t('location')} value={vehicle.city} />
            ) : null}
            {handLabel ? (
              <Spec icon="key-outline" label={t('ownershipHand')} value={handLabel} />
            ) : null}
            {vehicle.test_expiry ? (
              <Spec icon="checkmark-circle-outline" label={t('testExpiry')} value={vehicle.test_expiry} />
            ) : null}
            {accidentLabel ? (
              <Spec icon="shield-outline" label={t('accidentStatus')} value={accidentLabel} />
            ) : null}
          </View>

          {vehicle.description ? (
            <>
              <Text style={[styles.sectionTitle, RTL_TEXT]}>{t('description')}</Text>
              <Text style={[styles.description, RTL_TEXT]}>{vehicle.description}</Text>
            </>
          ) : null}

          {/* seller card */}
          <Text style={[styles.sectionTitle, RTL_TEXT]}>{t('seller')}</Text>
          <TouchableOpacity
            activeOpacity={vehicle.store ? 0.7 : 1}
            style={[ROW, styles.sellerCard]}
            onPress={() => vehicle.store && router.push(`/store/${vehicle.store.id}`)}
          >
            <View style={styles.sellerIcon}>
              <Ionicons
                name={vehicle.store ? 'storefront' : 'person'}
                size={20}
                color={colors.accent}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sellerName, RTL_TEXT]}>
                {vehicle.store
                  ? vehicle.store.name
                  : vehicle.seller?.full_name ?? t('privateSeller')}
              </Text>
              <Text style={[styles.sellerType, RTL_TEXT]}>
                {vehicle.store ? t('storeTapHint') : t('privateSeller')}
              </Text>
            </View>
            {vehicle.store && <Ionicons name="chevron-back" size={18} color={colors.textFaint} />}
          </TouchableOpacity>

          {/* owner / admin management */}
          {(isOwner || isAdmin) && (
            <>
              <Text style={[styles.sectionTitle, RTL_TEXT]}>
                {isOwner ? t('manageListing') : t('adminActions')}
              </Text>
              <View style={[ROW, styles.manageRow]}>
                {vehicle.status === 'active' ? (
                  <Button
                    title={t('markSold')}
                    small
                    variant="outline"
                    icon="checkmark-done"
                    onPress={() => setStatus('sold')}
                  />
                ) : (
                  <Button
                    title={t('markActive')}
                    small
                    variant="outline"
                    icon="refresh"
                    onPress={() => setStatus('active')}
                  />
                )}
                {isAdmin && !isOwner && vehicle.status !== 'removed' && (
                  <Button
                    title={t('takeDown')}
                    small
                    variant="danger"
                    icon="eye-off"
                    onPress={() => setStatus('removed')}
                  />
                )}
                <Button
                  title={t('delete')}
                  small
                  variant="danger"
                  icon="trash"
                  onPress={confirmDelete}
                />
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* contact bar */}
      {!isOwner && vehicle.status === 'active' && contactPhone && (
        <View style={[ROW, styles.contactBar]}>
          <Button title={t('call')} icon="call" onPress={callSeller} style={{ flex: 1 }} />
          <Button
            title={t('whatsapp')}
            icon="logo-whatsapp"
            variant="accent"
            onPress={whatsappSeller}
            style={{ flex: 1 }}
          />
        </View>
      )}
    </View>
  );
}

function Spec({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.spec}>
      <Ionicons name={icon} size={18} color={colors.accent} />
      <Text style={styles.specLabel}>{label}</Text>
      <Text style={styles.specValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  heroImage: { width: SCREEN_W, height: 280 },
  heroPlaceholder: {
    backgroundColor: colors.chipBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: '#FFFFFF', width: 18 },
  featuredBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  featuredBadgeText: { color: colors.primary, fontSize: 11.5, fontWeight: '800' },
  topRightBtns: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    gap: 8,
  },
  roundBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  body: { padding: spacing.lg },
  titleRow: { alignItems: 'flex-start', gap: spacing.sm },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  price: { fontSize: 24, fontWeight: '800', color: '#B45309', marginTop: 4 },
  viewsRow: { alignItems: 'center', gap: 4, marginTop: 6 },
  viewsText: { fontSize: 12, color: colors.textFaint },
  guidanceBox: {
    backgroundColor: colors.chipBg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  guidanceTitle: { fontSize: 13.5, fontWeight: '800', color: colors.text },
  guidanceBody: { fontSize: 12.5, color: colors.textMuted, marginTop: 2 },
  specGrid: { flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
  spec: {
    width: '31%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: 2,
    ...shadow.card,
  },
  specLabel: { fontSize: 11, color: colors.textFaint },
  specValue: { fontSize: 13, fontWeight: '700', color: colors.text, textAlign: 'center' },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  description: { fontSize: 14, color: colors.textMuted, lineHeight: 22 },
  sellerCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.card,
  },
  sellerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerName: { fontSize: 15, fontWeight: '800', color: colors.text },
  sellerType: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  manageRow: { flexWrap: 'wrap', gap: spacing.sm },
  contactBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    gap: spacing.sm,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
