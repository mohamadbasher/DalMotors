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
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../lib/theme';
import { ROW, RTL_TEXT } from '../lib/rtl';
import { useI18n } from '../lib/i18n';
import { AREAS, City, areaLabel, cityLabel, getCities } from '../lib/cities';

interface CityPickerProps {
  value: string | null; // canonical Hebrew city name
  onChange: (cityNameHe: string) => void;
  label?: string;
  allowClear?: boolean;
}

/** Bottom-sheet city picker: area chips → searchable city list. */
export function CityPicker({ value, onChange, label, allowClear }: CityPickerProps) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [area, setArea] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open) getCities().then(setCities);
  }, [open]);

  const filtered = useMemo(() => {
    let list = cities;
    if (area) list = list.filter((c) => c.area === area);
    const s = search.trim();
    if (s) list = list.filter((c) => c.name_he.includes(s) || c.name_ar.includes(s));
    return list;
  }, [cities, area, search]);

  const selectedCity = cities.find((c) => c.name_he === value);
  const display = value
    ? selectedCity
      ? cityLabel(selectedCity, lang)
      : value
    : t('chooseCity');

  return (
    <View style={{ marginBottom: spacing.md }}>
      {label ? <Text style={[styles.label, RTL_TEXT]}>{label}</Text> : null}
      <TouchableOpacity style={[ROW, styles.field]} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Ionicons name="location-outline" size={18} color={colors.textFaint} />
        <Text style={[styles.fieldText, RTL_TEXT, !value && { color: colors.textFaint }]}>
          {display}
        </Text>
        {allowClear && value ? (
          <TouchableOpacity onPress={() => onChange('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textFaint} />
          </TouchableOpacity>
        ) : (
          <Ionicons name="chevron-down" size={16} color={colors.textFaint} />
        )}
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={[ROW, styles.sheetHeader]}>
              <Text style={styles.sheetTitle}>{t('chooseCity')}</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* area chips */}
            <FlatList
              horizontal
              inverted
              showsHorizontalScrollIndicator={false}
              data={['__all__', ...AREAS]}
              keyExtractor={(a) => a}
              style={{ flexGrow: 0, marginBottom: spacing.sm }}
              ItemSeparatorComponent={() => <View style={{ width: 6 }} />}
              renderItem={({ item: a }) => {
                const isAll = a === '__all__';
                const selected = isAll ? area === null : area === a;
                return (
                  <TouchableOpacity
                    style={[styles.chip, selected && styles.chipOn]}
                    onPress={() => setArea(isAll ? null : area === a ? null : a)}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextOn]}>
                      {isAll ? t('allAreas') : areaLabel(a, lang)}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />

            {/* search */}
            <View style={[ROW, styles.search]}>
              <Ionicons name="search" size={17} color={colors.textFaint} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={t('searchCity')}
                placeholderTextColor={colors.textFaint}
                style={[styles.searchInput, RTL_TEXT]}
              />
            </View>

            <FlatList
              data={filtered}
              keyExtractor={(c) => c.id}
              style={{ maxHeight: 340 }}
              renderItem={({ item: c }) => (
                <TouchableOpacity
                  style={[ROW, styles.cityRow]}
                  onPress={() => {
                    onChange(c.name_he);
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  <Text style={[styles.cityName, RTL_TEXT]}>{cityLabel(c, lang)}</Text>
                  <Text style={styles.cityArea}>{areaLabel(c.area, lang)}</Text>
                  {value === c.name_he && (
                    <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
                  )}
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
  chip: {
    backgroundColor: colors.chipBg,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: radius.full,
  },
  chipOn: { backgroundColor: colors.primary },
  chipText: { fontSize: 12.5, fontWeight: '600', color: colors.textMuted },
  chipTextOn: { color: '#FFFFFF' },
  search: {
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.chipBg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 42,
    marginBottom: spacing.sm,
  },
  searchInput: { flex: 1, fontSize: 14.5, color: colors.text },
  cityRow: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cityName: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  cityArea: { fontSize: 12, color: colors.textFaint },
});
