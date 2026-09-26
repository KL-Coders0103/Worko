import React from 'react';
import {StyleSheet, View} from 'react-native';
import {AppButton} from './AppButton';
import {AppText} from './AppText';

type EmptyStateProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

export const EmptyState = ({
  title,
  description,
  actionLabel,
  onActionPress,
}: EmptyStateProps): React.JSX.Element => (
  <View style={styles.container}>
    <AppText variant="title" style={styles.title}>{title}</AppText>
    {description ? <AppText muted style={styles.description}>{description}</AppText> : null}
    {actionLabel ? (
      <View style={styles.action}>
        <AppButton label={actionLabel} onPress={onActionPress} />
      </View>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20},
  title: {textAlign: 'center'},
  description: {textAlign: 'center', marginTop: 8},
  action: {marginTop: 20, width: '100%', maxWidth: 280},
});
