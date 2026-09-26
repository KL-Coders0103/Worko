import React, {useEffect, useRef} from 'react';
import {Animated, Easing, StyleSheet, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Screen} from '../../components/ui/Screen';
import {AppText} from '../../components/ui/AppText';
import {AppButton} from '../../components/ui/AppButton';
import {useTheme} from '../../theme/ThemeProvider';
import type {AuthStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'AuthLanding'>;

export const AuthLandingScreen = ({navigation}: Props): React.JSX.Element => {
  const {theme} = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {toValue: 1, duration: 450, easing: Easing.out(Easing.ease), useNativeDriver: true}),
      Animated.spring(translateY, {toValue: 0, useNativeDriver: true, damping: 16, stiffness: 150}),
    ]).start();
  }, [opacity, translateY]);

  return <Screen centered>
    <Animated.View style={[styles.container, {opacity, transform: [{translateY}]}]}>
      <View style={styles.brand}>
        <View style={[styles.mark, {backgroundColor: theme.colors.accent}]}><AppText style={styles.markText}>W</AppText></View>
        <AppText variant="title">Worko</AppText>
      </View>
      <View style={styles.hero}>
        <AppText variant="display" style={styles.title}>Work smarter.{String.fromCharCode(10)}Get work done.</AppText>
        <AppText variant="body" muted style={styles.description}>A trusted way for clients and workers to connect, manage jobs, and grow through real work.</AppText>
      </View>
      <View style={styles.actions}>
        <AppButton label="Create account" onPress={() => navigation.navigate('Register')} />
        <AppButton label="Sign in" variant="secondary" onPress={() => navigation.navigate('Login')} />
      </View>
      <AppText variant="caption" muted style={styles.footer}>Secure authentication • OTP verified • Built for real work</AppText>
    </Animated.View>
  </Screen>;
};

const styles = StyleSheet.create({
  container: {width: '100%', maxWidth: 420, alignItems: 'center', paddingHorizontal: 20},
  brand: {flexDirection: 'row', alignItems: 'center', gap: 10},
  mark: {width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center'},
  markText: {color: '#FFFFFF', fontSize: 26, fontWeight: '900'},
  hero: {alignItems: 'center', marginTop: 52}, title: {textAlign: 'center'}, description: {textAlign: 'center', marginTop: 14, maxWidth: 360, lineHeight: 24},
  actions: {width: '100%', gap: 12, marginTop: 42}, footer: {textAlign: 'center', marginTop: 24},
});
