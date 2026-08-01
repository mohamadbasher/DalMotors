import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing } from '../lib/theme';
import { RTL_TEXT } from '../lib/rtl';
import { useI18n } from '../lib/i18n';
import { Button, Input } from '../components/ui';
import { CityPicker } from '../components/CityPicker';

export default function BecomeDealer() {
  const { becomeDealer, profile } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [storeName, setStoreName] = useState('');
  const [city, setCity] = useState<string | null>(profile?.city ?? null);
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!storeName.trim()) {
      Alert.alert(t('missingInfo'), t('storeName'));
      return;
    }
    if (!city) {
      Alert.alert(t('missingInfo'), t('chooseCity'));
      return;
    }
    setLoading(true);
    const { error } = await becomeDealer({ storeName, city: city ?? '', phone, description });
    setLoading(false);
    if (error) Alert.alert(t('error'), error);
    else {
      Alert.alert(t('storeCreated'), t('storeCreatedBody'), [
        { text: t('ok'), onPress: () => router.replace('/(tabs)/dashboard') },
      ]);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="storefront" size={30} color={colors.accent} />
          </View>
          <Text style={[styles.heroText, RTL_TEXT]}>{t('becomeDealerBody')}</Text>
        </View>

        <Input label={t('storeName')} value={storeName} onChangeText={setStoreName} />
        <CityPicker label={t('city')} value={city} onChange={setCity} />
        <Input
          label={t('phone')}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <Input
          label={t('storeDesc')}
          value={description}
          onChangeText={setDescription}
          placeholder={t('storeDescPlaceholder')}
          multiline
          numberOfLines={3}
          style={{ height: 84, textAlignVertical: 'top' }}
        />
        <Button title={t('openStore')} icon="rocket" variant="accent" onPress={handleSubmit} loading={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },
  hero: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  heroIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 21, textAlign: 'center' },
});
