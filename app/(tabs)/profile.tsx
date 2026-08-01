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
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Vehicle } from '../../lib/types';
import { colors, radius, shadow, spacing } from '../../lib/theme';
import { ROW, RTL_TEXT } from '../../lib/rtl';
import { LANG_NAMES, showLanguagePicker, useI18n } from '../../lib/i18n';
import { Badge, EmptyState } from '../../components/ui';
import { VehicleCard } from '../../components/VehicleCard';
import { TopBar } from '../../components/TopBar';

export default function Profile() {
  const { session, profile, store, isDealer, isAdmin, mode, setMode, signOut } = useAuth();
  const { t, lang, setLang } = useI18n();
  const router = useRouter();
  const [listings, setListings] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchListings = useCallback(async () => {
    if (!session) return;
    const { data, error } = await supabase
      .from('vehicles')
      .select('*, store:stores(id, name)')
      .eq('seller_id', session.user.id)
      .order('created_at', { ascending: false });
    if (!error && data) setListings(data as Vehicle[]);
    setLoading(false);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      fetchListings();
    }, [fetchListings])
  );

  async function onRefresh() {
    setRefreshing(true);
    await fetchListings();
    setRefreshing(false);
  }

  function handleSignOut() {
    Alert.alert(t('signOut'), t('signOutConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('signOut'), style: 'destructive', onPress: () => signOut() },
    ]);
  }

  const roleLabel = isAdmin ? t('admin') : isDealer ? t('dealer') : t('customer');
  const roleTone = isAdmin ? 'danger' : isDealer ? 'accent' : 'neutral';

  return (
    <View style={styles.safe}>
      <TopBar />
      <FlatList
        data={listings}
        keyExtractor={(v) => v.id}
        renderItem={({ item }) => <VehicleCard vehicle={item} />}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View>
            {/* profile card */}
            <View style={[ROW, styles.profileCard]}>
              <LinearGradient
                colors={['#1E335E', '#101C33']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(profile?.full_name ?? '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, RTL_TEXT]}>{profile?.full_name}</Text>
                <Text style={[styles.email, RTL_TEXT]}>{profile?.phone}</Text>
                <View style={{ marginTop: 6, alignSelf: 'flex-end' }}>
                  <Badge label={roleLabel} tone={roleTone as any} />
                </View>
              </View>
            </View>

            {/* dealer: one-click account switch */}
            {isDealer && (
              <ActionRow
                icon={mode === 'store' ? 'person-outline' : 'storefront-outline'}
                label={mode === 'store' ? t('switchToPersonal') : t('switchToStore')}
                highlight
                onPress={() => setMode(mode === 'store' ? 'personal' : 'store')}
              />
            )}
            {/* customer: become a dealer */}
            {!isDealer && (
              <ActionRow
                icon="storefront-outline"
                label={t('becomeDealer')}
                sub={t('becomeDealerSub')}
                highlight
                onPress={() => router.push('/become-dealer')}
              />
            )}
            {/* settings */}
            <ActionRow
              icon="settings-outline"
              label={t('settings')}
              onPress={() => router.push('/settings')}
            />
            {!isDealer && (
              <ActionRow
                icon="bookmark-outline"
                label={t('mySavedSearches')}
                onPress={() => router.push('/saved-searches')}
              />
            )}
            {/* language */}
            <ActionRow
              icon="language-outline"
              label={t('language')}
              sub={LANG_NAMES[lang]}
              onPress={() => showLanguagePicker(setLang, t('cancel'))}
            />
            {isAdmin && mode !== 'admin' && (
              <ActionRow
                icon="shield-checkmark-outline"
                label={t('switchToAdmin')}
                highlight
                onPress={() => setMode('admin')}
              />
            )}
            <ActionRow icon="log-out-outline" label={t('signOut')} danger onPress={handleSignOut} />

            <Text style={[styles.sectionTitle, RTL_TEXT]}>
              {t('myListings')} {listings.length ? `(${listings.length})` : ''}
            </Text>
          </View>
        }
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon="pricetag-outline"
              title={t('noListings')}
              subtitle={t('noListingsSub')}
            />
          )
        }
      />
    </View>
  );
}

function ActionRow({
  icon,
  label,
  sub,
  onPress,
  danger,
  highlight,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  sub?: string;
  onPress: () => void;
  danger?: boolean;
  highlight?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[ROW, styles.actionRow, highlight && styles.actionRowHighlight]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons
        name={icon}
        size={20}
        color={danger ? colors.danger : highlight ? '#B45309' : colors.primary}
      />
      <View style={{ flex: 1 }}>
        <Text style={[styles.actionLabel, RTL_TEXT, danger && { color: colors.danger }]}>
          {label}
        </Text>
        {sub ? <Text style={[styles.actionSub, RTL_TEXT]}>{sub}</Text> : null}
      </View>
      <Ionicons name="chevron-back" size={18} color={colors.textFaint} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, paddingBottom: spacing.xl },
  profileCard: {
    alignItems: 'center',
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: { width: 60, height: 60, borderRadius: 30 },
  avatarText: { color: colors.accent, fontSize: 26, fontWeight: '800' },
  name: { color: '#FFFFFF', fontSize: 19, fontWeight: '800' },
  email: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 2 },
  actionRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  actionRowHighlight: { backgroundColor: colors.accentSoft },
  actionLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  actionSub: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
});
