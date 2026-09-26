import React, {createContext, useCallback, useContext, useMemo, useRef, useState} from 'react';
import {Animated, StyleSheet, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AppText} from './AppText';
import {useTheme} from '../../theme/ThemeProvider';

type ToastType = 'success' | 'error' | 'info';
type ToastContextValue = {show: (message: string, type?: ToastType) => void};
const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider = ({children}: React.PropsWithChildren): React.JSX.Element => {
  const {theme} = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{message: string; type: ToastType} | null>(null);
  const translateY = useRef(new Animated.Value(80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, type: ToastType = 'info') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({message, type});
    translateY.setValue(80);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(translateY, {toValue: 0, useNativeDriver: true, damping: 16, stiffness: 180}),
      Animated.timing(opacity, {toValue: 1, duration: 180, useNativeDriver: true}),
    ]).start();
    timer.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {toValue: 80, duration: 180, useNativeDriver: true}),
        Animated.timing(opacity, {toValue: 0, duration: 180, useNativeDriver: true}),
      ]).start(({finished}) => { if (finished) setToast(null); });
    }, 3000);
  }, [opacity, translateY]);

  const value = useMemo(() => ({show}), [show]);
  const accent = toast?.type === 'error' ? theme.colors.danger : theme.colors.accent;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <Animated.View pointerEvents="none" style={[styles.wrapper, {bottom: Math.max(insets.bottom, 16) + 12, opacity, transform: [{translateY}]}]}>
          <View style={[styles.toast, {backgroundColor: theme.colors.surfaceElevated, borderColor: accent}]}>
            <View style={[styles.dot, {backgroundColor: accent}]} />
            <AppText variant="caption" style={styles.message}>{toast.message}</AppText>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
};

const styles = StyleSheet.create({
  wrapper: {position: 'absolute', left: 20, right: 20, alignItems: 'center'},
  toast: {maxWidth: 420, width: '100%', minHeight: 52, borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10, elevation: 6},
  dot: {width: 8, height: 8, borderRadius: 4},
  message: {flex: 1, fontWeight: '600'},
});
