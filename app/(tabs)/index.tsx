import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Brand, getBrands } from '../../lib/brands';
import { AREAS, areaLabel, getCities } from '../../lib/cities';
import { DEFAULT_FILTERS, Vehicle, VehicleFilters } from '../../lib/types';
import { colors, radius, spacing } from '../../lib/theme';
import { ROW, RTL_TEXT } from '../../lib/rtl';
import { useI18n } from '../../lib/i18n';
import { useAuth } from '../../context/AuthContext';
import { Button, Chip, EmptyState, Input, SearchBar, ScreenHeader } from '../../components/ui';
import { VehicleCard } from '../../components/VehicleCard';
import { CityPicker } from '../../components/CityPicker';
import { BannerCarousel } from '../../components/BannerCarousel';
import { TopBar } from '../../components/TopBar';

export default function AllVehicles() {
  const { t, lang } = useI18n();
  const { mode, session } = useAuth();
  const router = useRouter();
  const { savedSearch } = useLocalSearchParams<{ savedSearch?: string }>();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<VehicleFilters>(DEFAULT_FILTERS);
  const [filterModal, setFilterModal] = useState(false);
  const [draftMaxPrice, setDraftMaxPrice] = useState('');
  const [draftMinYear, setDraftMinYear] = useState('');
  const [draftTransmission, setDraftTransmission] = useState<VehicleFilters['transmission']>(null);
  const [draftFuel, setDraftFuel] = useState<VehicleFilters['fuelType']>(null);
  const [draftArea, setDraftArea] = useState<string | null>(null);
  const [draftCity, setDraftCity] = useState<string | null>(null);
  const [saveSearchName, setSaveSearchName] = useState('');
  const [savingSearch, setSavingSearch] = useState(false);

  const filterActive = useMemo(
    () =>
      filters.maxPrice !== null ||
      filters.minYear !== null ||
      filters.transmission !== null ||
      filters.fuelType !== null ||
      filters.area !== null ||
      filters.city !== null,
    [filters]
  );

  const fetchVehicles = useCallback(async () => {
    let query = supabase
      .from('vehicles')
      .select('*, store:stores(id, name)')
      .eq('status', 'active');
    const s = filters.search.trim();
    if (s) query = query.or(`title.ilike.%${s}%,make.ilike.%${s}%,model.ilike.%${s}%`);
    if (filters.maxPrice !== null) query = query.lte('price', filters.maxPrice);
    if (filters.minYear !== null) query = query.gte('year', filters.minYear);
    if (filters.transmission) query = query.eq('transmission', filters.transmission);
    if (filters.fuelType) query = query.eq('fuel_type', filters.fuelType);
    if (filters.city) {
      query = query.eq('city', filters.city);
    } else if (filters.area) {
      const names = (await getCities()).filter((c) => c.area === filters.area).map((c) => c.name_he);
      if (names.length) query = query.in('city', names);
    }
    query = query.order('is_featured', { ascending: false });
    if (filters.sort === 'price_asc') query = query.order('price', { ascending: true });
    else if (filters.sort === 'price_desc') query = query.order('price', { ascending: false });
    else query = query.order('created_at', { ascending: false });
    const { data, error } = await query.limit(100);
    if (!error && data) setVehicles(data as Vehicle[]);
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(fetchVehicles, filters.search ? 350 : 0);
    return () => clearTimeout(timer);
  }, [fetchVehicles, filters.search]);

  // Apply filters coming from a tapped saved search.
  useEffect(() => {
    if (!savedSearch) return;
    try {
      const parsed = JSON.parse(savedSearch);
      setFilters((f) => ({
        ...f,
        search: parsed.search ?? '',
        maxPrice: parsed.maxPrice ?? null,
        minYear: parsed.minYear ?? null,
        transmission: parsed.transmission ?? null,
        fuelType: parsed.fuelType ?? null,
        city: parsed.city ?? null,
      }));
    } catch {}
  }, [savedSearch]);

  useFocusEffect(
    useCallback(() => {
      fetchVehicles();
      getBrands().then(setBrands);
    }, [fetchVehicles])
  );

  if (mode === 'store') return <Redirect href="/(tabs)/dashboard" />;
  if (mode === 'admin') return <Redirect href="/(tabs)/admin-dashboard" />;

  async function onRefresh() {
    setRefreshing(true);
    await fetchVehicles();
    setRefreshing(false);
  }

  function openFilters() {
    setDraftMaxPrice(filters.maxPrice?.toString() ?? '');
    setDraftMinYear(filters.minYear?.toString() ?? '');
    setDraftTransmission(filters.transmission);
    setDraftFuel(filters.fuelType);
    setDraftArea(filters.area);
    setDraftCity(filters.city);
    setFilterModal(true);
  }

  function applyFilters() {
    setFilters((f) => ({
      ...f,
      maxPrice: draftMaxPrice ? parseInt(draftMaxPrice, 10) || null : null,
      minYear: draftMinYear ? parseInt(draftMinYear, 10) || null : null,
      transmission: draftTransmission,
      fuelType: draftFuel,
      area: draftArea,
      city: draftCity,
    }));
    setFilterModal(false);
  }

  async function handleSaveSearch() {
    if (!session) return;
    setSavingSearch(true);
    const filtersToSave = {
      search: filters.search || undefined,
      maxPrice: draftMaxPrice ? parseInt(draftMaxPrice, 10) : undefined,
      minYear: draftMinYear ? parseInt(draftMinYear, 10) : undefined,
      transmission: draftTransmission ?? undefined,
      fuelType: draftFuel ?? undefined,
      city: draftCity ?? undefined,
    };
    const name = saveSearchName.trim() || filters.search || t('savedSearches');
    const { error } = await supabase
      .from('saved_searches')
      .insert({ user_id: session.user.id, name, filters: filtersToSave });
    setSavingSearch(false);
    if (error) Alert.alert(t('error'), error.message);
    else {
      setSaveSearchName('');
      Alert.alert(t('searchSaved'));
    }
  }

  function clearFilters() {
    setDraftMaxPrice('');
    setDraftMinYear('');
    setDraftTransmission(null);
    setDraftFuel(null);
    setDraftArea(null);
    setDraftCity(null);
    setFilters((f) => ({ ...DEFAULT_FILTERS, search: f.search, sort: f.sort }));
    setFilterModal(false);
  }

  const SORTS: { key: VehicleFilters['sort']; label: string }[] = [
    { key: 'newest', label: t('sortNewest') },
    { key: 'price_asc', label: t('sortPriceAsc') },
    { key: 'price_desc', label: t('sortPriceDesc') },
  ];

  // Everything above the cards scrolls away with the list.
  const ListHeader = (
    <View>
      <ScreenHeader title={t('tabVehicles')} subtitle={t('allVehiclesSub')} />
      <View style={{ marginTop: spacing.md }}>
        <BannerCarousel />
      </View>
      <View style={{ marginTop: spacing.md }}>
        <SearchBar
          value={filters.search}
          onChangeText={(v) => setFilters((f) => ({ ...f, search: v }))}
          placeholder={t('searchVehicles')}
          onFilterPress={openFilters}
          filterActive={filterActive}
        />
      </View>
      {/* brand logo strip — inverted = starts from the right (RTL) */}
      <FlatList
        horizontal
        inverted
        showsHorizontalScrollIndicator={false}
        style={{ marginTop: spacing.md }}
        data={[{ id: '__all__', name: '__all__', logo_url: null, sort: -1 } as Brand, ...brands]}
        keyExtractor={(b) => b.name}
        ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
        renderItem={({ item: b }) => {
          const isAll = b.name === '__all__';
          const selected = isAll ? !filters.search : filters.search === b.name;
          return (
            <TouchableOpacity
              activeOpacity={0.75}
              style={[styles.brandTile, selected && styles.brandTileActive]}
              onPress={() =>
                setFilters((f) => ({
                  ...f,
                  search: isAll ? '' : f.search === b.name ? '' : b.name,
                }))
              }
            >
              {isAll || !b.logo_url ? (
                <Ionicons
                  name="car-sport"
                  size={30}
                  color={selected ? '#B45309' : colors.textMuted}
                />
              ) : (
                <Image source={{ uri: b.logo_url }} style={styles.brandLogo} contentFit="contain" />
              )}
              <Text
                style={[styles.brandName, selected && styles.brandNameActive]}
                numberOfLines={1}
              >
                {isAll ? t('all') : b.name}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
      {/* sort strip */}
      <FlatList
        horizontal
        inverted
        showsHorizontalScrollIndicator={false}
        style={{ marginTop: spacing.sm, marginBottom: spacing.md }}
        data={SORTS}
        keyExtractor={(s) => s.key}
        ItemSeparatorComponent={() => <View style={{ width: 6 }} />}
        renderItem={({ item: s }) => (
          <Chip
            label={s.label}
            selected={filters.sort === s.key}
            onPress={() => setFilters((f) => ({ ...f, sort: s.key }))}
          />
        )}
      />
    </View>
  );

  return (
    <View style={styles.safe}>
      <TopBar />
      <FlatList
        data={vehicles}
        keyExtractor={(v) => v.id}
        renderItem={({ item }) => <VehicleCard vehicle={item} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={ListHeader}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon="car-outline"
              title={t('noVehicles')}
              subtitle={filterActive || filters.search ? t('tryChangingSearch') : t('beFirstToList')}
            />
          )
        }
      />

      {/* Sell FAB */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={() => router.push('/sell')}>
        <Ionicons name="add" size={22} color={colors.primary} />
        <Text style={styles.fabText}>{t('sellVehicle')}</Text>
      </TouchableOpacity>

      {/* Filters modal */}
      <Modal visible={filterModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={[ROW, styles.modalHeader]}>
              <Text style={styles.modalTitle}>{t('filters')}</Text>
              <TouchableOpacity onPress={() => setFilterModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Input
              label={t('maxPrice')}
              value={draftMaxPrice}
              onChangeText={setDraftMaxPrice}
              placeholder="80000"
              keyboardType="number-pad"
            />
            <Input
              label={t('minYear')}
              value={draftMinYear}
              onChangeText={setDraftMinYear}
              placeholder="2018"
              keyboardType="number-pad"
            />
            <Text style={[styles.filterLabel, RTL_TEXT]}>{t('area')}</Text>
            <View style={[ROW, styles.chipRow]}>
              {AREAS.map((a) => (
                <Chip
                  key={a}
                  label={areaLabel(a, lang)}
                  selected={draftArea === a}
                  onPress={() => {
                    setDraftArea(draftArea === a ? null : a);
                    setDraftCity(null);
                  }}
                />
              ))}
            </View>
            <CityPicker label={t('city')} value={draftCity} onChange={(c) => setDraftCity(c || null)} allowClear />
            <Text style={[styles.filterLabel, RTL_TEXT]}>{t('transmission')}</Text>
            <View style={[ROW, styles.chipRow]}>
              {(['automatic', 'manual'] as const).map((tr) => (
                <Chip
                  key={tr}
                  label={tr === 'automatic' ? t('automatic') : t('manual')}
                  selected={draftTransmission === tr}
                  onPress={() => setDraftTransmission(draftTransmission === tr ? null : tr)}
                />
              ))}
            </View>
            <Text style={[styles.filterLabel, RTL_TEXT]}>{t('fuel')}</Text>
            <View style={[ROW, styles.chipRow]}>
              {(['petrol', 'diesel', 'hybrid', 'electric'] as const).map((f) => (
                <Chip
                  key={f}
                  label={t(f)}
                  selected={draftFuel === f}
                  onPress={() => setDraftFuel(draftFuel === f ? null : f)}
                />
              ))}
            </View>
            <View style={[ROW, styles.modalActions]}>
              <Button title={t('clear')} variant="outline" onPress={clearFilters} style={{ flex: 1 }} />
              <Button title={t('apply')} onPress={applyFilters} style={{ flex: 2 }} />
            </View>

            {session && (
              <View style={styles.saveSearchBox}>
                <Input
                  value={saveSearchName}
                  onChangeText={setSaveSearchName}
                  placeholder={t('savedSearchNamePlaceholder')}
                  style={{ marginBottom: spacing.sm }}
                />
                <Button
                  title={t('saveSearch')}
                  variant="outline"
                  icon="bookmark-outline"
                  onPress={handleSaveSearch}
                  loading={savingSearch}
                />
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 90 },
  brandTile: {
    width: 72,
    height: 72,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  brandTileActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  brandLogo: { width: 34, height: 30 },
  brandName: { fontSize: 9.5, fontWeight: '700', color: colors.textMuted },
  brandNameActive: { color: '#B45309' },
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  fabText: { color: colors.primary, fontWeight: '800', fontSize: 14 },
  modalBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  modalHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  filterLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 6 },
  chipRow: { flexWrap: 'wrap', gap: 6, marginBottom: spacing.md },
  modalActions: { gap: spacing.sm, marginTop: spacing.sm },
  saveSearchBox: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
