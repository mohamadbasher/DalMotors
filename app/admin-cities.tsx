import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useFocusEffect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { AREAS, City, areaLabel, getCities, invalidateCities } from '../lib/cities';
import { colors, radius, shadow, spacing } from '../lib/theme';
import { ROW, RTL_TEXT } from '../lib/rtl';
import { useI18n } from '../lib/i18n';
import { Button, Chip, Input } from '../components/ui';

export default function AdminCities() {
  const { isAdmin } = useAuth();
  const { t, lang } = useI18n();
  const [cities, setCities] = useState<City[]>([]);
  const [nameHe, setNameHe] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [area, setArea] = useState<string>(AREAS[0]);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setCities(await getCities(true));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!isAdmin) return <Redirect href="/(tabs)" />;

  function startEdit(city: City) {
    setEditId(city.id);
    setNameHe(city.name_he);
    setNameAr(city.name_ar);
    setArea(city.area);
  }

  function resetForm() {
    setEditId(null);
    setNameHe('');
    setNameAr('');
    setArea(AREAS[0]);
  }

  async function handleSave() {
    if (!nameHe.trim()) {
      Alert.alert(t('missingInfo'), t('cityNameHe'));
      return;
    }
    setSaving(true);
    const payload = { name_he: nameHe.trim(), name_ar: nameAr.trim(), area };
    const { error } = editId
      ? await supabase.from('cities').update(payload).eq('id', editId)
      : await supabase.from('cities').insert(payload);
    setSaving(false);
    if (error) Alert.alert(t('error'), error.message);
    else {
      invalidateCities();
      resetForm();
      load();
    }
  }

  function handleDelete(city: City) {
    Alert.alert(t('deleteConfirmTitle'), `${city.name_he} — ${t('deleteConfirmBody')}`, [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('cities').delete().eq('id', city.id);
          if (error) Alert.alert(t('error'), error.message);
          else {
            invalidateCities();
            load();
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.safe}>
      <FlatList
        data={cities}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.form}>
            <Text style={[styles.formTitle, RTL_TEXT]}>
              {editId ? t('update') : t('addCity')}
            </Text>
            <Input label={t('cityNameHe')} value={nameHe} onChangeText={setNameHe} />
            <Input label={t('cityNameAr')} value={nameAr} onChangeText={setNameAr} />
            <Text style={[styles.label, RTL_TEXT]}>{t('area')}</Text>
            <View style={[ROW, styles.chips]}>
              {AREAS.map((a) => (
                <Chip
                  key={a}
                  label={areaLabel(a, lang)}
                  selected={area === a}
                  onPress={() => setArea(a)}
                />
              ))}
            </View>
            <View style={[ROW, { gap: spacing.sm }]}>
              <Button
                title={editId ? t('update') : t('addCity')}
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
        renderItem={({ item: city }) => (
          <TouchableOpacity
            style={[ROW, styles.row]}
            onPress={() => startEdit(city)}
            activeOpacity={0.7}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.cityName, RTL_TEXT]}>
                {city.name_he}
                {city.name_ar ? `  ·  ${city.name_ar}` : ''}
              </Text>
              <Text style={[styles.cityArea, RTL_TEXT]}>{areaLabel(city.area, lang)}</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(city)} style={styles.deleteBtn} hitSlop={6}>
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
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 6 },
  chips: { flexWrap: 'wrap', gap: 6, marginBottom: spacing.md },
  row: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: 6,
    ...shadow.card,
  },
  cityName: { fontSize: 14.5, fontWeight: '700', color: colors.text },
  cityArea: { fontSize: 12, color: colors.textFaint, marginTop: 1 },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
