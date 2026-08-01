import { I18nManager, TextStyle, ViewStyle } from 'react-native';

// Deterministic LTR base + MANUAL RTL styling.
// forceRTL() is unreliable inside Expo Go, so we lay out RTL by hand:
// every horizontal row uses ROW (row-reverse) and text uses RTL_TEXT.
export function ensureRtl() {
  try {
    I18nManager.allowRTL(false);
    I18nManager.forceRTL(false);
  } catch {}
}

/** Horizontal row laid out right-to-left. */
export const ROW: ViewStyle = { flexDirection: 'row-reverse' };

/** Right-aligned RTL text (Hebrew/Arabic). */
export const RTL_TEXT: TextStyle = { textAlign: 'right', writingDirection: 'rtl' };
