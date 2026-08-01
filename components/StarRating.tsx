import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../lib/theme';
import { ROW } from '../lib/rtl';

interface StarRatingProps {
  value: number;
  size?: number;
  onChange?: (value: number) => void; // presence = interactive
}

export function StarRating({ value, size = 16, onChange }: StarRatingProps) {
  return (
    <View style={[ROW, styles.row]}>
      {[1, 2, 3, 4, 5].map((n) =>
        onChange ? (
          <TouchableOpacity key={n} onPress={() => onChange(n)} hitSlop={4}>
            <Ionicons
              name={n <= value ? 'star' : 'star-outline'}
              size={size}
              color={colors.accent}
            />
          </TouchableOpacity>
        ) : (
          <Ionicons
            key={n}
            name={n <= Math.round(value) ? 'star' : 'star-outline'}
            size={size}
            color={colors.accent}
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', gap: 2 },
});
