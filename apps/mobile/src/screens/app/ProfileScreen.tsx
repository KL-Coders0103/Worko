import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Screen} from '../../components/ui/Screen';
import {AppText} from '../../components/ui/AppText';
import {AppAvatar} from '../../components/ui/AppAvatar';
import {AppCard} from '../../components/ui/AppCard';
import {AppButton} from '../../components/ui/AppButton';
import {AppDivider} from '../../components/ui/AppDivider';
import {useAuthStore} from '../../store/authStore';
import {useTheme} from '../../theme/ThemeProvider';

export const ProfileScreen = (): React.JSX.Element => {
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const {mode, setMode, theme} = useTheme();
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Worko user';

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.profileHeader}>
          <AppAvatar name={fullName} size={64} />
          <View style={styles.identity}>
            <AppText variant="title">{fullName}</AppText>
            <AppText variant="caption" muted>{user?.email ?? user?.phoneNumber ?? 'Account'}</AppText>
            <AppText variant="caption" style={{color: theme.colors.accent}}>{user?.role ?? 'USER'}</AppText>
          </View>
        </View>

        <AppCard>
          <View style={styles.row}>
            <View style={styles.rowCopy}>
              <AppText style={styles.rowTitle}>Appearance</AppText>
              <AppText variant="caption" muted>Use the theme that feels right for you.</AppText>
            </View>
            <AppText style={{color: theme.colors.accent, fontWeight: '700'}}>{mode === 'dark' ? 'Dark' : 'Light'}</AppText>
          </View>
          <AppDivider />
          <View style={styles.themeActions}>
            <View style={styles.themeButton}><AppButton label="Light" variant={mode === 'light' ? 'primary' : 'secondary'} onPress={() => setMode('light')} /></View>
            <View style={styles.themeButton}><AppButton label="Dark" variant={mode === 'dark' ? 'primary' : 'secondary'} onPress={() => setMode('dark')} /></View>
          </View>
        </AppCard>

        <AppButton label="Sign out" variant="secondary" onPress={() => void logout()} />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {gap: 20},
  profileHeader: {flexDirection: 'row', alignItems: 'center', gap: 14},
  identity: {flex: 1, gap: 3},
  row: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingBottom: 16},
  rowCopy: {flex: 1},
  rowTitle: {fontSize: 16, fontWeight: '700'},
  themeActions: {flexDirection: 'row', gap: 10, paddingTop: 16},
  themeButton: {flex: 1},
});
