import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../lib/theme';
import { ROW, RTL_TEXT } from '../lib/rtl';
import { useI18n } from '../lib/i18n';
import { Brand, getBrands } from '../lib/brands';

interface BrandPickerProps {
  value: string | null; // brand name
  onChange: (name: string) => void;
  label?: string;
}

/** Bottom-sheet brand picker with real logos, searchable grid. */
export function BrandPicker({ value, onChange, label }: BrandPickerProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open) getBrands().then(setBrands);
  }, [open]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return s ? brands.filter((b) => b.name.toLowerCase().includes(s)) : brands;
  }, [brands, search]);

  const selected = brands.find((b) => b.name === value);

  return (
    <View style={{ marginBottom: spacing.md }}>
      {label ? <Text style={[styles.label, RTL_TEXT]}>{label}</Text> : null}
      <TouchableOpacity style={[ROW, styles.field]} onPress={() => setOpen(true)} activeOpacity={0.7}>
        {selected?.logo_url ? (
          <Image source={{ uri: selected.logo_url }} style={styles.fieldLogo} contentFit="contain" />
        ) : (
          <Ionicons name="car-sport-outline" size={18} color={colors.textFaint} />
        )}
        <Text style={[styles.fieldText, RTL_TEXT, !value && { color: colors.textFaint }]}>
          {value || t('selectBrand')}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textFaint} />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={[ROW, styles.sheetHeader]}>
              <Text style={styles.sheetTitle}>{t('selectBrand')}</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={[ROW, styles.search]}>
              <Ionicons name="search" size={17} color={colors.textFaint} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Toyota, Kia…"
                placeholderTextColor={colors.textFaint}
                style={[styles.searchInput, RTL_TEXT]}
                autoCapitalize="none"
              />
            </View>
            <FlatList
              data={filtered}
              keyExtractor={(b) => b.id}
              numColumns={4}
              style={{ maxHeight: 380 }}
              columnWrapperStyle={{ flexDirection: 'row-reverse', gap: 8 }}
              contentContainerStyle={{ gap: 8 }}
              renderItem={({ item: b }) => (
                <TouchableOpacity
                  style={[styles.tile, value === b.name && styles.tileOn]}
                  onPress={() => {
                    onChange(b.name);
                    setOpen(false);
                    setSearch('');
                  }}
                  activeOpacity={0.75}
                >
                  {b.logo_url ? (
                    <Image source={{ uri: b.logo_url }} style={styles.logo} contentFit="contain" />
                  ) : (
                    <Ionicons name="car-sport" size={26} color={colors.textMuted} />
                  )}
                  <Text style={styles.tileName} numberOfLines={1}>
                    {b.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 6 },
  field: {
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: 48,
  },
  fieldLogo: { width: 22, height: 18 },
  fieldText: { flex: 1, fontSize: 15, color: colors.text, fontWeight: '500' },
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  sheetHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sheetTitle: { fontSize: 19, fontWeight: '800', color: colors.text },
  search: {
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.chipBg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 42,
    marginBottom: spacing.md,
  },
  searchInput: { flex: 1, fontSize: 14.5, color: colors.text },
  tile: {
    flex: 1,
    maxWidth: '25%',
    aspectRatio: 1,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 4,
  },
  tileOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  logo: { width: 34, height: 28 },
  tileName: { fontSize: 9, fontWeight: '700', color: colors.textMuted },
});
