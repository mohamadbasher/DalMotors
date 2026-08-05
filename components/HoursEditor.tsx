import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radius, spacing } from '../lib/theme';
import { ROW } from '../lib/rtl';
import { useI18n } from '../lib/i18n';
import { DayHours, TIME_SLOTS, WEEKDAY_KEYS } from '../lib/hours';

/**
 * Weekly opening-hours editor.
 *
 * Deliberately no <Modal> for the time picker — this editor is rendered inside
 * screens that may themselves sit in a modal, and Android renders a modal
 * stacked on another modal unreliably. An inline expanding row avoids that.
 */
export function HoursEditor({
  value,
  onChange,
}: {
  value: DayHours[];
  onChange: (hours: DayHours[]) => void;
}) {
  const { t } = useI18n();
  const [picker, setPicker] = useState<{ day: number; field: 'from' | 'to' } | null>(null);

  function update(day: number, patch: Partial<DayHours>) {
    onChange(value.map((d) => (d.day === day ? { ...d, ...patch } : d)));
  }

  return (
    <View style={{ gap: spacing.sm }}>
      {value.map((d) => {
        const openField = picker?.day === d.day ? picker.field : null;
        return (
          <View key={d.day}>
            <View style={[ROW, styles.row]}>
              <Text style={styles.day}>{t(WEEKDAY_KEYS[d.day])}</Text>

              <TouchableOpacity
                style={[styles.statusPill, d.open ? styles.statusOpen : styles.statusClosed]}
                onPress={() => {
                  setPicker(null);
                  update(d.day, { open: !d.open });
                }}
              >
                <Text
                  style={[styles.statusText, { color: d.open ? colors.success : colors.danger }]}
                >
                  {d.open ? t('openNow') : t('closedNow')}
                </Text>
              </TouchableOpacity>

              {d.open && (
                <View style={[ROW, styles.times]}>
                  <TouchableOpacity
                    style={[styles.timeChip, openField === 'from' && styles.timeChipOn]}
                    onPress={() =>
                      setPicker(openField === 'from' ? null : { day: d.day, field: 'from' })
                    }
                  >
                    <Text style={[styles.timeText, openField === 'from' && styles.timeTextOn]}>
                      {d.from}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.dash}>–</Text>
                  <TouchableOpacity
                    style={[styles.timeChip, openField === 'to' && styles.timeChipOn]}
                    onPress={() =>
                      setPicker(openField === 'to' ? null : { day: d.day, field: 'to' })
                    }
                  >
                    <Text style={[styles.timeText, openField === 'to' && styles.timeTextOn]}>
                      {d.to}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {openField && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.slots}
                // RTL: reverse the row so the earliest slot sits on the right
                contentContainerStyle={{ flexDirection: 'row-reverse', gap: 6, paddingVertical: 6 }}
              >
                {TIME_SLOTS.map((slot) => {
                  const selected = (openField === 'from' ? d.from : d.to) === slot;
                  return (
                    <TouchableOpacity
                      key={slot}
                      style={[styles.slot, selected && styles.slotOn]}
                      onPress={() => {
                        update(d.day, { [openField]: slot } as Partial<DayHours>);
                        setPicker(null);
                      }}
                    >
                      <Text style={[styles.slotText, selected && styles.slotTextOn]}>{slot}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', gap: spacing.sm },
  day: { width: 62, fontSize: 13, fontWeight: '700', color: colors.text, textAlign: 'right' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full },
  statusOpen: { backgroundColor: colors.successSoft },
  statusClosed: { backgroundColor: colors.dangerSoft },
  statusText: { fontSize: 11.5, fontWeight: '800' },
  times: { alignItems: 'center', gap: 6, flex: 1, justifyContent: 'flex-end' },
  timeChip: {
    backgroundColor: colors.chipBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  timeChipOn: { backgroundColor: colors.primary },
  timeText: { fontSize: 12.5, fontWeight: '700', color: colors.textMuted },
  timeTextOn: { color: '#FFFFFF' },
  dash: { color: colors.textFaint, fontSize: 12 },
  slots: { marginTop: 2 },
  slot: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  slotOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  slotText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  slotTextOn: { color: colors.primary, fontWeight: '800' },
});
