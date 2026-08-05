import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { MapPressEvent, Marker, type Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentLocation } from '../lib/location';
import { colors, radius, shadow, spacing } from '../lib/theme';
import { ROW, RTL_TEXT } from '../lib/rtl';
import { useI18n } from '../lib/i18n';

export interface LatLng {
  lat: number;
  lng: number;
}

// Centre of Israel — used only when GPS is denied and nothing was picked yet.
const FALLBACK: Region = {
  latitude: 31.7,
  longitude: 35.0,
  latitudeDelta: 2.2,
  longitudeDelta: 1.6,
};

/**
 * Full-screen drag-a-pin map for choosing an exact store location.
 * Opens on the device's GPS position when permission allows, otherwise on a
 * country-wide view the dealer can pan from.
 */
export function MapPicker({
  visible,
  initial,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  initial?: LatLng | null;
  onClose: () => void;
  onConfirm: (coords: LatLng) => void;
}) {
  const { t } = useI18n();
  const [region, setRegion] = useState<Region>(FALLBACK);
  const [marker, setMarker] = useState<LatLng>(
    initial ?? { lat: FALLBACK.latitude, lng: FALLBACK.longitude }
  );
  const [locating, setLocating] = useState(false);

  // On open: centre on the existing pin, else try GPS.
  useEffect(() => {
    if (!visible) return;
    if (initial) {
      setMarker(initial);
      setRegion({ latitude: initial.lat, longitude: initial.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 });
      return;
    }
    locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  async function locate() {
    setLocating(true);
    const coords = await getCurrentLocation();
    if (coords) {
      setMarker(coords);
      setRegion({
        latitude: coords.lat,
        longitude: coords.lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
    }
    setLocating(false);
  }

  function onMapPress(e: MapPressEvent) {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setMarker({ lat: latitude, lng: longitude });
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <MapView
          style={StyleSheet.absoluteFill}
          region={region}
          onRegionChangeComplete={setRegion}
          onPress={onMapPress}
        >
          <Marker
            draggable
            coordinate={{ latitude: marker.lat, longitude: marker.lng }}
            onDragEnd={(e) =>
              setMarker({
                lat: e.nativeEvent.coordinate.latitude,
                lng: e.nativeEvent.coordinate.longitude,
              })
            }
          />
        </MapView>

        {/* close */}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={8}>
          <Ionicons name="close" size={22} color={colors.text} />
        </TouchableOpacity>

        {/* locate me */}
        <TouchableOpacity style={styles.locateBtn} onPress={locate} disabled={locating}>
          {locating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="locate" size={20} color={colors.primary} />
          )}
        </TouchableOpacity>

        {/* confirm */}
        <View style={styles.footer}>
          <Text style={[styles.hint, RTL_TEXT]}>{t('dragPinHint')}</Text>
          <TouchableOpacity
            style={[ROW, styles.confirmBtn]}
            onPress={() => onConfirm(marker)}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark" size={18} color={colors.primary} />
            <Text style={styles.confirmText}>{t('confirmLocation')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  closeBtn: {
    position: 'absolute',
    top: 52,
    left: spacing.lg,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  locateBtn: {
    position: 'absolute',
    bottom: 150,
    left: spacing.lg,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  hint: { fontSize: 12.5, color: colors.textMuted, lineHeight: 18 },
  confirmBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    height: 50,
    borderRadius: radius.md,
    ...shadow.cta,
  },
  confirmText: { color: colors.primary, fontWeight: '800', fontSize: 15.5 },
});
