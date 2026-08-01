import React, { useState } from 'react';
import { StyleSheet, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../lib/theme';
import { RTL_TEXT } from '../lib/rtl';

interface AuthInputProps extends TextInputProps {
  icon: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
}

/** Rounded auth field: leading icon, RTL text, optional show/hide password. */
export function AuthInput({ icon, isPassword, style, ...props }: AuthInputProps) {
  const [hidden, setHidden] = useState(true);
  return (
    <View style={styles.wrap}>
      <Ionicons name={icon} size={19} color={colors.textFaint} />
      <TextInput
        placeholderTextColor={colors.textFaint}
        secureTextEntry={isPassword ? hidden : false}
        style={[styles.input, RTL_TEXT, style]}
        {...props}
      />
      {isPassword && (
        <TouchableOpacity onPress={() => setHidden((h) => !h)} hitSlop={8}>
          <Ionicons
            name={hidden ? 'eye-off-outline' : 'eye-outline'}
            size={19}
            color={colors.textFaint}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F3F5F9',
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    height: 54,
    marginBottom: 12,
  },
  input: { flex: 1, fontSize: 15.5, color: colors.text, fontWeight: '500' },
});
