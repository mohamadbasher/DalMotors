import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { uploadVehiclePhoto } from '../lib/upload';
import { lookupByLicensePlate } from '../lib/vehicleRegistry';
import { AccidentStatus, Condition, FuelType, Transmission } from '../lib/types';
import { colors, radius, spacing } from '../lib/theme';
import { ROW, RTL_TEXT } from '../lib/rtl';
import { useI18n } from '../lib/i18n';
import { Badge, Button, Chip, Input } from '../components/ui';
import { CityPicker } from '../components/CityPicker';
import { BrandPicker } from '../components/BrandPicker';

const MAX_PHOTOS = 6;

export default function Sell() {
  const { session, profile, store, mode } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  const [photos, setPhotos] = useState<string[]>([]);
  const [licensePlate, setLicensePlate] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);
  const [make, setMake] = useState<string | null>(null);
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [mileage, setMileage] = useState('');
  const [price, setPrice] = useState('');
  const [city, setCity] = useState<string | null>(profile?.city ?? null);
  const [color, setColor] = useState('');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [description, setDescription] = useState('');
  const [transmission, setTransmission] = useState<Transmission>('automatic');
  const [fuel, setFuel] = useState<FuelType>('petrol');
  const [condition, setCondition] = useState<Condition>('used');
  const [ownershipHand, setOwnershipHand] = useState<number | null>(null);
  const [testExpiry, setTestExpiry] = useState(''); // YYYY-MM-DD
  const [accidentStatus, setAccidentStatus] = useState<AccidentStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // A dealer posting from store mode lists into their store;
  // in personal mode the listing is private.
  const postToStore = mode === 'store' && !!store;

  async function pickPhotos() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
      quality: 0.7,
    });
    if (result.canceled || !result.assets) return;
    setPhotos((p) => [...p, ...result.assets.map((a) => a.uri)].slice(0, MAX_PHOTOS));
  }

  function movePhoto(index: number, dir: -1 | 1) {
    setPhotos((p) => {
      const next = [...p];
      const target = index + dir;
      if (target < 0 || target >= next.length) return p;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleLookupPlate() {
    if (!licensePlate.trim()) return;
    setLookingUp(true);
    setAutoFilled(false);
    try {
      const result = await lookupByLicensePlate(licensePlate);
      if (!result) {
        Alert.alert(t('error'), t('plateNotFound'));
        return;
      }
      if (result.make) setMake(result.make);
      if (result.model) setModel(result.model);
      if (result.year) setYear(String(result.year));
      if (result.color) setColor(result.color);
      if (result.fuelType) setFuel(result.fuelType as FuelType);
      if (result.testExpiry) setTestExpiry(result.testExpiry);
      setAutoFilled(true);
    } catch {
      Alert.alert(t('error'), t('plateLookupFailed'));
    } finally {
      setLookingUp(false);
    }
  }

  async function handleSubmit() {
    if (!session) return;
    const yearNum = parseInt(year, 10);
    const priceNum = parseInt(price, 10);
    const mileageNum = parseInt(mileage || '0', 10);

    if (!make || !model.trim()) {
      Alert.alert(t('missingInfo'), t('fillMakeModel'));
      return;
    }
    if (!yearNum || yearNum < 1950 || yearNum > new Date().getFullYear() + 1) {
      Alert.alert(t('error'), t('invalidYear'));
      return;
    }
    if (!priceNum || priceNum <= 0) {
      Alert.alert(t('error'), t('invalidPrice'));
      return;
    }

    setSubmitting(true);
    try {
      const photoUrls: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        photoUrls.push(await uploadVehiclePhoto(session.user.id, photos[i], i));
      }
      const { error } = await supabase.from('vehicles').insert({
        seller_id: session.user.id,
        store_id: postToStore ? store!.id : null,
        title: `${make} ${model.trim()} ${yearNum}`,
        make,
        model: model.trim(),
        year: yearNum,
        mileage: mileageNum,
        price: priceNum,
        fuel_type: fuel,
        transmission,
        condition,
        color: color.trim() || null,
        city: city || null,
        description: description.trim() || null,
        phone: phone.trim() || null,
        photos: photoUrls,
        status: 'active',
        license_plate: licensePlate.trim() || null,
        ownership_hand: ownershipHand,
        test_expiry: testExpiry || null,
        accident_status: accidentStatus,
      });
      if (error) throw error;
      Alert.alert(t('published'), t('publishedBody'), [
        { text: t('ok'), onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert(t('publishFailed'), e.message ?? '');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={[styles.sub, RTL_TEXT]}>
          {postToStore ? t('sellSubDealer') : t('sellSubCustomer')}
        </Text>

        {/* license plate lookup */}
        <View style={styles.plateBox}>
          <Text style={[styles.plateHint, RTL_TEXT]}>{t('plateLookupHint')}</Text>
          <View style={[ROW, { gap: spacing.sm }]}>
            <View style={{ flex: 1 }}>
              <Input
                value={licensePlate}
                onChangeText={setLicensePlate}
                placeholder={t('licensePlate')}
                keyboardType="number-pad"
                style={{ marginBottom: 0 }}
              />
            </View>
            <TouchableOpacity
              style={styles.lookupBtn}
              onPress={handleLookupPlate}
              disabled={lookingUp || !licensePlate.trim()}
              activeOpacity={0.8}
            >
              {lookingUp ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <Ionicons name="search" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>
          {autoFilled && (
            <View style={{ marginTop: spacing.sm, alignSelf: 'flex-end' }}>
              <Badge label={t('plateFilled')} tone="success" />
            </View>
          )}
        </View>

        {/* photos */}
        <Text style={[styles.label, RTL_TEXT]}>
          {t('photos')} ({photos.length}/{MAX_PHOTOS})
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
          {photos.map((uri, index) => (
            <View key={uri} style={styles.photoWrap}>
              <Image source={{ uri }} style={styles.photo} />
              {index === 0 && (
                <View style={styles.coverBadge}>
                  <Text style={styles.coverBadgeText}>{t('cover')}</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.photoRemove}
                onPress={() => setPhotos((p) => p.filter((u) => u !== uri))}
              >
                <Ionicons name="close" size={14} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.photoReorder}>
                <TouchableOpacity
                  onPress={() => movePhoto(index, -1)}
                  disabled={index === 0}
                  style={styles.reorderBtn}
                >
                  <Ionicons
                    name="chevron-back"
                    size={14}
                    color={index === 0 ? colors.textFaint : colors.primary}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => movePhoto(index, 1)}
                  disabled={index === photos.length - 1}
                  style={styles.reorderBtn}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={14}
                    color={index === photos.length - 1 ? colors.textFaint : colors.primary}
                  />
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {photos.length < MAX_PHOTOS && (
            <TouchableOpacity style={styles.addPhoto} onPress={pickPhotos}>
              <Ionicons name="camera" size={26} color={colors.textFaint} />
              <Text style={styles.addPhotoText}>{t('add')}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <BrandPicker label={t('make')} value={make} onChange={setMake} />
        <Input label={t('model')} value={model} onChangeText={setModel} placeholder="Corolla" />
        <View style={[ROW, styles.row]}>
          <View style={{ flex: 1 }}>
            <Input
              label={t('year')}
              value={year}
              onChangeText={setYear}
              placeholder="2021"
              keyboardType="number-pad"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label={`${t('mileage')} (${t('mileageKm')})`}
              value={mileage}
              onChangeText={setMileage}
              placeholder="45000"
              keyboardType="number-pad"
            />
          </View>
        </View>
        <Input
          label={t('priceLabel')}
          value={price}
          onChangeText={setPrice}
          placeholder="85000"
          keyboardType="number-pad"
        />

        <Text style={[styles.label, RTL_TEXT]}>{t('transmission')}</Text>
        <View style={[ROW, styles.chipRow]}>
          {(['automatic', 'manual'] as const).map((tr) => (
            <Chip
              key={tr}
              label={tr === 'automatic' ? t('automatic') : t('manual')}
              selected={transmission === tr}
              onPress={() => setTransmission(tr)}
            />
          ))}
        </View>

        <Text style={[styles.label, RTL_TEXT]}>{t('fuel')}</Text>
        <View style={[ROW, styles.chipRow]}>
          {(['petrol', 'diesel', 'hybrid', 'electric'] as const).map((f) => (
            <Chip key={f} label={t(f)} selected={fuel === f} onPress={() => setFuel(f)} />
          ))}
        </View>

        <Text style={[styles.label, RTL_TEXT]}>{t('condition')}</Text>
        <View style={[ROW, styles.chipRow]}>
          {(['used', 'new'] as const).map((c) => (
            <Chip
              key={c}
              label={c === 'new' ? t('brandNew') : t('used')}
              selected={condition === c}
              onPress={() => setCondition(c)}
            />
          ))}
        </View>

        {/* Israeli-specific fields */}
        <Text style={[styles.label, RTL_TEXT]}>{t('ownershipHand')}</Text>
        <View style={[ROW, styles.chipRow]}>
          {([1, 2, 3] as const).map((h) => (
            <Chip
              key={h}
              label={h === 1 ? t('hand1') : h === 2 ? t('hand2') : t('hand3Plus')}
              selected={ownershipHand === h}
              onPress={() => setOwnershipHand(ownershipHand === h ? null : h)}
            />
          ))}
        </View>

        <Text style={[styles.label, RTL_TEXT]}>{t('accidentStatus')}</Text>
        <View style={[ROW, styles.chipRow]}>
          {(['none', 'minor', 'major'] as const).map((a) => (
            <Chip
              key={a}
              label={a === 'none' ? t('accidentNone') : a === 'minor' ? t('accidentMinor') : t('accidentMajor')}
              selected={accidentStatus === a}
              onPress={() => setAccidentStatus(accidentStatus === a ? null : a)}
            />
          ))}
        </View>

        <Input
          label={t('testExpiry')}
          value={testExpiry}
          onChangeText={setTestExpiry}
          placeholder="2026-12-31"
        />

        <CityPicker label={t('city')} value={city} onChange={setCity} />
        <Input label={t('colorLabel')} value={color} onChangeText={setColor} />
        <Input
          label={t('contactPhone')}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <Input
          label={t('description')}
          value={description}
          onChangeText={setDescription}
          placeholder={t('descPlaceholder')}
          multiline
          numberOfLines={4}
          style={{ height: 100, textAlignVertical: 'top' }}
        />

        <Button
          title={t('publish')}
          icon="rocket"
          onPress={handleSubmit}
          loading={submitting}
          variant="accent"
          style={{ marginTop: spacing.sm }}
        />
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg },
  sub: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.lg },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 6 },
  plateBox: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  plateHint: { fontSize: 12, color: '#92610A', marginBottom: spacing.sm, lineHeight: 17 },
  lookupBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRow: { marginBottom: spacing.md, flexDirection: 'row-reverse' },
  photoWrap: { position: 'relative', marginLeft: spacing.sm },
  photo: { width: 88, height: 88, borderRadius: radius.md },
  coverBadge: {
    position: 'absolute',
    bottom: 4,
    alignSelf: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  coverBadgeText: { color: '#FFFFFF', fontSize: 8, fontWeight: '800' },
  photoRemove: {
    position: 'absolute',
    top: -6,
    left: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoReorder: {
    position: 'absolute',
    top: -6,
    right: -6,
    flexDirection: 'row',
    gap: 2,
  },
  reorderBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhoto: {
    width: 88,
    height: 88,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  addPhotoText: { fontSize: 12, color: colors.textFaint, marginTop: 2 },
  row: { gap: spacing.sm },
  chipRow: { flexWrap: 'wrap', gap: 6, marginBottom: spacing.md },
});
