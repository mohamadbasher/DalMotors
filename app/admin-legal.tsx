import React, { useCallback, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { Redirect, useFocusEffect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { LegalPage } from '../lib/types';
import { colors, radius, shadow, spacing } from '../lib/theme';
import { ROW, RTL_TEXT } from '../lib/rtl';
import { LANG_NAMES, useI18n } from '../lib/i18n';
import { Button, Chip, Input } from '../components/ui';

export default function AdminLegal() {
  const { isAdmin } = useAuth();
  const { t, lang } = useI18n();
  const [pages, setPages] = useState<LegalPage[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  // Which language's copy is being edited — defaults to the UI language.
  const [editLang, setEditLang] = useState<'he' | 'ar' | 'ru'>(lang);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('legal_pages').select('*').order('key');
    setPages((data ?? []) as LegalPage[]);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!isAdmin) return <Redirect href="/(tabs)" />;

  function startEdit(page: LegalPage, l: 'he' | 'ar' | 'ru') {
    setEditingKey(page.key);
    setEditLang(l);
    setTitle(page[`title_${l}`]);
    setBody(page[`body_${l}`]);
  }

  async function save() {
    if (!editingKey) return;
    setSaving(true);
    const { error } = await supabase
      .from('legal_pages')
      .update({
        [`title_${editLang}`]: title,
        [`body_${editLang}`]: body,
        updated_at: new Date().toISOString(),
      })
      .eq('key', editingKey);
    setSaving(false);
    if (error) Alert.alert(t('error'), error.message);
    else {
      setEditingKey(null);
      await load();
      Alert.alert(t('saved'));
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={[styles.hint, RTL_TEXT]}>{t('legalHint')}</Text>

        {pages.map((page) => {
          const isEditing = editingKey === page.key;
          return (
            <View key={page.key} style={styles.card}>
              <View style={[ROW, styles.cardHead]}>
                <Ionicons name="document-text-outline" size={19} color={colors.primary} />
                <Text style={[styles.cardTitle, RTL_TEXT]}>{page[`title_${lang}`] || page.key}</Text>
                <TouchableOpacity
                  onPress={() => (isEditing ? setEditingKey(null) : startEdit(page, lang))}
                  hitSlop={8}
                >
                  <Ionicons
                    name={isEditing ? 'close' : 'create-outline'}
                    size={19}
                    color={colors.accent}
                  />
                </TouchableOpacity>
              </View>

              {isEditing && (
                <View style={{ marginTop: spacing.md }}>
                  {/* which language's copy */}
                  <View style={[ROW, { gap: 6, marginBottom: spacing.md }]}>
                    {(['he', 'ar', 'ru'] as const).map((l) => (
                      <Chip
                        key={l}
                        label={LANG_NAMES[l]}
                        selected={editLang === l}
                        onPress={() => startEdit(page, l)}
                      />
                    ))}
                  </View>
                  <Input label={t('pageTitle')} value={title} onChangeText={setTitle} />
                  <Input
                    label={t('pageBody')}
                    value={body}
                    onChangeText={setBody}
                    multiline
                    numberOfLines={10}
                    style={{ height: 220, textAlignVertical: 'top' }}
                  />
                  <Button title={t('save')} onPress={save} loading={saving} />
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },
  hint: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  cardHead: { alignItems: 'center', gap: spacing.md },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: colors.text },
});
