import React, {useEffect, useRef} from 'react';
import {Animated, Easing, StyleSheet, View} from 'react-native';
import {Screen} from '../../components/ui/Screen';
import {AppText} from '../../components/ui/AppText';
import {useAuthStore} from '../../store/authStore';
import {useOnboardingStore} from '../../store/onboardingStore';
import {useTheme} from '../../theme/ThemeProvider';

export const StartupScreen = (): React.JSX.Element => {
  const {theme} = useTheme();
  const status = useAuthStore(state => state.status);
  const scale = useRef(new Animated.Value(0.86)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    void Promise.all([
      useAuthStore.getState().initialize(),
      useOnboardingStore.getState().initialize(),
    ]);
    Animated.parallel([
      Animated.spring(scale, {toValue: 1, useNativeDriver: true, damping: 14, stiffness: 160}),
      Animated.timing(opacity, {toValue: 1, duration: 500, easing: Easing.out(Easing.ease), useNativeDriver: true}),
    ]).start();
  }, [opacity, scale]);

  return (
    <Screen centered>
      <Animated.View style={[styles.content, {opacity, transform: [{scale}]}]}>
        <View style={[styles.mark, {backgroundColor: theme.colors.accent}]}><AppText style={styles.markText}>W</AppText></View>
        <AppText variant="display" style={styles.brand}>Worko</AppText>
        <AppText variant="body" muted style={styles.tagline}>Real work. Better matched.</AppText>
        <View style={styles.pills}>
          <AppText variant="caption" muted>Secure matching</AppText><AppText variant="caption" muted>•</AppText>
          <AppText variant="caption" muted>Real-time work</AppText><AppText variant="caption" muted>•</AppText>
          <AppText variant="caption" muted>Built for people</AppText>
        </View>
        <AppText variant="caption" muted style={styles.status}>{status === 'hydrating' ? 'Preparing your workspace…' : 'Almost ready…'}</AppText>
      </Animated.View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28},
  mark: {width: 76, height: 76, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 18},
  markText: {color: '#FFFFFF', fontSize: 38, fontWeight: '900'},
  brand: {fontWeight: '900'}, tagline: {marginTop: 4, textAlign: 'center'},
  pills: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 24}, status: {marginTop: 44},
});
