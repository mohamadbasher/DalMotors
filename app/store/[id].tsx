import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Store, StoreReview, Vehicle } from '../../lib/types';
import { isOpenNow, parseHours, todayHours, WEEKDAY_KEYS } from '../../lib/hours';
import { colors, radius, shadow, spacing } from '../../lib/theme';
import { ROW, RTL_TEXT } from '../../lib/rtl';
import { useI18n } from '../../lib/i18n';
import { Button, EmptyState, Input, SearchBar, SectionHeader } from '../../components/ui';
import { StarRating } from '../../components/StarRating';
import { VehicleCard } from '../../components/VehicleCard';

export default function StoreDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const { t } = useI18n();
  const { session } = useAuth();
  const [store, setStore] = useState<Store | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [reviews, setReviews] = useState<StoreReview[]>([]);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    const [{ data: storeData }, vehiclesRes, reviewsRes] = await Promise.all([
      supabase.from('stores').select('*').eq('id', id).single(),
      (() => {
        let q = supabase
          .from('vehicles')
          .select('*, store:stores(id, name)')
          .eq('store_id', id)
          .eq('status', 'active')
          .order('created_at', { ascending: false });
        const s = search.trim();
        if (s) q = q.or(`title.ilike.%${s}%,make.ilike.%${s}%,model.ilike.%${s}%`);
        return q;
      })(),
      supabase
        .from('store_reviews')
        .select('*, user:profiles(full_name, avatar_url)')
        .eq('store_id', id)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);
    if (storeData) {
      setStore(storeData as Store);
      navigation.setOptions({ title: (storeData as Store).name });
    }
    if (vehiclesRes.data) setVehicles(vehiclesRes.data as Vehicle[]);
    if (reviewsRes.data) {
      setReviews(reviewsRes.data as StoreReview[]);
      const mine = (reviewsRes.data as StoreReview[]).find((r) => r.user_id === session?.user.id);
      if (mine) {
        setMyRating(mine.rating);
        setMyComment(mine.comment ?? '');
      }
    }
    setLoading(false);
  }, [id, search, navigation, session]);

  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(fetchData, search ? 300 : 0);
      return () => clearTimeout(timer);
    }, [fetchData, search])
  );

  async function onRefresh() {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }

  async function submitReview() {
    if (!session || !store || myRating === 0) return;
    setSubmittingReview(true);
    const { error } = await supabase.from('store_reviews').upsert(
      {
        store_id: store.id,
        user_id: session.user.id,
        rating: myRating,
        comment: myComment.trim() || null,
      },
      { onConflict: 'store_id,user_id' }
    );
    setSubmittingReview(false);
    if (error) Alert.alert(t('error'), error.message);
    else {
      Alert.alert(t('reviewSubmitted'));
      fetchData();
    }
  }

  const isOwnStore = session?.user.id === store?.owner_id;

  const storeHours = parseHours(store?.hours ?? null);
  const today = todayHours(storeHours);
  // Both must agree: the weekly schedule says "open now" AND the dealer hasn't
  // manually flipped the store closed.
  const openRightNow = !!store?.is_open && isOpenNow(storeHours);

  function openDirections() {
    if (!store?.lat || !store?.lng) return;
    const label = encodeURIComponent(store.name);
    // geo: on Android opens the user's default maps app; iOS has no geo: handler,
    // so fall back to Apple Maps' universal URL.
    const url =
      Platform.OS === 'ios'
        ? `http://maps.apple.com/?daddr=${store.lat},${store.lng}&q=${label}`
        : `geo:${store.lat},${store.lng}?q=${store.lat},${store.lng}(${label})`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${store.lat},${store.lng}`);
    });
  }

  return (
    <View style={styles.safe}>
      <FlatList
        data={vehicles}
        keyExtractor={(v) => v.id}
        renderItem={({ item }) => <VehicleCard vehicle={item} />}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View>
            {store && (
              <View style={styles.storeCard}>
                <View style={styles.logo}>
                  <Text style={styles.logoText}>{store.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={[ROW, { alignItems: 'center', gap: 6 }]}>
                  <Text style={styles.storeName}>{store.name}</Text>
                  {store.is_verified && (
                    <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
                  )}
                </View>
                {store.is_verified && (
                  <Text style={styles.verifiedText}>{t('verifiedBadge')}</Text>
                )}
                {store.rating_count > 0 && (
                  <View style={[ROW, { alignItems: 'center', gap: 6, marginTop: 6 }]}>
                    <StarRating value={store.rating_avg} size={15} />
                    <Text style={styles.ratingText}>
                      {store.rating_avg} ({store.rating_count})
                    </Text>
                  </View>
                )}
                {store.city ? (
                  <View style={[ROW, styles.metaRow]}>
                    <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                    <Text style={styles.metaText}>{store.city}</Text>
                  </View>
                ) : null}
                {store.description ? (
                  <Text style={styles.storeDesc}>{store.description}</Text>
                ) : null}
                {/* open / closed + today's hours */}
                {storeHours && (
                  <View style={[ROW, styles.statusRow]}>
                    <View
                      style={[
                        styles.statusPill,
                        { backgroundColor: openRightNow ? colors.successSoft : colors.dangerSoft },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: openRightNow ? colors.success : colors.danger },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusPillText,
                          { color: openRightNow ? colors.success : colors.danger },
                        ]}
                      >
                        {openRightNow ? t('openNow') : t('closedNow')}
                      </Text>
                    </View>
                    <Text style={styles.todayText}>
                      {today?.open ? `${t('todayHours')} ${today.from} – ${today.to}` : t('closedToday')}
                    </Text>
                  </View>
                )}

                <View style={[ROW, styles.actionsRow]}>
                  {store.phone ? (
                    <TouchableOpacity
                      style={[ROW, styles.callBtn]}
                      onPress={() => Linking.openURL(`tel:${store.phone}`)}
                    >
                      <Ionicons name="call" size={16} color="#FFFFFF" />
                      <Text style={styles.callBtnText}>{t('callStore')}</Text>
                    </TouchableOpacity>
                  ) : null}
                  {store.lat != null && store.lng != null ? (
                    <TouchableOpacity style={[ROW, styles.directionsBtn]} onPress={openDirections}>
                      <Ionicons name="navigate" size={16} color={colors.primary} />
                      <Text style={styles.directionsText}>{t('directions')}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            )}

            {/* full week */}
            {storeHours && (
              <>
                <SectionHeader title={t('openingHours')} />
                <View style={styles.hoursCard}>
                  {storeHours.map((d) => {
                    const isToday = d.day === new Date().getDay();
                    return (
                      <View key={d.day} style={[ROW, styles.hourRow, isToday && styles.hourRowToday]}>
                        <Text style={[styles.hourDay, isToday && styles.hourTodayText]}>
                          {t(WEEKDAY_KEYS[d.day])}
                        </Text>
                        <Text
                          style={[
                            styles.hourValue,
                            isToday && styles.hourTodayText,
                            !d.open && { color: colors.danger },
                          ]}
                        >
                          {d.open ? `${d.from} – ${d.to}` : t('closedNow')}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            {/* reviews */}
            <Text style={[styles.sectionTitle, RTL_TEXT]}>
              {t('reviews')} {reviews.length ? `(${reviews.length})` : ''}
            </Text>
            {!isOwnStore && session && (
              <View style={styles.reviewForm}>
                <Text style={[styles.reviewFormLabel, RTL_TEXT]}>{t('yourRating')}</Text>
                <StarRating value={myRating} onChange={setMyRating} size={26} />
                <Input
                  value={myComment}
                  onChangeText={setMyComment}
                  placeholder={t('reviewPlaceholder')}
                  multiline
                  numberOfLines={2}
                  style={{ height: 60, textAlignVertical: 'top', marginTop: spacing.sm }}
                />
                <Button
                  title={t('submitReview')}
                  small
                  variant="accent"
                  onPress={submitReview}
                  loading={submittingReview}
                  disabled={myRating === 0}
                  style={{ alignSelf: 'flex-end', marginTop: spacing.xs }}
                />
              </View>
            )}
            {reviews.length === 0 ? (
              <Text style={[styles.noReviews, RTL_TEXT]}>{t('noReviews')}</Text>
            ) : (
              reviews.map((r) => (
                <View key={r.id} style={styles.reviewCard}>
                  <View style={[ROW, { alignItems: 'center', justifyContent: 'space-between' }]}>
                    <Text style={[styles.reviewName, RTL_TEXT]}>
                      {r.user?.full_name ?? '—'}
                    </Text>
                    <StarRating value={r.rating} size={13} />
                  </View>
                  {r.comment ? (
                    <Text style={[styles.reviewComment, RTL_TEXT]}>{r.comment}</Text>
                  ) : null}
                </View>
              ))
            )}

            <Text style={[styles.sectionTitle, RTL_TEXT, { marginTop: spacing.xl }]}>
              {t('inventory')} {vehicles.length ? `(${vehicles.length})` : ''}
            </Text>
            <View style={{ marginBottom: spacing.md }}>
              <SearchBar value={search} onChangeText={setSearch} placeholder={t('searchInStore')} />
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon="car-outline"
              title={t('noVehiclesInStore')}
              subtitle={search ? t('tryChangingSearch') : undefined}
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, paddingBottom: spacing.xl },
  storeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoText: { color: colors.accent, fontSize: 28, fontWeight: '800' },
  storeName: { fontSize: 20, fontWeight: '800', color: colors.text },
  verifiedText: { fontSize: 11.5, color: colors.accent, fontWeight: '700', marginTop: 2 },
  ratingText: { fontSize: 13, fontWeight: '700', color: colors.text },
  metaRow: { alignItems: 'center', gap: 4, marginTop: 4 },
  metaText: { fontSize: 13, color: colors.textMuted },
  storeDesc: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 21,
  },
  callBtn: {
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: 10,
    borderRadius: radius.full,
    marginTop: spacing.md,
  },
  callBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  statusRow: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  statusPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusPillText: { fontSize: 12, fontWeight: '800' },
  todayText: { fontSize: 12.5, color: colors.textMuted },
  actionsRow: { gap: spacing.sm, marginTop: spacing.md },
  directionsBtn: {
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.full,
  },
  directionsText: { color: colors.primary, fontWeight: '800', fontSize: 14 },
  hoursCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  hourRow: {
    justifyContent: 'space-between',
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: radius.sm,
  },
  hourRowToday: { backgroundColor: colors.accentSoft },
  hourDay: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  hourValue: { fontSize: 13, color: colors.text, fontWeight: '700' },
  hourTodayText: { color: '#B45309' },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  reviewForm: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  reviewFormLabel: { fontSize: 12.5, fontWeight: '700', color: colors.textMuted, marginBottom: 6 },
  noReviews: { fontSize: 13, color: colors.textFaint, marginBottom: spacing.md },
  reviewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  reviewName: { fontSize: 13.5, fontWeight: '700', color: colors.text },
  reviewComment: { fontSize: 13, color: colors.textMuted, marginTop: 4, lineHeight: 19 },
});
