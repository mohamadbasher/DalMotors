import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Store } from '../../lib/types';
import { getCities } from '../../lib/cities';
import { Coords, distanceKm, getCurrentLocation } from '../../lib/location';
import { colors, radius, spacing } from '../../lib/theme';
import { ROW } from '../../lib/rtl';
import { useI18n } from '../../lib/i18n';
import { Chip, EmptyState, SearchBar, ScreenHeader } from '../../components/ui';
import { StoreCard } from '../../components/StoreCard';
import { TopBar } from '../../components/TopBar';

export default function Stores() {
  const { t } = useI18n();
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nearMe, setNearMe] = useState(false);
  const [userLoc, setUserLoc] = useState<Coords | null>(null);
  const [cityCoords, setCityCoords] = useState<Record<string, Coords>>({});

  const fetchStores = useCallback(async () => {
    let query = supabase
      .from('stores')
      .select('*, vehicles(count)')
      .order('created_at', { ascending: false });
    const s = search.trim();
    if (s) query = query.or(`name.ilike.%${s}%,city.ilike.%${s}%`);
    const { data, error } = await query;
    if (!error && data) setStores(data as Store[]);
    setLoading(false);
  }, [search]);

  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(fetchStores, search ? 300 : 0);
      return () => clearTimeout(timer);
    }, [fetchStores, search])
  );

  useFocusEffect(
    useCallback(() => {
      getCities().then((cities) => {
        const map: Record<string, Coords> = {};
        cities.forEach((c) => {
          if (c.lat != null && c.lng != null) map[c.name_he] = { lat: c.lat, lng: c.lng };
        });
        setCityCoords(map);
      });
    }, [])
  );

  async function toggleNearMe() {
    if (nearMe) {
      setNearMe(false);
      return;
    }
    const loc = await getCurrentLocation();
    if (!loc) {
      return;
    }
    setUserLoc(loc);
    setNearMe(true);
  }

  const displayedStores = useMemo(() => {
    if (!nearMe || !userLoc) return stores;
    return [...stores]
      .map((s) => {
        const coords = s.city ? cityCoords[s.city] : null;
        const dist = coords ? distanceKm(userLoc, coords) : Infinity;
        return { store: s, dist };
      })
      .sort((a, b) => a.dist - b.dist)
      .map((x) => x.store);
  }, [stores, nearMe, userLoc, cityCoords]);

  function distanceFor(store: Store): number | undefined {
    if (!nearMe || !userLoc || !store.city) return undefined;
    const coords = cityCoords[store.city];
    return coords ? distanceKm(userLoc, coords) : undefined;
  }

  async function onRefresh() {
    setRefreshing(true);
    await fetchStores();
    setRefreshing(false);
  }

  return (
    <View style={styles.safe}>
      <TopBar />
      <FlatList
        data={displayedStores}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => <StoreCard store={item} distanceKm={distanceFor(item)} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <View style={[ROW, { alignItems: 'flex-start', justifyContent: 'space-between' }]}>
              <ScreenHeader title={t('tabStores')} subtitle={t('storesSub')} />
              <TouchableOpacity style={styles.mapBtn} onPress={() => router.push('/stores-map')}>
                <Ionicons name="map-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.controls}>
              <SearchBar value={search} onChangeText={setSearch} placeholder={t('searchStores')} />
              <View style={[ROW, { marginTop: spacing.sm }]}>
                <Chip label={t('nearMe')} selected={nearMe} onPress={toggleNearMe} />
              </View>
            </View>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          loading ? null : <EmptyState icon="storefront-outline" title={t('noStores')} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  controls: { paddingVertical: spacing.md },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  mapBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    marginRight: spacing.lg,
  },
});
