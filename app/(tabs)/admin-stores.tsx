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
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Store } from '../../lib/types';
import { colors, radius, shadow, spacing } from '../../lib/theme';
import { ROW, RTL_TEXT } from '../../lib/rtl';
import { useI18n } from '../../lib/i18n';
import { Badge, Button, EmptyState, SearchBar, ScreenHeader } from '../../components/ui';
import { TopBar } from '../../components/TopBar';

interface AdminStore extends Store {
  owner?: { full_name: string; phone: string } | null;
}

export default function AdminStores() {
  const { mode, isAdmin } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [stores, setStores] = useState<AdminStore[]>([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchStores = useCallback(async () => {
    let q = supabase
      .from('stores')
      .select('*, vehicles(count), owner:profiles!stores_owner_id_fkey(full_name, phone)')
      .order('created_at', { ascending: false });
    const s = search.trim();
    if (s) q = q.or(`name.ilike.%${s}%,city.ilike.%${s}%`);
    const { data } = await q;
    setStores((data ?? []) as AdminStore[]);
    setLoading(false);
  }, [search]);

  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(fetchStores, search ? 300 : 0);
      return () => clearTimeout(timer);
    }, [fetchStores, search])
  );

  if (mode !== 'admin' || !isAdmin) return <Redirect href="/(tabs)" />;

  async function toggleVerified(store: AdminStore) {
    const { error } = await supabase
      .from('stores')
      .update({ is_verified: !store.is_verified })
      .eq('id', store.id);
    if (error) Alert.alert(t('error'), error.message);
    else fetchStores();
  }

  function deleteStore(store: AdminStore) {
    Alert.alert(t('deleteConfirmTitle'), `${store.name} — ${t('deleteConfirmBody')}`, [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('stores').delete().eq('id', store.id);
          if (error) Alert.alert(t('error'), error.message);
          else fetchStores();
        },
      },
    ]);
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
        data={stores}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.md }}>
            <ScreenHeader title={t('tabStores')} />
            <View style={{ marginTop: spacing.md }}>
              <SearchBar value={search} onChangeText={setSearch} placeholder={t('searchStores')} />
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? null : <EmptyState icon="storefront-outline" title={t('noStores')} />
        }
        renderItem={({ item: store }) => (
          <View style={styles.card}>
            <TouchableOpacity
              style={[ROW, styles.cardHeader]}
              onPress={() => router.push(`/store/${store.id}`)}
            >
              <View style={styles.logo}>
                <Text style={styles.logoText}>{store.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={[ROW, { alignItems: 'center', gap: 6 }]}>
                  <Text style={[styles.cardTitle, RTL_TEXT]}>{store.name}</Text>
                  {store.is_verified && (
                    <Ionicons name="checkmark-circle" size={15} color={colors.accent} />
                  )}
                </View>
                <Text style={[styles.cardSub, RTL_TEXT]}>
                  {store.owner?.full_name ?? '—'} · {store.owner?.phone ?? '—'}
                </Text>
                <Text style={[styles.cardSub, RTL_TEXT]}>
                  {store.city ? `${store.city} · ` : ''}
                  {store.vehicles?.[0]?.count ?? 0} {t('vehiclesCount')}
                  {store.rating_count > 0 ? ` · ★${store.rating_avg} (${store.rating_count})` : ''}
                </Text>
              </View>
              <Ionicons name="chevron-back" size={18} color={colors.textFaint} />
            </TouchableOpacity>
            <View style={[ROW, styles.actionRow]}>
              <Button
                title={store.is_verified ? t('unverifyStore') : t('verifyStore')}
                small
                variant={store.is_verified ? 'danger' : 'outline'}
                icon="checkmark-circle"
                onPress={() => toggleVerified(store)}
              />
              <Button
                title={t('delete')}
                small
                variant="danger"
                icon="trash"
                onPress={() => deleteStore(store)}
              />
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
  cardHeader: { alignItems: 'center', gap: spacing.md },
  logo: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: colors.accent, fontSize: 18, fontWeight: '800' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  cardSub: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  actionRow: { gap: spacing.sm, marginTop: spacing.md },
});
