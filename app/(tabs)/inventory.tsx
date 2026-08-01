import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Redirect, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Vehicle } from '../../lib/types';
import { colors, spacing } from '../../lib/theme';
import { useI18n } from '../../lib/i18n';
import { EmptyState, ScreenHeader } from '../../components/ui';
import { VehicleCard } from '../../components/VehicleCard';
import { TopBar } from '../../components/TopBar';

export default function Inventory() {
  const { store, mode } = useAuth();
  const { t } = useI18n();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInventory = useCallback(async () => {
    if (!store) return;
    const { data, error } = await supabase
      .from('vehicles')
      .select('*, store:stores(id, name)')
      .eq('store_id', store.id)
      .order('created_at', { ascending: false });
    if (!error && data) setVehicles(data as Vehicle[]);
    setLoading(false);
  }, [store]);

  useFocusEffect(
    useCallback(() => {
      fetchInventory();
    }, [fetchInventory])
  );

  if (mode === 'personal' || !store) return <Redirect href="/(tabs)" />;

  async function onRefresh() {
    setRefreshing(true);
    await fetchInventory();
    setRefreshing(false);
  }

  return (
    <View style={styles.safe}>
      <TopBar />
      <FlatList
        data={vehicles}
        keyExtractor={(v) => v.id}
        renderItem={({ item }) => <VehicleCard vehicle={item} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.md }}>
            <ScreenHeader title={t('inventoryTitle')} subtitle={store.name} />
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon="car-outline"
              title={t('emptyInventory')}
              subtitle={t('emptyInventorySub')}
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
});
