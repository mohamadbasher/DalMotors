import React, { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { SavedSearch } from '../lib/types';
import { colors, radius, shadow, spacing } from '../lib/theme';
import { ROW, RTL_TEXT } from '../lib/rtl';
import { useI18n } from '../lib/i18n';
import { EmptyState } from '../components/ui';

export default function SavedSearches() {
  const { session } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSearches = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    setSearches((data ?? []) as SavedSearch[]);
    setLoading(false);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      fetchSearches();
    }, [fetchSearches])
  );

  function applySearch(s: SavedSearch) {
    router.push({ pathname: '/(tabs)', params: { savedSearch: JSON.stringify(s.filters) } });
  }

  function deleteSearch(s: SavedSearch) {
    Alert.alert(t('deleteSearch'), t('deleteConfirmBody'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          await supabase.from('saved_searches').delete().eq('id', s.id);
          fetchSearches();
        },
      },
    ]);
  }

  return (
    <View style={styles.safe}>
      <FlatList
        data={searches}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon="bookmark-outline"
              title={t('noSavedSearches')}
              subtitle={t('noSavedSearchesSub')}
            />
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[ROW, styles.card]}
            onPress={() => applySearch(item)}
            activeOpacity={0.7}
          >
            <View style={styles.icon}>
              <Ionicons name="bookmark" size={18} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, RTL_TEXT]}>{item.name}</Text>
            </View>
            <TouchableOpacity onPress={() => deleteSearch(item)} style={styles.deleteBtn} hitSlop={6}>
              <Ionicons name="trash-outline" size={17} color={colors.danger} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, paddingBottom: spacing.xl },
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 14.5, fontWeight: '700', color: colors.text },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
