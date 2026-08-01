import React from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Redirect, Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../lib/i18n';
import { colors } from '../../lib/theme';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function TabsLayout() {
  const { session, loading, mode } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  if (!loading && !session) return <Redirect href="/(auth)/sign-in" />;

  const personal = mode === 'personal';
  const storeMode = mode === 'store';
  const adminMode = mode === 'admin';
  // Tabs are DECLARED LEFT→RIGHT, so for RTL we declare them in reverse:
  // profile (far left) … index/dashboard/admin-dashboard (far right).
  // href: null hides a tab; the center button is 3rd of 5 in personal/store.
  const show = (visible: boolean) => (visible ? undefined : null);

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          backgroundColor: colors.primary,
          borderTopWidth: 0,
          height: 78,
          paddingTop: 10,
          paddingBottom: 12,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      {/* far LEFT: profile (both modes) */}
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabProfile'),
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
      {/* admin: stores */}
      <Tabs.Screen
        name="admin-stores"
        options={{
          href: show(adminMode),
          title: t('tabStores'),
          tabBarIcon: ({ color, size }) => <Ionicons name="storefront" size={size} color={color} />,
        }}
      />
      {/* store: my videos */}
      <Tabs.Screen
        name="my-videos"
        options={{
          href: show(storeMode),
          title: t('tabMyVideos'),
          tabBarIcon: ({ color, size }) => <Ionicons name="videocam" size={size} color={color} />,
        }}
      />
      {/* personal: favorites */}
      <Tabs.Screen
        name="favorites"
        options={{
          href: show(personal),
          title: t('tabSaved'),
          tabBarIcon: ({ color, size }) => <Ionicons name="heart" size={size} color={color} />,
        }}
      />
      {/* CENTER: add menu (store) */}
      <Tabs.Screen
        name="add"
        options={
          storeMode
            ? {
                title: '',
                tabBarButton: () => (
                  <TouchableOpacity
                    style={styles.centerWrap}
                    activeOpacity={0.85}
                    onPress={() =>
                      Alert.alert(t('add'), '', [
                        { text: t('addVehicle'), onPress: () => router.push('/sell') },
                        { text: t('addVideo'), onPress: () => router.push('/video-upload') },
                        { text: t('cancel'), style: 'cancel' },
                      ])
                    }
                  >
                    <View style={styles.centerBtn}>
                      <Ionicons name="add" size={30} color={colors.primary} />
                    </View>
                  </TouchableOpacity>
                ),
              }
            : { href: null }
        }
      />
      {/* CENTER: videos feed (personal) */}
      <Tabs.Screen
        name="videos"
        options={
          personal
            ? {
                title: t('tabVideos'),
                tabBarButton: (props) => (
                  <TouchableOpacity
                    style={styles.centerWrap}
                    activeOpacity={0.85}
                    onPress={() => router.push('/(tabs)/videos')}
                    accessibilityState={props.accessibilityState}
                  >
                    <View style={styles.centerBtn}>
                      <Ionicons name="play" size={26} color={colors.primary} />
                    </View>
                  </TouchableOpacity>
                ),
              }
            : { href: null }
        }
      />
      {/* admin: listings */}
      <Tabs.Screen
        name="admin-listings"
        options={{
          href: show(adminMode),
          title: t('listings'),
          tabBarIcon: ({ color, size }) => <Ionicons name="albums" size={size} color={color} />,
        }}
      />
      {/* store: inventory */}
      <Tabs.Screen
        name="inventory"
        options={{
          href: show(storeMode),
          title: t('tabInventory'),
          tabBarIcon: ({ color, size }) => <Ionicons name="albums" size={size} color={color} />,
        }}
      />
      {/* personal: stores */}
      <Tabs.Screen
        name="stores"
        options={{
          href: show(personal),
          title: t('tabStores'),
          tabBarIcon: ({ color, size }) => <Ionicons name="storefront" size={size} color={color} />,
        }}
      />
      {/* admin: users */}
      <Tabs.Screen
        name="admin-users"
        options={{
          href: show(adminMode),
          title: t('users'),
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
        }}
      />
      {/* store: dashboard (far right in store mode) */}
      <Tabs.Screen
        name="dashboard"
        options={{
          href: show(storeMode),
          title: t('tabDashboard'),
          tabBarIcon: ({ color, size }) => <Ionicons name="grid" size={size} color={color} />,
        }}
      />
      {/* admin: dashboard (far right in admin mode) */}
      <Tabs.Screen
        name="admin-dashboard"
        options={{
          href: show(adminMode),
          title: t('adminDashboard'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="shield-checkmark" size={size} color={color} />
          ),
        }}
      />
      {/* far RIGHT: all vehicles (personal) */}
      <Tabs.Screen
        name="index"
        options={{
          href: show(personal),
          title: t('tabVehicles'),
          tabBarIcon: ({ color, size }) => <Ionicons name="car-sport" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
    borderWidth: 4,
    borderColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
  },
});
