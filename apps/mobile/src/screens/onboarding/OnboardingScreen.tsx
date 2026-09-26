import React, {useEffect, useRef, useState} from 'react';
import {Animated, Easing, Pressable, StyleSheet, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Screen} from '../../components/ui/Screen';
import {AppText} from '../../components/ui/AppText';
import {AppButton} from '../../components/ui/AppButton';
import {useTheme} from '../../theme/ThemeProvider';
import {useOnboardingStore} from '../../store/onboardingStore';
import type {RootStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;
type Slide = {eyebrow: string; title: string; description: string; mark: string};
const slides: Slide[] = [
  {eyebrow: '01 / MATCH', title: 'Work finds the right people.', description: 'Clients post what they need and Worko helps route the requirement toward relevant workers.', mark: '↗'},
  {eyebrow: '02 / DISCOVER', title: 'See skills, not random profiles.', description: 'Workers can showcase real work through reels while clients discover relevant capability.', mark: '✦'},
  {eyebrow: '03 / GROW', title: 'Build trust through real work.', description: 'Track jobs, complete work, build your reputation, and keep moving forward.', mark: '✓'},
];

export const OnboardingScreen = (_props: Props): React.JSX.Element => {
  const {theme} = useTheme();
  const complete = useOnboardingStore(state => state.complete);
  const [index, setIndex] = useState(0);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(24)).current;
  const current = slides[index];
  const isLast = index === slides.length - 1;

  useEffect(() => {
    opacity.setValue(0); translateX.setValue(24);
    Animated.parallel([
      Animated.timing(opacity, {toValue: 1, duration: 350, easing: Easing.out(Easing.ease), useNativeDriver: true}),
      Animated.spring(translateX, {toValue: 0, useNativeDriver: true, damping: 16, stiffness: 160}),
    ]).start();
  }, [index, opacity, translateX]);

  const next = (): void => {
    if (isLast) { void complete(); return; }
    setIndex(value => value + 1);
  };

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <View style={[styles.brandMark, {backgroundColor: theme.colors.accent}]}><AppText style={styles.brandMarkText}>W</AppText></View>
            <AppText style={styles.brand}>Worko</AppText>
          </View>
          {!isLast ? <Pressable onPress={() => void complete()}><AppText variant="caption" style={styles.skip}>Skip</AppText></Pressable> : <View style={styles.skipSpace} />}
        </View>
        <Animated.View style={[styles.content, {opacity, transform: [{translateX}]}]}>
          <View style={[styles.visual, {backgroundColor: theme.colors.surface, borderColor: theme.colors.border}]}>
            <View style={[styles.visualCircle, {backgroundColor: theme.colors.accent}]}><AppText style={styles.visualMark}>{current.mark}</AppText></View>
            <View style={[styles.visualLine, {backgroundColor: theme.colors.border}]} />
            <View style={[styles.visualLine, styles.shortLine, {backgroundColor: theme.colors.border}]} />
          </View>
          <AppText variant="caption" style={{color: theme.colors.accent, fontWeight: '800'}}>{current.eyebrow}</AppText>
          <AppText variant="display" style={styles.title}>{current.title}</AppText>
          <AppText variant="body" muted style={styles.description}>{current.description}</AppText>
        </Animated.View>
        <View style={styles.bottom}>
          <View style={styles.dots}>{slides.map((slide, dotIndex) => <View key={slide.eyebrow} style={[styles.dot, {backgroundColor: dotIndex === index ? theme.colors.accent : theme.colors.border, width: dotIndex === index ? 28 : 8}]} />)}</View>
          <AppButton label={isLast ? 'Get started' : 'Next'} onPress={next} />
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, maxWidth: 520, width: '100%', alignSelf: 'center', paddingVertical: 8},
  topBar: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  brandRow: {flexDirection: 'row', alignItems: 'center', gap: 9},
  brandMark: {width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center'},
  brandMarkText: {color: '#FFFFFF', fontSize: 18, fontWeight: '900'}, brand: {fontSize: 19, fontWeight: '800'},
  skip: {fontWeight: '800'}, skipSpace: {width: 30},
  content: {flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12},
  visual: {width: '100%', maxWidth: 340, aspectRatio: 1.25, borderRadius: 32, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 34},
  visualCircle: {width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center'}, visualMark: {color: '#FFFFFF', fontSize: 42, fontWeight: '800'},
  visualLine: {height: 8, width: 150, borderRadius: 4, marginTop: 18}, shortLine: {width: 92, marginTop: 10},
  title: {textAlign: 'center', marginTop: 10, maxWidth: 360}, description: {textAlign: 'center', marginTop: 12, maxWidth: 360, lineHeight: 24},
  bottom: {gap: 18}, dots: {height: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6}, dot: {height: 8, borderRadius: 4},
});
