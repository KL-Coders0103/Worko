import React from 'react';
import {StyleSheet, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Screen} from '../../components/ui/Screen';
import {AppText} from '../../components/ui/AppText';
import {AppButton} from '../../components/ui/AppButton';
import {useTheme} from '../../theme/ThemeProvider';
import type {AuthStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'AuthLanding'>;

export const AuthLandingScreen = ({navigation}: Props): React.JSX.Element => {
  const {theme} = useTheme();

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.brand}>
          <View style={[styles.mark, {backgroundColor: theme.colors.accent}]}>
            <AppText style={styles.markText}>W</AppText>
          </View>
          <AppText variant="title">Worko</AppText>
        </View>

        <View style={styles.hero}>
          <AppText variant="display">Work smarter.{String.fromCharCode(10)}Get work done.</AppText>
          <AppText variant="body" muted>
            A trusted way for clients and workers to connect, manage jobs, and grow through real work.
          </AppText>
        </View>

        <View style={styles.actions}>
          <AppButton label="Create account" onPress={() => navigation.navigate('Register')} />
          <AppButton label="Sign in" variant="secondary" onPress={() => navigation.navigate('Login')} />
        </View>

        <AppText variant="caption" muted style={styles.footer}>
          By continuing, you agree to use Worko responsibly and securely.
        </AppText>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, justifyContent: 'space-between', paddingVertical: 24},
  brand: {flexDirection: 'row', alignItems: 'center', gap: 10},
  mark: {width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center'},
  markText: {color: '#FFFFFF', fontSize: 22, fontWeight: '800'},
  hero: {gap: 14, maxWidth: 360},
  actions: {gap: 12},
  footer: {textAlign: 'center', paddingHorizontal: 16},
});
