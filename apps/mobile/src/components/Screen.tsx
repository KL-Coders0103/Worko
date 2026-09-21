import React from 'react';

import {
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  spacing,
  useTheme,
} from '../theme';

type ScreenProps = {
  children: React.ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
};

export function Screen({
  children,
  scroll = false,
  style,
  contentContainerStyle,
  edges = ['top', 'left', 'right'],
}: ScreenProps) {
  const {colors} = useTheme();

  if (scroll) {
    return (
      <SafeAreaView
        edges={edges}
        style={[
          styles.safeArea,
          {
            backgroundColor: colors.background,
          },
          style,
        ]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={[
            styles.scrollView,
            {
              backgroundColor: colors.background,
            },
          ]}
          contentContainerStyle={[
            styles.scrollContent,
            contentContainerStyle,
          ]}>
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={edges}
      style={[
        styles.safeArea,
        {
          backgroundColor: colors.background,
        },
      ]}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
          },
          style,
        ]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
});