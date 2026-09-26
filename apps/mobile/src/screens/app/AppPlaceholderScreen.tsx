import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Screen} from '../../components/ui/Screen';
import {AppText} from '../../components/ui/AppText';
import {AppBadge} from '../../components/ui/AppBadge';

type AppPlaceholderScreenProps = {title: string; description: string};

export const AppPlaceholderScreen = ({title, description}: AppPlaceholderScreenProps): React.JSX.Element => (
  <Screen centered>
    <View style={styles.container}>
      <AppBadge label="Coming next" />
      <AppText variant="display">{title}</AppText>
      <AppText muted style={styles.description}>{description}</AppText>
    </View>
  </Screen>
);

const styles = StyleSheet.create({
  container: {width: '100%', alignItems: 'center', gap: 14},
  description: {textAlign: 'center'},
});
