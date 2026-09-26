import React from 'react';
import {StyleSheet, View} from 'react-native';
import {AppText} from './AppText';
import {useTheme} from '../../theme/ThemeProvider';

type AuthHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
};

export const AuthHeader = ({eyebrow, title, description}: AuthHeaderProps): React.JSX.Element => {
  const {theme} = useTheme();

  return (
    <View style={styles.container}>
      {eyebrow ? (
        <AppText variant="caption" style={{color: theme.colors.accent, fontWeight: '700'}}>
          {eyebrow.toUpperCase()}
        </AppText>
      ) : null}
      <AppText variant="display">{title}</AppText>
      {description ? <AppText variant="body" muted>{description}</AppText> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {gap: 8},
});
