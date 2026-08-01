import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors } from '../lib/theme';

const ONBOARDING_KEY = 'autohub.onboarding.seen';

export default function Index() {
  const { session, loading } = useAuth();
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((v) => setOnboardingSeen(v === 'true'));
  }, []);

  if (loading || onboardingSeen === null) {
    return (
      <View style={styles.splash}>
        <LinearGradient
          colors={['#1A2C55', '#0C1B33', '#070D1B']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.glow} />
        <View style={styles.logoTile}>
          <Ionicons name="car-sport" size={44} color={colors.primary} />
        </View>
        <Text style={styles.brand}>
          Auto<Text style={{ color: colors.accent }}>Hub</Text>
        </Text>
        <ActivityIndicator color={colors.accent} style={{ marginTop: 28 }} />
      </View>
    );
  }

  if (!session && !onboardingSeen) return <Redirect href="/onboarding" />;
  return <Redirect href={session ? '/(tabs)' : '/(auth)/sign-in'} />;
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  glow: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: colors.accent,
    opacity: 0.12,
  },
  logoTile: {
    width: 96,
    height: 96,
    borderRadius: 30,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 14,
  },
  brand: { color: '#FFFFFF', fontSize: 32, fontWeight: '800', letterSpacing: 0.5 },
});
