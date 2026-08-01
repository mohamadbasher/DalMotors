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
import { Brand, getBrands, invalidateBrands } from '../lib/brands';
import { colors, radius, shadow, spacing } from '../lib/theme';
import { ROW, RTL_TEXT } from '../lib/rtl';
import { useI18n } from '../lib/i18n';
import { Button, Input } from '../components/ui';

export default function AdminBrands() {
  const { isAdmin } = useAuth();
  const { t } = useI18n();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [name, setName] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null); // local pick
  const [existingLogo, setExistingLogo] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setBrands(await getBrands(true));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!isAdmin) return <Redirect href="/(tabs)" />;

  async function pickLogo() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) setLogoUri(result.assets[0].uri);
  }

  function startEdit(brand: Brand) {
    setEditId(brand.id);
    setName(brand.name);
    setExistingLogo(brand.logo_url);
    setLogoUri(null);
  }

  function resetForm() {
    setEditId(null);
    setName('');
    setLogoUri(null);
    setExistingLogo(null);
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert(t('missingInfo'), t('brandName'));
      return;
    }
    setSaving(true);
    try {
      let logo_url = existingLogo;
      if (logoUri) {
        const path = `logos/${name.trim().toLowerCase().replace(/\s+/g, '-')}_${Date.now()}.png`;
        const buf = await fetch(logoUri).then((r) => r.arrayBuffer());
        const { error: upErr } = await supabase.storage
          .from('brands')
          .upload(path, buf, { contentType: 'image/png', upsert: true });
        if (upErr) throw upErr;
        logo_url = supabase.storage.from('brands').getPublicUrl(path).data.publicUrl;
      }
      const payload = { name: name.trim(), logo_url, sort: editId ? undefined : brands.length };
      const { error } = editId
        ? await supabase.from('brands').update(payload).eq('id', editId)
        : await supabase.from('brands').insert(payload);
      if (error) throw error;
      invalidateBrands();
      resetForm();
      load();
    } catch (e: any) {
      Alert.alert(t('error'), e.message ?? '');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(brand: Brand) {
    Alert.alert(t('deleteConfirmTitle'), `${brand.name} — ${t('deleteConfirmBody')}`, [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('brands').delete().eq('id', brand.id);
          if (error) Alert.alert(t('error'), error.message);
          else {
            invalidateBrands();
            load();
          }
        },
      },
    ]);
  }

  const previewUri = logoUri ?? existingLogo;

  return (
    <View style={styles.safe}>
      <FlatList
        data={brands}
        keyExtractor={(b) => b.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.form}>
            <Text style={[styles.formTitle, RTL_TEXT]}>{editId ? t('update') : t('addBrand')}</Text>
            <Input
              label={t('brandName')}
              value={name}
              onChangeText={setName}
              placeholder="Toyota"
              autoCapitalize="words"
            />
            <TouchableOpacity style={[ROW, styles.logoPick]} onPress={pickLogo} activeOpacity={0.7}>
              {previewUri ? (
                <Image source={{ uri: previewUri }} style={styles.logoPreview} contentFit="contain" />
              ) : (
                <Ionicons name="image-outline" size={26} color={colors.textFaint} />
              )}
              <Text style={[styles.logoPickText, RTL_TEXT]}>{t('uploadLogo')}</Text>
              <Ionicons name="cloud-upload-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
            <View style={[ROW, { gap: spacing.sm }]}>
              <Button
                title={editId ? t('update') : t('addBrand')}
                onPress={handleSave}
                loading={saving}
                style={{ flex: 2 }}
              />
              {editId && (
                <Button title={t('cancel')} variant="outline" onPress={resetForm} style={{ flex: 1 }} />
              )}
            </View>
          </View>
        }
        renderItem={({ item: brand }) => (
          <TouchableOpacity
            style={[ROW, styles.row]}
            onPress={() => startEdit(brand)}
            activeOpacity={0.7}
          >
            {brand.logo_url ? (
              <Image source={{ uri: brand.logo_url }} style={styles.logo} contentFit="contain" />
            ) : (
              <View style={[styles.logo, styles.logoPlaceholder]}>
                <Ionicons name="car-sport" size={18} color={colors.textFaint} />
              </View>
            )}
            <Text style={[styles.brandName, RTL_TEXT]}>{brand.name}</Text>
            <TouchableOpacity onPress={() => handleDelete(brand)} style={styles.deleteBtn} hitSlop={6}>
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
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },
  form: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  formTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: spacing.md },
  logoPick: {
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  logoPreview: { width: 44, height: 36 },
  logoPickText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.textMuted },
  row: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
    marginBottom: 6,
    ...shadow.card,
  },
  logo: { width: 40, height: 32 },
  logoPlaceholder: {
    backgroundColor: colors.chipBg,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
