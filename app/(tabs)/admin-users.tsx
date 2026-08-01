import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Redirect, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Profile } from '../../lib/types';
import { colors, radius, shadow, spacing } from '../../lib/theme';
import { ROW, RTL_TEXT } from '../../lib/rtl';
import { useI18n } from '../../lib/i18n';
import { Badge, Button, EmptyState, SearchBar, ScreenHeader } from '../../components/ui';
import { TopBar } from '../../components/TopBar';

export default function AdminUsers() {
  const { mode, isAdmin, profile: me } = useAuth();
  const { t } = useI18n();
  const [users, setUsers] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    let q = supabase.from('profiles').select('*').order('created_at', { ascending: false });
    const s = search.trim();
    if (s) q = q.or(`full_name.ilike.%${s}%,phone.ilike.%${s}%`);
    const { data } = await q.limit(200);
    setUsers((data ?? []) as Profile[]);
    setLoading(false);
  }, [search]);

  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(fetchUsers, search ? 300 : 0);
      return () => clearTimeout(timer);
    }, [fetchUsers, search])
  );

  if (mode !== 'admin' || !isAdmin) return <Redirect href="/(tabs)" />;

  async function toggleBan(user: Profile) {
    const { error } = await supabase
      .from('profiles')
      .update({ is_banned: !user.is_banned })
      .eq('id', user.id);
    if (error) Alert.alert(t('error'), error.message);
    else fetchUsers();
  }

  async function toggleAdmin(user: Profile) {
    const newRole = user.role === 'admin' ? 'customer' : 'admin';
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', user.id);
    if (error) Alert.alert(t('error'), error.message);
    else fetchUsers();
  }

  async function resetPassword(user: Profile) {
    Alert.alert(t('resetPassword'), t('resetPasswordBody'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('resetPassword'),
        onPress: async () => {
          const tempPassword = String(Math.floor(100000 + Math.random() * 900000));
          const { data, error } = await supabase.functions.invoke('admin-reset-password', {
            body: { targetUserId: user.id, newPassword: tempPassword },
          });
          if (error || data?.error) {
            Alert.alert(t('error'), error?.message ?? data?.error ?? '');
          } else {
            Alert.alert(t('passwordResetSuccess'), `${t('tempPassword')}: ${tempPassword}`);
          }
        },
      },
    ]);
  }

  async function onRefresh() {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  }

  const roleLabel = (r: Profile['role']) =>
    r === 'admin' ? t('admin') : r === 'dealer' ? t('dealer') : t('customer');

  return (
    <View style={styles.safe}>
      <TopBar />
      <FlatList
        data={users}
        keyExtractor={(u) => u.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.md }}>
            <ScreenHeader title={t('users')} />
            <View style={{ marginTop: spacing.md }}>
              <SearchBar value={search} onChangeText={setSearch} placeholder={t('searchVehicles')} />
            </View>
          </View>
        }
        ListEmptyComponent={loading ? null : <EmptyState icon="people-outline" title={t('users')} />}
        renderItem={({ item: user }) => (
          <View style={styles.card}>
            <View style={[ROW, styles.cardHeader]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, RTL_TEXT]}>{user.full_name || '—'}</Text>
                <Text style={[styles.cardSub, RTL_TEXT]}>
                  {user.phone || '—'}
                  {user.city ? ` · ${user.city}` : ''}
                </Text>
              </View>
              <Badge
                label={roleLabel(user.role)}
                tone={user.role === 'admin' ? 'danger' : user.role === 'dealer' ? 'accent' : 'neutral'}
              />
              {user.is_banned && <Badge label={t('banned')} tone="danger" />}
            </View>
            {user.id !== me?.id && (
              <View style={[ROW, styles.actionRow]}>
                <Button
                  title={user.is_banned ? t('unban') : t('ban')}
                  small
                  variant={user.is_banned ? 'outline' : 'danger'}
                  onPress={() => toggleBan(user)}
                />
                {user.role !== 'dealer' && (
                  <Button
                    title={user.role === 'admin' ? t('removeAdmin') : t('makeAdmin')}
                    small
                    variant="outline"
                    onPress={() => toggleAdmin(user)}
                  />
                )}
                <Button
                  title={t('resetPassword')}
                  small
                  variant="outline"
                  icon="key-outline"
                  onPress={() => resetPassword(user)}
                />
              </View>
            )}
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
