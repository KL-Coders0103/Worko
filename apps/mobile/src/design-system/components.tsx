import React from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { useWorkoTheme } from './ThemeProvider';
import { radius, spacing, typography, touchTarget } from './tokens';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text';
export function WorkoButton({ title, onPress, variant = 'primary', loading = false, disabled = false, accessibilityLabel }: { title: string; onPress: () => void; variant?: ButtonVariant; loading?: boolean; disabled?: boolean; accessibilityLabel?: string }) {
  const { theme } = useWorkoTheme(); const unavailable = disabled || loading;
  const bg = variant === 'primary' ? theme.primary : variant === 'secondary' ? theme.elevated : 'transparent';
  const color = variant === 'primary' ? theme.onPrimary : theme.text;
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel || title} accessibilityState={{ disabled: unavailable, busy: loading }} disabled={unavailable} onPress={onPress} style={({ pressed }) => [styles.button, { backgroundColor: bg, borderColor: theme.border, borderWidth: variant === 'outline' ? 1 : 0, opacity: unavailable ? .55 : pressed ? .82 : 1 }, variant === 'text' && styles.textButton]}>{loading ? <ActivityIndicator color={color}/> : <Text style={{ color, fontSize: typography.md, fontWeight: '700' }}>{title}</Text>}</Pressable>;
}
export function WorkoInput({ label, error, helperText, style, ...props }: TextInputProps & { label: string; error?: string; helperText?: string }) {
  const { theme } = useWorkoTheme();
  return <View style={styles.field}><Text accessibilityRole="text" style={{ color: theme.text, fontWeight: '600', marginBottom: 7 }}>{label}</Text><TextInput {...props} accessibilityLabel={props.accessibilityLabel || label} placeholderTextColor={theme.secondaryText} style={[styles.input, { color: theme.text, borderColor: error ? theme.error : theme.border, backgroundColor: theme.surface }, style]}/>{!!(error || helperText) && <Text accessibilityLiveRegion="polite" style={{ color: error ? theme.error : theme.secondaryText, marginTop: 5, fontSize: typography.xs }}>{error || helperText}</Text>}</View>;
}
export function WorkoCard({ children, style }: React.PropsWithChildren<{ style?: ViewStyle }>) {
  const { theme } = useWorkoTheme();
  return <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, style]}>{children}</View>;
}
export function WorkoDialog({ visible, title, message, confirmText = 'Continue', cancelText = 'Cancel', destructive = false, onConfirm, onCancel }: { visible: boolean; title: string; message: string; confirmText?: string; cancelText?: string; destructive?: boolean; onConfirm: () => void; onCancel: () => void }) {
  const { theme } = useWorkoTheme();
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}><View style={styles.scrim}><View accessibilityRole="alert" accessibilityViewIsModal style={[styles.dialog, { backgroundColor: theme.surface }]}><Text style={{ color: theme.text, fontSize: typography.lg, fontWeight: '800' }}>{title}</Text><Text style={{ color: theme.secondaryText, marginTop: spacing.sm, lineHeight: 21 }}>{message}</Text><View style={styles.actions}><WorkoButton title={cancelText} variant="outline" onPress={onCancel}/><WorkoButton title={confirmText} variant={destructive ? 'secondary' : 'primary'} onPress={onConfirm}/></View></View></View></Modal>;
}
export function WorkoState({ title, description, actionLabel, onAction, kind = 'empty' }: { title: string; description: string; actionLabel?: string; onAction?: () => void; kind?: 'empty' | 'error' | 'loading' }) {
  const { theme } = useWorkoTheme();
  return <View accessibilityLiveRegion="polite" style={styles.state}>{kind === 'loading' && <ActivityIndicator color={theme.primary} size="large"/>}<Text style={{ color: theme.text, fontWeight: '800', fontSize: typography.lg, textAlign: 'center' }}>{title}</Text><Text style={{ color: theme.secondaryText, textAlign: 'center', lineHeight: 21 }}>{description}</Text>{actionLabel && onAction && <WorkoButton title={actionLabel} onPress={onAction}/>}</View>;
}
const styles = StyleSheet.create({
 button:{ minHeight:touchTarget, borderRadius:radius.md, paddingHorizontal:spacing.lg, paddingVertical:spacing.md, alignItems:'center', justifyContent:'center', flex:1 },
 textButton:{ backgroundColor:'transparent' }, field:{ marginBottom:spacing.lg }, input:{ minHeight:touchTarget, borderWidth:1, borderRadius:radius.md, paddingHorizontal:spacing.md, fontSize:typography.md },
 card:{ borderWidth:1, borderRadius:radius.lg, padding:spacing.lg }, scrim:{ flex:1, backgroundColor:'#0009', justifyContent:'center', padding:spacing.xl }, dialog:{ borderRadius:radius.xl, padding:spacing.xl, gap:spacing.md }, actions:{ flexDirection:'row', gap:spacing.sm, marginTop:spacing.md }, state:{ flex:1, alignItems:'center', justifyContent:'center', padding:spacing.xxl, gap:spacing.md },
});
