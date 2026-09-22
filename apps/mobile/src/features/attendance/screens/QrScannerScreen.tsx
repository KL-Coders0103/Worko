import React, {useState} from 'react';

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  Camera,
} from 'react-native-camera-kit';

import {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import {
  AppStackParamList,
} from '../../../navigation/AppNavigator';

import {
  useTheme,
} from '../../../theme';

type Props = NativeStackScreenProps<
  AppStackParamList,
  'QrScanner'
>;

export function QrScannerScreen({
  route,
  navigation,
}: Props) {
  const {colors} = useTheme();

  const [scanned, setScanned] =
    useState(false);

  const handleRead = (event: any) => {
    if (scanned) {
      return;
    }

    const token =
      event?.nativeEvent?.codeStringValue?.trim();

    if (!token) {
      return;
    }

    setScanned(true);

    navigation.replace('AttendanceAction', {
      bookingId: route.params.bookingId,
      purpose: route.params.purpose,
      qrToken: token,
    });
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
        },
      ]}>
      <Camera
        style={StyleSheet.absoluteFill}
        scanBarcode
        onReadCode={handleRead}
        showFrame
        laserColor={colors.primary}
        frameColor={colors.primary}
      />

      <View style={styles.overlay}>
        <Text
          style={[
            styles.title,
            {color: '#FFFFFF'},
          ]}>
          Scan Client QR
        </Text>

        <Text
          style={[
            styles.subtitle,
            {color: '#FFFFFF'},
          ]}>
          Align the QR code inside the frame
        </Text>

        <Pressable
          style={[
            styles.cancelButton,
            {
              backgroundColor:
                colors.surface,
            },
          ]}
          onPress={() => navigation.goBack()}>
          <Text
            style={[
              styles.cancelText,
              {color: colors.text},
            ]}>
            Cancel
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: 24,
    paddingBottom: 40,
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 14,
    marginBottom: 24,
  },

  cancelButton: {
    minWidth: 140,
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
});