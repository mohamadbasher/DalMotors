import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { isValidPhone, phoneToEmail, useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { uploadAvatar } from '../lib/upload';
import { colors, radius, spacing } from '../lib/theme';
import { RTL_TEXT } from '../lib/rtl';
import { useI18n } from '../lib/i18n';
import { Button, Input } from '../components/ui';

export default function Settings() {
  const { session, profile, refresh } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function changePhoto() {
    if (!session) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (result.canceled || !result.assets?.[0]) return;
    setAvatarUploading(true);
    try {
      const url = await uploadAvatar(session.user.id, result.assets[0].uri);
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('id', session.user.id);
      if (error) throw error;
      await refresh();
    } catch (e: any) {
      Alert.alert(t('error'), e.message ?? '');
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleSave() {
    if (!session || !profile) return;
    if (!fullName.trim()) {
      Alert.alert(t('missingInfo'), t('fullName'));
      return;
    }
    if (!isValidPhone(phone)) {
      Alert.alert(t('error'), t('invalidPhone'));
      return;
    }
    if (newPassword && newPassword.length < 6) {
      Alert.alert(t('weakPassword'), t('passwordHint'));
      return;
    }

    setSaving(true);
    try {
      // profile fields
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim(), phone: phone.trim() })
        .eq('id', session.user.id);
      if (profileErr) throw profileErr;

      // phone is the login identifier → update the auth email mapping
      const authUpdates: { email?: string; password?: string } = {};
      if (phoneToEmail(phone) !== session.user.email) {
        authUpdates.email = phoneToEmail(phone);
      }
      if (newPassword) authUpdates.password = newPassword;
      if (Object.keys(authUpdates).length > 0) {
        const { error: authErr } = await supabase.auth.updateUser(authUpdates);
        if (authErr) throw authErr;
      }

      await refresh();
      setNewPassword('');
      Alert.alert(t('profileUpdated'), '', [{ text: t('ok'), onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert(t('error'), e.message ?? '');
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={changePhoto} activeOpacity={0.8} disabled={avatarUploading}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(profile?.full_name ?? '?').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Ionicons
                name={avatarUploading ? 'hourglass' : 'camera'}
                size={15}
                color={colors.primary}
              />
            </View>
          </TouchableOpacity>
          <Text style={[styles.avatarHint, RTL_TEXT]}>{t('changePhoto')}</Text>
        </View>

        <Input label={t('fullName')} value={fullName} onChangeText={setFullName} />
        <Input
          label={t('phoneNumber')}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <Input
          label={t('newPassword')}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="••••••••"
          secureTextEntry
        />

        <Button title={t('save')} onPress={handleSave} loading={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },
  avatarSection: { alignItems: 'center', marginBottom: spacing.xl, marginTop: spacing.md },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: { width: 96, height: 96, borderRadius: 48 },
  avatarText: { color: colors.accent, fontSize: 38, fontWeight: '800' },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: colors.bg,
  },
  avatarHint: { fontSize: 13, color: colors.textMuted, marginTop: spacing.sm, fontWeight: '600' },
});
