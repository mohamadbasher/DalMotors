import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing } from '../lib/theme';

/**
 * App-wide top bar (native RTL): hamburger menu · centered brand ·
 * sell button (customers) / store-switch (dealers).
 */
export function TopBar() {
  const router = useRouter();
  const { isDealer, isAdmin, mode, setMode } = useAuth();

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.bar}>
        {/* hamburger — first child = start (right) under RTL */}
        <TouchableOpacity
          style={styles.sideBtn}
          onPress={() => router.push('/menu')}
          activeOpacity={0.7}
        >
          <Ionicons name="menu" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        {/* brand */}
        <View style={styles.brandWrap}>
          <Ionicons name="car-sport" size={20} color={colors.accent} />
          <Text style={styles.brand}>AutoHub</Text>
        </View>

        {/* end side: admins switch to management, dealers to their store,
            customers get a quick sell button */}
        {isAdmin ? (
          <TouchableOpacity
            style={[styles.sideBtn, mode === 'admin' && styles.sideBtnActive]}
            onPress={() => setMode(mode === 'admin' ? 'personal' : 'admin')}
            activeOpacity={0.7}
          >
            <Ionicons
              name={mode === 'admin' ? 'person' : 'shield-checkmark'}
              size={18}
              color={mode === 'admin' ? colors.primary : '#FFFFFF'}
            />
          </TouchableOpacity>
        ) : isDealer ? (
          <TouchableOpacity
            style={[styles.sideBtn, mode === 'store' && styles.sideBtnActive]}
            onPress={() => setMode(mode === 'store' ? 'personal' : 'store')}
            activeOpacity={0.7}
          >
            <Ionicons
              name={mode === 'store' ? 'person' : 'storefront'}
              size={18}
              color={mode === 'store' ? colors.primary : '#FFFFFF'}
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.sideBtn, styles.sideBtnActive]}
            onPress={() => router.push('/sell')}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={22} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.primary },
  bar: {
    flexDirection: 'row-reverse', // hamburger on the right (RTL)
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
  },
  sideBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  sideBtnActive: { backgroundColor: colors.accent },
  brandWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brand: { color: '#FFFFFF', fontSize: 19, fontWeight: '800', letterSpacing: 0.3 },
});
