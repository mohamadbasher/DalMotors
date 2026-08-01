import React, { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { colors, spacing } from '../lib/theme';
import { RTL_TEXT } from '../lib/rtl';
import { useI18n } from '../lib/i18n';
import { Button, Input } from '../components/ui';
import { CityPicker } from '../components/CityPicker';

export default function EditStore() {
  const { store, refresh } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (store) {
        setName(store.name ?? '');
        setDescription(store.description ?? '');
        setCity(store.city ?? null);
        setPhone(store.phone ?? '');
      }
    }, [store])
  );

  async function handleSave() {
    if (!store) return;
    if (!name.trim()) {
      Alert.alert(t('missingInfo'), t('storeName'));
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
        <Button title={t('save')} onPress={handleSave} loading={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg },
  hint: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.lg },
});
