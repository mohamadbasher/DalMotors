import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useFocusEffect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { uploadBanner } from '../lib/upload';
import { Banner } from '../lib/types';
import { colors, radius, shadow, spacing } from '../lib/theme';
import { ROW, RTL_TEXT } from '../lib/rtl';
import { useI18n } from '../lib/i18n';
import { Badge, Button, EmptyState, Input, SectionHeader } from '../components/ui';

export default function AdminBanners() {
  const { session, isAdmin } = useAuth();
  const { t } = useI18n();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [link, setLink] = useState('');
  const [days, setDays] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('banners')
      .select('*')
      .order('sort', { ascending: true })
      .order('created_at', { ascending: false });
    setBanners((data ?? []) as Banner[]);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!isAdmin) return <Redirect href="/(tabs)" />;

  async function pickImage() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [5, 2],
      quality: 0.85,
    });
    if (!res.canceled && res.assets?.[0]) setPicked(res.assets[0].uri);
  }

  async function create() {
    if (!session || !picked) return;
    setSaving(true);
    try {
      const image_url = await uploadBanner(session.user.id, picked);
      const dayCount = parseInt(days, 10);
      const { error } = await supabase.from('banners').insert({
        image_url,
        link: link.trim() || null,
        sort: banners.length,
        expires_at:
          dayCount > 0 ? new Date(Date.now() + dayCount * 86400000).toISOString() : null,
      });
      if (error) throw error;
      setPicked(null);
      setLink('');
      setDays('');
      load();
    } catch (e: any) {
      Alert.alert(t('error'), e.message ?? '');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(banner: Banner) {
    const { error } = await supabase
      .from('banners')
      .update({ is_active: !banner.is_active })
      .eq('id', banner.id);
    if (error) Alert.alert(t('error'), error.message);
    else load();
  }

  function remove(banner: Banner) {
    Alert.alert(t('deleteConfirmTitle'), t('deleteConfirmBody'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          await supabase.from('banners').delete().eq('id', banner.id);
          load();
        },
      },
    ]);
  }

  function expiryLabel(iso: string | null): string {
    if (!iso) return t('bannerPermanent');
    const left = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
    return left <= 0 ? t('bannerExpired') : `${t('bannerDaysLeft')} ${left}`;
  }

  return (
    <FlatList
      style={styles.safe}
      data={banners}
      keyExtractor={(b) => b.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View style={styles.form}>
          <SectionHeader title={t('addBanner')} />
          <TouchableOpacity style={styles.picker} onPress={pickImage} activeOpacity={0.75}>
            {picked ? (
              <Image source={{ uri: picked }} style={styles.preview} contentFit="cover" />
            ) : (
              <View style={styles.pickerEmpty}>
                <Ionicons name="image-outline" size={28} color={colors.textFaint} />
                <Text style={styles.pickerText}>{t('bannerImage')}</Text>
              </View>
            )}
          </TouchableOpacity>
          <Input value={link} onChangeText={setLink} placeholder={t('bannerLink')} autoCapitalize="none" />
          <Input
            value={days}
            onChangeText={setDays}
            placeholder={t('bannerDays')}
            keyboardType="number-pad"
          />
          <Button
            title={t('addBanner')}
            icon="add"
            onPress={create}
            loading={saving}
            disabled={!picked}
          />
        </View>
      }
      ListEmptyComponent={
        loading ? null : <EmptyState icon="images-outline" title={t('noBanners')} />
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Image source={{ uri: item.image_url }} style={styles.cardImage} contentFit="cover" />
          <View style={[ROW, styles.cardBody]}>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={[ROW, { gap: 6, alignItems: 'center' }]}>
                <Badge
                  label={item.is_active ? t('active') : t('deactivate')}
                  tone={item.is_active ? 'success' : 'neutral'}
                />
                <Text style={styles.expiry}>{expiryLabel(item.expires_at)}</Text>
              </View>
              {item.link ? (
                <Text style={[styles.link, RTL_TEXT]} numberOfLines={1}>
                  {item.link}
                </Text>
              ) : null}
            </View>
            <Button
              title={item.is_active ? t('deactivate') : t('activate')}
              small
              variant="outline"
              onPress={() => toggle(item)}
            />
            <TouchableOpacity onPress={() => remove(item)} style={styles.deleteBtn} hitSlop={6}>
              <Ionicons name="trash-outline" size={17} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },
  form: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  picker: { marginBottom: spacing.md },
  preview: { width: '100%', aspectRatio: 5 / 2, borderRadius: radius.md },
  pickerEmpty: {
    width: '100%',
    aspectRatio: 5 / 2,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  pickerText: { fontSize: 13, color: colors.textFaint, fontWeight: '600' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  cardImage: { width: '100%', aspectRatio: 5 / 2 },
  cardBody: { alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  expiry: { fontSize: 12, color: colors.textMuted },
  link: { fontSize: 11.5, color: colors.textFaint },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
