import React, { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { colors, radius, shadow, spacing } from '../lib/theme';
import { ROW, RTL_TEXT } from '../lib/rtl';
import { useI18n } from '../lib/i18n';
import { DayHours, defaultHours, hoursError, parseHours } from '../lib/hours';
import { Button, Input, SectionHeader } from '../components/ui';
import { CityPicker } from '../components/CityPicker';
import { HoursEditor } from '../components/HoursEditor';
import { MapPicker, type LatLng } from '../components/MapPicker';

export default function EditStore() {
  const { store, refresh } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const [hours, setHours] = useState<DayHours[]>(defaultHours());
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (store) {
        setName(store.name ?? '');
        setDescription(store.description ?? '');
        setCity(store.city ?? null);
        setPhone(store.phone ?? '');
        setIsOpen(store.is_open ?? true);
        setHours(parseHours(store.hours) ?? defaultHours());
        setCoords(store.lat != null && store.lng != null ? { lat: store.lat, lng: store.lng } : null);
      }
    }, [store])
  );

  async function handleSave() {
    if (!store) return;
    if (!name.trim()) {
      Alert.alert(t('missingInfo'), t('storeName'));
      return;
    }
    const hoursProblem = hoursError(hours);
    if (hoursProblem) {
      Alert.alert(t('error'), t(hoursProblem));
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('stores')
      .update({
        name: name.trim(),
        description: description.trim() || null,
        city: city || null,
        phone: phone.trim() || null,
        is_open: isOpen,
        hours,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
      })
      .eq('id', store.id);
    setSaving(false);
    if (error) Alert.alert(t('error'), error.message);
    else {
      await refresh();
      Alert.alert(t('saved'), t('savedBody'));
      router.back();
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={[styles.hint, RTL_TEXT]}>{t('storeSettingsHint')}</Text>

        <Input label={t('storeName')} value={name} onChangeText={setName} />
        <Input
          label={t('storeDesc')}
          value={description}
          onChangeText={setDescription}
          placeholder={t('storeDescPlaceholder')}
          multiline
          numberOfLines={3}
          style={{ height: 84, textAlignVertical: 'top' }}
        />
        <CityPicker label={t('city')} value={city} onChange={setCity} />
        <Input label={t('phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

        {/* open / closed master switch */}
        <View style={[ROW, styles.switchCard]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.switchLabel, RTL_TEXT]}>{t('storeOpenStatus')}</Text>
            <Text style={[styles.switchState, RTL_TEXT, { color: isOpen ? colors.success : colors.danger }]}>
              {isOpen ? t('openNow') : t('closedNow')}
            </Text>
          </View>
          <Switch
            value={isOpen}
            onValueChange={setIsOpen}
            trackColor={{ false: colors.border, true: '#A7E8BF' }}
            thumbColor={isOpen ? colors.success : '#FBFAF9'}
          />
        </View>

        {/* exact location */}
        <SectionHeader title={t('storeLocation')} />
        <TouchableOpacity
          style={[ROW, styles.mapRow]}
          onPress={() => setMapOpen(true)}
          activeOpacity={0.75}
        >
          <View style={styles.mapIcon}>
            <Ionicons name="location" size={19} color={colors.accent} />
          </View>
          <Text style={[styles.mapText, RTL_TEXT]}>
            {coords ? t('changeLocation') : t('pickOnMap')}
          </Text>
          {coords ? (
            <Ionicons name="checkmark-circle" size={19} color={colors.success} />
          ) : (
            <Ionicons name="chevron-back" size={18} color={colors.textFaint} />
          )}
        </TouchableOpacity>
        {!coords && <Text style={[styles.subtle, RTL_TEXT]}>{t('noLocationSet')}</Text>}

        {/* weekly hours */}
        <SectionHeader title={t('openingHours')} />
        <View style={styles.hoursCard}>
          <HoursEditor value={hours} onChange={setHours} />
        </View>

        <Button title={t('save')} onPress={handleSave} loading={saving} style={{ marginTop: spacing.lg }} />
        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      <MapPicker
        visible={mapOpen}
        initial={coords}
        onClose={() => setMapOpen(false)}
        onConfirm={(c) => {
          setCoords(c);
          setMapOpen(false);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg },
  hint: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.lg },
  switchCard: {
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    ...shadow.card,
  },
  switchLabel: { fontSize: 14.5, fontWeight: '700', color: colors.text },
  switchState: { fontSize: 12.5, fontWeight: '800', marginTop: 2 },
  mapRow: {
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    ...shadow.card,
  },
  mapIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapText: { flex: 1, fontSize: 14.5, fontWeight: '700', color: colors.text },
  subtle: { fontSize: 12, color: colors.textFaint, marginTop: 6 },
  hoursCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    ...shadow.card,
  },
});
