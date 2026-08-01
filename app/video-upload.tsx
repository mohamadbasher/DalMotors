import React, { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { uploadStoreVideo } from '../lib/upload';
import { Vehicle } from '../lib/types';
import { colors, radius, spacing } from '../lib/theme';
import { ROW, RTL_TEXT } from '../lib/rtl';
import { useI18n } from '../lib/i18n';
import { Button, Chip, Input } from '../components/ui';

const MAX_DURATION_MS = 61_000; // 60s + small tolerance

export default function VideoUpload() {
  const { session, store } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!store) return;
      supabase
        .from('vehicles')
        .select('id, title')
        .eq('store_id', store.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .then(({ data }) => setVehicles((data ?? []) as Vehicle[]));
    }, [store])
  );

  async function pickVideo() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: true, // lets iOS trim to length
      videoMaxDuration: 60,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (asset.duration && asset.duration > MAX_DURATION_MS) {
      Alert.alert(t('videoTooLong'), t('videoTooLongBody'));
      return;
    }
    setVideoUri(asset.uri);
  }

  async function handleUpload() {
    if (!session || !store || !videoUri) return;
    setUploading(true);
    try {
      const url = await uploadStoreVideo(session.user.id, videoUri);
      const { error } = await supabase.from('videos').insert({
        owner_id: session.user.id,
        store_id: store.id,
        vehicle_id: vehicleId,
        url,
        caption: caption.trim() || null,
      });
      if (error) throw error;
      Alert.alert(t('videoUploaded'), '', [{ text: t('ok'), onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert(t('error'), e.message ?? '');
    } finally {
      setUploading(false);
    }
  }

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.container}>
      {/* picker box */}
      <TouchableOpacity style={styles.pickBox} onPress={pickVideo} activeOpacity={0.8}>
        <Ionicons
          name={videoUri ? 'checkmark-circle' : 'videocam'}
          size={40}
          color={videoUri ? colors.success : colors.textFaint}
        />
        <Text style={styles.pickTitle}>{videoUri ? t('changeVideo') : t('pickVideo')}</Text>
        <Text style={styles.pickSub}>{t('maxVideoLen')}</Text>
      </TouchableOpacity>

      <Input
        label={t('videoCaption')}
        value={caption}
        onChangeText={setCaption}
        placeholder={t('videoCaptionPlaceholder')}
      />

      <Text style={[styles.label, RTL_TEXT]}>{t('linkVehicle')}</Text>
      <View style={[ROW, styles.chips]}>
        <Chip label={t('noLink')} selected={vehicleId === null} onPress={() => setVehicleId(null)} />
        {vehicles.map((v) => (
          <Chip
            key={v.id}
            label={v.title}
            selected={vehicleId === v.id}
            onPress={() => setVehicleId(v.id)}
          />
        ))}
      </View>

      <Button
        title={uploading ? t('uploading') : t('uploadVideo')}
        icon="cloud-upload"
        variant="accent"
        onPress={handleUpload}
        loading={uploading}
        disabled={!videoUri}
        style={{ marginTop: spacing.lg }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },
  pickBox: {
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    marginBottom: spacing.lg,
    gap: 4,
  },
  pickTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  pickSub: { fontSize: 13, color: colors.textMuted },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 6 },
  chips: { flexWrap: 'wrap', gap: 6 },
});
