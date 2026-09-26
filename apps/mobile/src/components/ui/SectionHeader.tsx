import React from 'react';
import {StyleSheet, View} from 'react-native';
import {AppText} from './AppText';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

export const SectionHeader = ({
  title,
  subtitle,
  actionLabel,
  onActionPress,
}: SectionHeaderProps): React.JSX.Element => (
  <View style={styles.container}>
    <View style={styles.copy}>
      <AppText variant="title">{title}</AppText>
      {subtitle ? <AppText variant="caption" muted>{subtitle}</AppText> : null}
    </View>
    {actionLabel ? (
      <AppText
        variant="label"
        onPress={onActionPress}
        accessibilityRole="button"
        style={styles.action}>
        {actionLabel}
      </AppText>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12},
  copy: {flex: 1, gap: 3},
  action: {color: '#FF6B00'},
});
