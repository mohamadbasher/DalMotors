import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../context/AuthContext';
import { I18nProvider, useI18n } from '../lib/i18n';
import { ensureRtl } from '../lib/rtl';
import { colors } from '../lib/theme';

ensureRtl();

function RootNavigator() {
  const { t } = useI18n();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700' },
        headerTitleAlign: 'center',
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="vehicle/[id]" options={{ headerShown: true, title: '' }} />
      <Stack.Screen name="store/[id]" options={{ headerShown: true, title: '' }} />
      <Stack.Screen name="sell" options={{ headerShown: true, title: t('sellTitle') }} />
      <Stack.Screen
        name="become-dealer"
        options={{ headerShown: true, title: t('becomeDealerTitle') }}
      />
      <Stack.Screen
        name="video-upload"
        options={{ headerShown: true, title: t('uploadVideo') }}
      />
      <Stack.Screen name="edit-store" options={{ headerShown: true, title: t('storeSettings') }} />
      <Stack.Screen name="admin-cities" options={{ headerShown: true, title: t('manageCities') }} />
      <Stack.Screen name="admin-brands" options={{ headerShown: true, title: t('manageBrands') }} />
      <Stack.Screen name="admin-videos" options={{ headerShown: true, title: t('manageVideos') }} />
      <Stack.Screen
        name="admin-video-queue"
        options={{ headerShown: true, title: t('videoModeration') }}
      />
      <Stack.Screen name="admin-reports" options={{ headerShown: true, title: t('reports') }} />
      <Stack.Screen name="admin-banners" options={{ headerShown: true, title: t('manageBanners') }} />
      <Stack.Screen name="admin-legal" options={{ headerShown: true, title: t('manageLegal') }} />
      <Stack.Screen name="notifications" options={{ headerShown: true, title: t('notifications') }} />
      <Stack.Screen name="menu" options={{ headerShown: true, title: t('menuTitle') }} />
      <Stack.Screen
        name="saved-searches"
        options={{ headerShown: true, title: t('mySavedSearches') }}
      />
      <Stack.Screen
        name="stores-map"
        options={{ headerShown: true, title: t('mapView') }}
      />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="legal" options={{ headerShown: true, title: '' }} />
      <Stack.Screen name="settings" options={{ headerShown: true, title: t('settings') }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <I18nProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </AuthProvider>
    </I18nProvider>
  );
}
