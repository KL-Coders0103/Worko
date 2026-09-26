import React from 'react';
import {StyleSheet, View} from 'react-native';
import {AppButton} from './AppButton';
import {AppText} from './AppText';
import {useTheme} from '../../theme/ThemeProvider';

type ErrorStateProps = {
  title?: string;
  description?: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

export const ErrorState = ({
  title = 'Something went wrong',
  description = 'We could not complete this request. Please try again.',
  actionLabel = 'Try again',
  onActionPress,
}: ErrorStateProps): React.JSX.Element => {
  const {theme} = useTheme();

  return (
  <View style={styles.container}>
    <View style={styles.mark}>
      <AppText variant="title">!</AppText>
    </View>
    <AppText variant="title" style={styles.title}>{title}</AppText>
    <AppText variant="body" muted style={styles.description}>{description}</AppText>
    {onActionPress ? (
      <View style={styles.action}>
        <AppButton label={actionLabel} onPress={onActionPress} />
      </View>
    ) : null}
  </View>
  );
};

const styles = StyleSheet.create({
  container: {alignItems: 'center', justifyContent: 'center', padding: 24},
  mark: {width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.danger},
  title: {textAlign: 'center', marginTop: 16},
  description: {textAlign: 'center', marginTop: 8, maxWidth: 340},
  action: {marginTop: 20, width: '100%', maxWidth: 280},
});
