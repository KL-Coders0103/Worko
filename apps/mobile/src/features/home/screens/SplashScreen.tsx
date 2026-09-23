import React, {useEffect, useRef} from 'react';

import {
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Screen } from '../../../components/Screen';

type Props = {
  onFinished: () => void;
};

export function SplashScreen({
  onFinished,
}: Props) {
  const opacity = useRef(
    new Animated.Value(0),
  ).current;

  const scale = useRef(
    new Animated.Value(0.92),
  ).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),

      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      onFinished();
    }, 1500);

    return () => {
      clearTimeout(timer);
    };
  }, [onFinished, opacity, scale]);

  return (
    <Screen>
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity,
              transform: [{scale}],
            },
          ]}>
          <Text style={styles.logo}>
            WORKO
          </Text>

          <Text style={styles.tagline}>
            Work. Connect. Grow.
          </Text>
        </Animated.View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  logoContainer: {
    alignItems: 'center',
  },

  logo: {
    color: '#FF6B00',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 2,
  },

  tagline: {
    color: '#888888',
    fontSize: 14,
    marginTop: 10,
    letterSpacing: 0.5,
  },
});