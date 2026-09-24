import React from 'react';
import { StyleSheet } from 'react-native';
import { Screen } from './Screen';
import { Typography } from './Typography';
import { Button } from '../buttons/Button';
import { spacing } from '../../theme';
import { useAuth } from '../../context/AuthContext';

export function PlaceholderScreen({ routeName }: { routeName: string }) {
  const { logout } = useAuth();
  
  return (
    <Screen style={styles.container}>
      <Typography variant="h2" style={styles.title}>
        {routeName}
      </Typography>
      <Button title="Logout (Dev)" onPress={logout} variant="outline" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    marginBottom: spacing.lg,
  },
});