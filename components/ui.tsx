import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../lib/theme';
import { ROW, RTL_TEXT } from '../lib/rtl';

// ---------- Button ----------
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'accent' | 'outline' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
  small?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
  style,
  small,
}: ButtonProps) {
  const isOutline = variant === 'outline' || variant === 'ghost';
  const bg =
    variant === 'primary'
      ? colors.primary
      : variant === 'accent'
        ? colors.accent
        : variant === 'danger'
          ? colors.danger
          : 'transparent';
  const fg = isOutline ? colors.primary : variant === 'accent' ? colors.primary : '#FFFFFF';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: bg },
        variant === 'outline' && styles.buttonOutline,
        (disabled || loading) && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <View style={[ROW, { alignItems: 'center', gap: 6 }]}>
          {icon && <Ionicons name={icon} size={small ? 15 : 18} color={fg} />}
          <Text style={[styles.buttonText, small && styles.buttonTextSmall, { color: fg }]}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ---------- Input (RTL) ----------
interface InputProps extends TextInputProps {
  label?: string;
}

export function Input({ label, style, ...props }: InputProps) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textFaint}
        style={[styles.input, RTL_TEXT, style]}
        {...props}
      />
    </View>
  );
}

// ---------- Chip ----------
interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ---------- Badge ----------
export function Badge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'success' | 'danger' | 'accent';
}) {
  const tones = {
    neutral: { bg: colors.chipBg, fg: colors.textMuted },
    success: { bg: colors.successSoft, fg: colors.success },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    accent: { bg: colors.accentSoft, fg: '#B45309' },
  } as const;
  const t = tones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <Text style={[styles.badgeText, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

// ---------- EmptyState ----------
export function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name={icon} size={34} color={colors.textFaint} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

// ---------- SearchBar (RTL) ----------
export function SearchBar({
  value,
  onChangeText,
  placeholder,
  onFilterPress,
  filterActive,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  onFilterPress?: () => void;
  filterActive?: boolean;
}) {
  return (
    <View style={[ROW, { alignItems: 'center', gap: spacing.sm }]}>
      <View style={[styles.searchBox, ROW]}>
        <Ionicons name="search" size={18} color={colors.textFaint} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textFaint}
          style={[styles.searchInput, RTL_TEXT]}
          returnKeyType="search"
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={() => onChangeText('')}>
            <Ionicons name="close-circle" size={18} color={colors.textFaint} />
          </TouchableOpacity>
        )}
      </View>
      {onFilterPress && (
        <TouchableOpacity
          onPress={onFilterPress}
          style={[styles.filterBtn, filterActive && { backgroundColor: colors.primary }]}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={filterActive ? '#FFFFFF' : colors.primary}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ---------- Screen header (RTL) ----------
// No horizontal padding of its own — the surrounding list/container provides it.
export function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ paddingTop: spacing.md }}>
      <Text style={[styles.screenTitle, RTL_TEXT]}>{title}</Text>
      {subtitle ? <Text style={[styles.screenSub, RTL_TEXT]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  buttonSmall: { paddingVertical: 8, paddingHorizontal: spacing.md, borderRadius: radius.sm },
  buttonOutline: { borderWidth: 1.5, borderColor: colors.primary },
  buttonText: { fontSize: 16, fontWeight: '700' },
  buttonTextSmall: { fontSize: 13 },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 6,
    ...RTL_TEXT,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  chip: {
    backgroundColor: colors.chipBg,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  chipSelected: { backgroundColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  chipTextSelected: { color: '#FFFFFF' },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 12, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 64, paddingHorizontal: spacing.xl },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.chipBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 4 },
  emptySubtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  searchBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 44,
    gap: 6,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: { fontSize: 24, fontWeight: '800', color: colors.text },
  screenSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
});
