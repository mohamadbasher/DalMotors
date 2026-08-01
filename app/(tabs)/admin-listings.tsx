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
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Vehicle } from '../../lib/types';
import { colors, formatPrice, radius, shadow, spacing } from '../../lib/theme';
import { ROW, RTL_TEXT } from '../../lib/rtl';
import { useI18n } from '../../lib/i18n';
import { Badge, Button, EmptyState, SearchBar, ScreenHeader } from '../../components/ui';
import { TopBar } from '../../components/TopBar';

export default function AdminListings() {
  const { mode, isAdmin } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchVehicles = useCallback(async () => {
    let q = supabase
      .from('vehicles')
      .select('*, store:stores(id, name), seller:profiles!vehicles_seller_id_fkey(full_name, phone)')
      .order('created_at', { ascending: false });
    const s = search.trim();
    if (s) q = q.or(`title.ilike.%${s}%,make.ilike.%${s}%,model.ilike.%${s}%`);
    const { data } = await q.limit(200);
    setVehicles((data ?? []) as Vehicle[]);
    setLoading(false);
  }, [search]);

  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(fetchVehicles, search ? 300 : 0);
      return () => clearTimeout(timer);
    }, [fetchVehicles, search])
  );

  if (mode !== 'admin' || !isAdmin) return <Redirect href="/(tabs)" />;

  async function setStatus(v: Vehicle, status: Vehicle['status']) {
    const { error } = await supabase.from('vehicles').update({ status }).eq('id', v.id);
    if (error) Alert.alert(t('error'), error.message);
    else fetchVehicles();
  }

  async function toggleFeatured(v: Vehicle) {
    const nextFeatured = !v.is_featured;
    const { error } = await supabase
      .from('vehicles')
      .update({
        is_featured: nextFeatured,
        featured_until: nextFeatured ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null,
      })
      .eq('id', v.id);
    if (error) Alert.alert(t('error'), error.message);
    else fetchVehicles();
  }

  function deleteVehicle(v: Vehicle) {
    Alert.alert(t('deleteConfirmTitle'), t('deleteConfirmBody'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('vehicles').delete().eq('id', v.id);
          if (error) Alert.alert(t('error'), error.message);
          else fetchVehicles();
        },
      },
    ]);
  }

  async function onRefresh() {
    setRefreshing(true);
    await fetchVehicles();
    setRefreshing(false);
  }

  return (
    <View style={styles.safe}>
      <TopBar />
      <FlatList
        data={vehicles}
        keyExtractor={(v) => v.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.md }}>
            <ScreenHeader title={t('listings')} />
            <View style={{ marginTop: spacing.md }}>
              <SearchBar value={search} onChangeText={setSearch} placeholder={t('searchVehicles')} />
            </View>
          </View>
        }
        ListEmptyComponent={loading ? null : <EmptyState icon="car-outline" title={t('noVehicles')} />}
        renderItem={({ item: v }) => (
          <View style={styles.card}>
            <TouchableOpacity
              style={[ROW, styles.cardHeader]}
              onPress={() => router.push(`/vehicle/${v.id}`)}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, RTL_TEXT]}>{v.title}</Text>
                <Text style={[styles.cardSub, RTL_TEXT]}>
                  {formatPrice(v.price)} · {v.seller?.full_name ?? '—'}
                  {v.store ? ` · ${v.store.name}` : ''}
                </Text>
              </View>
              <View style={{ gap: 4, alignItems: 'flex-end' }}>
                <Badge
                  label={v.status === 'active' ? t('active') : v.status === 'sold' ? t('sold') : t('removed')}
                  tone={v.status === 'active' ? 'success' : v.status === 'sold' ? 'accent' : 'danger'}
                />
                {v.is_featured && <Badge label={t('featured')} tone="accent" />}
              </View>
            </TouchableOpacity>
            <View style={[ROW, styles.actionRow]}>
              <Button
                title={v.is_featured ? t('unfeatureListing') : t('featureListing')}
                small
                variant={v.is_featured ? 'danger' : 'outline'}
                icon="star"
                onPress={() => toggleFeatured(v)}
              />
              {v.status !== 'removed' ? (
                <Button
                  title={t('takeDown')}
                  small
                  variant="outline"
                  icon="eye-off"
                  onPress={() => setStatus(v, 'removed')}
                />
              ) : (
                <Button
                  title={t('restore')}
                  small
                  variant="outline"
                  icon="refresh"
                  onPress={() => setStatus(v, 'active')}
                />
              )}
              <Button title={t('delete')} small variant="danger" icon="trash" onPress={() => deleteVehicle(v)} />
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  cardHeader: { alignItems: 'center', gap: spacing.sm },
  cardTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  cardSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  actionRow: { gap: spacing.sm, marginTop: spacing.md },
});
