import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Typography } from '../common/Typography';
import { Button } from '../buttons/Button';
import { colors, spacing } from '../../theme';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ 
  title = 'Something went wrong', 
  message = 'We encountered an error processing your request.', 
  onRetry 
}: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <Typography variant="h2" color={colors.status.error} align="center" style={styles.title}>
        {title}
      </Typography>
      <Typography variant="body" align="center" style={styles.message}>
        {message}
      </Typography>
      {onRetry && (
        <Button title="Try Again" variant="outline" onPress={onRetry} style={styles.button} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  title: {
    marginBottom: spacing.sm,
  },
  message: {
    marginBottom: spacing.lg,
  },
  button: {
    minWidth: 150,
  }
});