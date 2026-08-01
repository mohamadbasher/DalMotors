import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { getCities } from '../lib/cities';
import { colors, radius, spacing } from '../lib/theme';
import { RTL_TEXT } from '../lib/rtl';
import { Store } from '../lib/types';

interface Pin {
  store: Store;
  lat: number;
  lng: number;
}

// Small deterministic offset so stores sharing a city don't perfectly overlap.
function jitter(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 1000;
  return (h / 1000 - 0.5) * 0.02;
}

export default function StoresMap() {
  const router = useRouter();
  const [pins, setPins] = useState<Pin[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from('stores').select('*, vehicles(count)'),
      getCities(),
    ]).then(([storesRes, cities]) => {
      const cityMap = new Map(cities.map((c) => [c.name_he, c]));
      const list: Pin[] = [];
      for (const s of (storesRes.data ?? []) as Store[]) {
        const city = s.city ? cityMap.get(s.city) : null;
        if (city?.lat != null && city?.lng != null) {
          list.push({ store: s, lat: city.lat + jitter(s.id), lng: city.lng + jitter(s.id + '_') });
        }
      }
      setPins(list);
    });
  }, []);

  return (
    <View style={styles.safe}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={{ latitude: 31.5, longitude: 34.9, latitudeDelta: 3.5, longitudeDelta: 2.5 }}
      >
        {pins.map(({ store, lat, lng }) => (
          <Marker
            key={store.id}
            coordinate={{ latitude: lat, longitude: lng }}
            title={store.name}
            description={store.city ?? ''}
            onCalloutPress={() => router.push(`/store/${store.id}`)}
          />
        ))}
      </MapView>
      {pins.length === 0 && (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, RTL_TEXT]}>אין עדיין חנויות עם מיקום להצגה</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  empty: {
    position: 'absolute',
    bottom: spacing.xl,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  emptyText: { fontSize: 13, color: colors.textMuted },
});
