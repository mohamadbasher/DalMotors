import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { countUnread } from '../lib/notifications';
import { colors, shadow, spacing } from '../lib/theme';

/**
 * App-wide top bar (manual RTL): notifications bell · centered brand ·
 * mode switch / quick-sell.
 *
 * Rounded bottom corners + a float shadow so the bar reads as chrome
 * sitting above the canvas rather than a flat band.
 */
export function TopBar() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, isDealer, isAdmin, mode, setMode } = useAuth();
  const [unread, setUnread] = useState(0);

  // Refresh the badge whenever a tab screen regains focus.
  useFocusEffect(
    useCallback(() => {
      if (!session) {
        setUnread(0);
        return;
      }
      countUnread(session.user.id)
        .then(setUnread)
        .catch(() => {});
    }, [session])
  );

  return (
    <View style={[styles.bar, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.row}>
        {/* notifications (physical right under RTL: first child of a reversed row) */}
        <Pressable
          hitSlop={8}
          onPress={() => {
            setUnread(0); // the inbox marks them read on open
            router.push('/notifications');
          }}
          style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
        >
          <Ionicons name="notifications-outline" size={21} color="#FFFFFF" />
          {unread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          )}
        </Pressable>

        {/* brand */}
        <View style={styles.brandWrap}>
          <Ionicons name="car-sport" size={20} color={colors.accent} />
          <Text style={styles.brand}>AutoHub</Text>
        </View>

        {/* admins switch to management, dealers to their store,
            customers get a quick sell button */}
        {isAdmin ? (
          <Pressable
            hitSlop={8}
            style={({ pressed }) => [
              styles.chip,
              mode === 'admin' && styles.chipActive,
              pressed && styles.chipPressed,
            ]}
            onPress={() => setMode(mode === 'admin' ? 'personal' : 'admin')}
          >
            <Ionicons
              name={mode === 'admin' ? 'person' : 'shield-checkmark'}
              size={18}
              color={mode === 'admin' ? colors.primary : '#FFFFFF'}
            />
          </Pressable>
        ) : isDealer ? (
          <Pressable
            hitSlop={8}
            style={({ pressed }) => [
              styles.chip,
              mode === 'store' && styles.chipActive,
              pressed && styles.chipPressed,
            ]}
            onPress={() => setMode(mode === 'store' ? 'personal' : 'store')}
          >
            <Ionicons
              name={mode === 'store' ? 'person' : 'storefront'}
              size={18}
              color={mode === 'store' ? colors.primary : '#FFFFFF'}
            />
          </Pressable>
        ) : (
          <Pressable
            hitSlop={8}
            style={({ pressed }) => [styles.chip, styles.chipActive, pressed && styles.chipPressed]}
            onPress={() => router.push('/sell')}
          >
            <Ionicons name="add" size={22} color={colors.primary} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    zIndex: 10,
    ...shadow.float,
  },
  row: {
    flexDirection: 'row-reverse', // RTL: bell on the right
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chip: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  chipPressed: { backgroundColor: 'rgba(255,255,255,0.3)' },
  chipActive: { backgroundColor: colors.accent },
  badge: {
    position: 'absolute',
    top: 2,
    left: 2,
    minWidth: 17,
    height: 17,
    borderRadius: 999,
    paddingHorizontal: 4,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  badgeText: { color: '#FFFFFF', fontSize: 9.5, fontWeight: '800' },
  brandWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brand: { color: '#FFFFFF', fontSize: 19, fontWeight: '800', letterSpacing: 0.3 },
});
