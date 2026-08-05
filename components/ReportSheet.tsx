import React, { useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { colors, radius, spacing } from '../lib/theme';
import { ROW, RTL_TEXT } from '../lib/rtl';
import { TKey, useI18n } from '../lib/i18n';
import { Button, Chip, Input } from './ui';

/** Stored as a stable key; the label is translated at display time. */
const REASONS: { key: string; label: TKey }[] = [
  { key: 'scam', label: 'reportScam' },
  { key: 'wrong_info', label: 'reportWrongInfo' },
  { key: 'already_sold', label: 'reportSold' },
  { key: 'offensive', label: 'reportOffensive' },
  { key: 'other', label: 'reportOther' },
];

export function ReportSheet({
  visible,
  vehicleId,
  onClose,
}: {
  visible: boolean;
  vehicleId: string;
  onClose: () => void;
}) {
  const { session } = useAuth();
  const { t } = useI18n();
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!session || !reason) return;
    setSaving(true);
    const { error } = await supabase.from('reports').insert({
      vehicle_id: vehicleId,
      reporter_id: session.user.id,
      reason,
      note: note.trim() || null,
    });
    setSaving(false);
    if (error) {
      Alert.alert(t('error'), error.message);
      return;
    }
    setReason(null);
    setNote('');
    onClose();
    Alert.alert(t('reportSent'), t('reportSentBody'));
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={[ROW, styles.header]}>
            <Text style={styles.title}>{t('reportListing')}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, RTL_TEXT]}>{t('reportReason')}</Text>
          <View style={[ROW, styles.chips]}>
            {REASONS.map((r) => (
              <Chip
                key={r.key}
                label={t(r.label)}
                selected={reason === r.key}
                onPress={() => setReason(reason === r.key ? null : r.key)}
              />
            ))}
          </View>

          <Input
            value={note}
            onChangeText={setNote}
            placeholder={t('reportNote')}
            multiline
            numberOfLines={3}
            style={{ height: 76, textAlignVertical: 'top' }}
          />

          <Button
            title={t('submitReport')}
            variant="danger"
            icon="flag"
            onPress={submit}
            loading={saving}
            disabled={!reason}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  header: { justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  title: { fontSize: 19, fontWeight: '800', color: colors.text },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 6 },
  chips: { flexWrap: 'wrap', gap: 6, marginBottom: spacing.md },
});
