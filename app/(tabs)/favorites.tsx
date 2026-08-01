import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Favorite, Vehicle } from '../../lib/types';
import { colors, spacing } from '../../lib/theme';
import { useI18n } from '../../lib/i18n';
import { EmptyState, ScreenHeader } from '../../components/ui';
import { VehicleCard } from '../../components/VehicleCard';
import { TopBar } from '../../components/TopBar';

export default function Favorites() {
  const { session } = useAuth();
  const { t } = useI18n();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFavorites = useCallback(async () => {
    if (!session) return;
    const { data, error } = await supabase
      .from('favorites')
      .select('*, vehicle:vehicles(*, store:stores(id, name))')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setVehicles(
        (data as Favorite[])
          .map((f) => f.vehicle)
          .filter((v): v is Vehicle => !!v && v.status !== 'removed')
      );
    }
    setLoading(false);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      fetchFavorites();
    }, [fetchFavorites])
  );

  async function onRefresh() {
    setRefreshing(true);
    await fetchFavorites();
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
            <ScreenHeader title={t('tabSaved')} subtitle={t('savedSub')} />
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState icon="heart-outline" title={t('nothingSaved')} subtitle={t('tapHeart')} />
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
