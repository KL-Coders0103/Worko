import React, { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import { palette, radius, spacing } from './tokens';

export type ToastTone = 'success' | 'error' | 'info';
export type ToastMessage = { title: string; message: string; tone: ToastTone };

export function WorkoToast({ toast }: { toast: ToastMessage | null }) {
  useEffect(() => {
    if (toast) AccessibilityInfo.announceForAccessibility(`${toast.title}. ${toast.message}`);
  }, [toast]);
  if (!toast) return null;
  const backgroundColor = toast.tone === 'success' ? palette.success : toast.tone === 'error' ? palette.error : palette.ink;
  return <View pointerEvents="none" accessibilityLiveRegion="polite" accessibilityRole="alert" style={[styles.toast, { backgroundColor }]}>
    <Text style={styles.title}>{toast.title}</Text><Text style={styles.message}>{toast.message}</Text>
  </View>;
}
const styles = StyleSheet.create({
  toast: { position: 'absolute', top: spacing.md, left: spacing.lg, right: spacing.lg, zIndex: 1000, elevation: 8, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  title: { color: palette.white, fontSize: 14, fontWeight: '800', marginBottom: 3 },
  message: { color: palette.white, fontSize: 13, lineHeight: 18 },
});
