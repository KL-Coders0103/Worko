import React, {useCallback, useEffect, useState} from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  PermissionsAndroid,
  Platform,
} from 'react-native';

import {useFocusEffect} from '@react-navigation/native';

import {Screen} from '../../../components/Screen';
import {Card} from '../../../components/Card';
import {Section} from '../../../components/Section';

import {useAuth} from '../../../context/AuthContext';

import {
  spacing,
  typography,
  useTheme,
} from '../../../theme';

import {
  ClientProfile,
  ClientType,
  createClientProfile,
  getMyClientProfile,
  updateClientProfile,
  updateClientLocation,
} from '../client.api';
import Geolocation from '@react-native-community/geolocation';
import {Button} from '../../../components/Button';


type Coordinates = {
  latitude: number;
  longitude: number;
  accuracy: number;
};
export function ClientProfileScreen() {
  const {colors} = useTheme();
  const {user} = useAuth();
  const [coordinates, setCoordinates] =
    useState<Coordinates | null>(null);

  const [locationLoading, setLocationLoading] =
    useState(false);

  const [locationSaving, setLocationSaving] =
    useState(false);
  const [profile, setProfile] =
    useState<ClientProfile | null>(null);

  const [type, setType] =
    useState<ClientType>('INDIVIDUAL');

  const [companyName, setCompanyName] =
    useState('');

  const [gstin, setGstin] =
    useState('');

  const [contactPerson, setContactPerson] =
    useState('');

  const [businessAddress, setBusinessAddress] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const loadProfile = useCallback(
    async () => {
      try {
        setLoading(true);

        let response =
          await getMyClientProfile();

        if (!response.client) {
          await createClientProfile();

          response =
            await getMyClientProfile();
        }

        if (response.client) {
          const client = response.client;

          setProfile(client);
          setType(client.type);
          setCompanyName(
            client.companyName ?? '',
          );
          setGstin(
            client.gstin ?? '',
          );
          setContactPerson(
            client.contactPerson ?? '',
          );
          setBusinessAddress(
            client.businessAddress ?? '',
          );
        }
      } catch (error: any) {
        const rawMessage =
          error?.response?.data?.message;

        const message =
          Array.isArray(rawMessage)
            ? rawMessage.join('\n')
            : typeof rawMessage === 'string'
              ? rawMessage
              : 'Unable to load your client profile.';

        Alert.alert(
          'Profile Error',
          message,
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const requestLocationPermission =
  async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return true;
    }

    const fineGranted =
      await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS
          .ACCESS_FINE_LOCATION,
      );

    const coarseGranted =
      await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS
          .ACCESS_COARSE_LOCATION,
      );

    if (fineGranted || coarseGranted) {
      return true;
    }

    const granted =
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS
          .ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS
          .ACCESS_COARSE_LOCATION,
      ]);

    return (
      granted[
        PermissionsAndroid.PERMISSIONS
          .ACCESS_FINE_LOCATION
      ] === PermissionsAndroid.RESULTS.GRANTED ||
      granted[
        PermissionsAndroid.PERMISSIONS
          .ACCESS_COARSE_LOCATION
      ] === PermissionsAndroid.RESULTS.GRANTED
    );
  };

  const getCurrentLocation = async () => {
  try {
    setLocationLoading(true);

    const permitted =
      await requestLocationPermission();

    if (!permitted) {
      Alert.alert(
        'Location permission required',
        'Please allow location permission from the app settings to continue.',
      );

      return;
    }

    Geolocation.getCurrentPosition(
      position => {
        setCoordinates({
          latitude:
            position.coords.latitude,
          longitude:
            position.coords.longitude,
          accuracy:
            position.coords.accuracy ?? 0,
        });

        setLocationLoading(false);
      },
      error => {
        setLocationLoading(false);

        if (error.code === 1) {
          Alert.alert(
            'Location permission denied',
            'Please allow location permission for Worko.',
          );
          return;
        }

        if (error.code === 2) {
          Alert.alert(
            'Location unavailable',
            'Please make sure Location/GPS is turned on and try again.',
          );
          return;
        }

        if (error.code === 3) {
          Alert.alert(
            'Location timeout',
            'We could not get your location quickly enough. Please make sure GPS is enabled and try again.',
          );
          return;
        }

        Alert.alert(
          'Unable to get location',
          error.message ||
            'Please make sure location services are enabled.',
        );
      },
      {
        enableHighAccuracy: false,
        timeout: 30000,
        maximumAge: 30000,
      },
    );
  } catch {
    setLocationLoading(false);

    Alert.alert(
      'Location error',
      'Unable to access your location.',
    );
  }
};

const handleSaveLocation = async () => {
  if (!coordinates) {
    Alert.alert(
      'Location required',
      'Please get your current location first.',
    );
    return;
  }

  try {
    setLocationSaving(true);

    await updateClientLocation(
      coordinates.latitude,
      coordinates.longitude,
      coordinates.accuracy,
    );

    Alert.alert(
      'Location saved',
      'Your location has been updated successfully.',
    );
  } catch (error: any) {
    const message =
      error?.response?.data?.message;

    Alert.alert(
      'Unable to save location',
      Array.isArray(message)
        ? message.join('\n')
        : message || 'Please try again.',
    );
  } finally {
    setLocationSaving(false);
  }
};

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  useEffect(() => {
    if (type === 'INDIVIDUAL') {
      setCompanyName('');
      setGstin('');
      setContactPerson('');
      setBusinessAddress('');
    }
  }, [type]);

  const handleSave = async () => {
    if (type === 'BUSINESS') {
      if (!companyName.trim()) {
        Alert.alert(
          'Validation',
          'Company name is required.',
        );
        return;
      }

      if (!contactPerson.trim()) {
        Alert.alert(
          'Validation',
          'Contact person is required.',
        );
        return;
      }

      if (!businessAddress.trim()) {
        Alert.alert(
          'Validation',
          'Business address is required.',
        );
        return;
      }

      if (
        gstin.trim() &&
        !/^[A-Za-z0-9-]+$/.test(
          gstin.trim(),
        )
      ) {
        Alert.alert(
          'Validation',
          'Please enter a valid GSTIN.',
        );
        return;
      }
    }

    try {
      setSaving(true);

      const response =
        await updateClientProfile({
          type,
          ...(type === 'BUSINESS'
            ? {
                companyName:
                  companyName.trim(),
                gstin:
                  gstin.trim() || undefined,
                contactPerson:
                  contactPerson.trim(),
                businessAddress:
                  businessAddress.trim(),
              }
            : {}),
        });

      setProfile(response.client);

      Alert.alert(
        'Profile Updated',
        'Your client profile has been saved successfully.',
      );
    } catch (error: any) {
      const rawMessage =
        error?.response?.data?.message;

      const message =
        Array.isArray(rawMessage)
          ? rawMessage.join('\n')
          : typeof rawMessage === 'string'
            ? rawMessage
            : 'Unable to update your profile.';

      Alert.alert(
        'Update Failed',
        message,
      );
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <Screen>
        <View style={styles.loader}>
          <ActivityIndicator
            size="large"
            color={colors.primary}
          />

          <Text
            style={[
              styles.loadingText,
              {
                color:
                  colors.textSecondary,
              },
            ]}>
            Loading your profile...
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text
          style={[
            styles.title,
            {color: colors.text},
          ]}>
          My Profile
        </Text>

        <Text
          style={[
            styles.subtitle,
            {
              color:
                colors.textSecondary,
            },
          ]}>
          Complete your client information
        </Text>
      </View>

      <Section title="Account">
        <Card>
          <View style={styles.infoRow}>
            <Text
              style={[
                styles.label,
                {
                  color:
                    colors.textSecondary,
                },
              ]}>
              Name
            </Text>

            <Text
              style={[
                styles.value,
                {color: colors.text},
              ]}>
              {[user.firstName, user.lastName]
                .filter(Boolean)
                .join(' ') ||
                'Not provided'}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text
              style={[
                styles.label,
                {
                  color:
                    colors.textSecondary,
                },
              ]}>
              Email
            </Text>

            <Text
              style={[
                styles.value,
                {color: colors.text},
              ]}>
              {user.email ||
                'Not provided'}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text
              style={[
                styles.label,
                {
                  color:
                    colors.textSecondary,
                },
              ]}>
              Phone
            </Text>

            <Text
              style={[
                styles.value,
                {color: colors.text},
              ]}>
              {user.phoneNumber ||
                'Not provided'}
            </Text>
          </View>
        </Card>
      </Section>

      <Section title="Client Type">
        <View style={styles.typeRow}>
          <Pressable
            onPress={() =>
              setType('INDIVIDUAL')
            }
            style={[
              styles.typeButton,
              {
                borderColor:
                  type === 'INDIVIDUAL'
                    ? colors.primary
                    : colors.border,
                backgroundColor:
                  type === 'INDIVIDUAL'
                    ? colors.primary
                    : colors.surface,
              },
            ]}>
            <Text
              style={[
                styles.typeText,
                {
                  color:
                    type === 'INDIVIDUAL'
                      ? colors.onPrimary
                      : colors.text,
                },
              ]}>
              Individual
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              setType('BUSINESS')
            }
            style={[
              styles.typeButton,
              {
                borderColor:
                  type === 'BUSINESS'
                    ? colors.primary
                    : colors.border,
                backgroundColor:
                  type === 'BUSINESS'
                    ? colors.primary
                    : colors.surface,
              },
            ]}>
            <Text
              style={[
                styles.typeText,
                {
                  color:
                    type === 'BUSINESS'
                      ? colors.onPrimary
                      : colors.text,
                },
              ]}>
              Business
            </Text>
          </Pressable>
        </View>
      </Section>

      {type === 'BUSINESS' ? (
        <Section title="Business Information">
          <Card>
            <Text
              style={[
                styles.inputLabel,
                {
                  color:
                    colors.textSecondary,
                },
              ]}>
              Company Name *
            </Text>

            <TextInput
              value={companyName}
              onChangeText={setCompanyName}
              placeholder="Enter company name"
              placeholderTextColor={
                colors.textSecondary
              }
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor:
                    colors.border,
                  backgroundColor:
                    colors.background,
                },
              ]}
            />

            <Text
              style={[
                styles.inputLabel,
                {
                  color:
                    colors.textSecondary,
                },
              ]}>
              GSTIN
            </Text>

            <TextInput
              value={gstin}
              onChangeText={setGstin}
              placeholder="Enter GSTIN"
              placeholderTextColor={
                colors.textSecondary
              }
              autoCapitalize="characters"
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor:
                    colors.border,
                  backgroundColor:
                    colors.background,
                },
              ]}
            />

            <Text
              style={[
                styles.inputLabel,
                {
                  color:
                    colors.textSecondary,
                },
              ]}>
              Contact Person *
            </Text>

            <TextInput
              value={contactPerson}
              onChangeText={
                setContactPerson
              }
              placeholder="Enter contact person"
              placeholderTextColor={
                colors.textSecondary
              }
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor:
                    colors.border,
                  backgroundColor:
                    colors.background,
                },
              ]}
            />

            <Text
              style={[
                styles.inputLabel,
                {
                  color:
                    colors.textSecondary,
                },
              ]}>
              Business Address *
            </Text>

            <TextInput
              value={businessAddress}
              onChangeText={
                setBusinessAddress
              }
              placeholder="Enter business address"
              placeholderTextColor={
                colors.textSecondary
              }
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={[
                styles.input,
                styles.addressInput,
                {
                  color: colors.text,
                  borderColor:
                    colors.border,
                  backgroundColor:
                    colors.background,
                },
              ]}
            />
          </Card>
        </Section>
      ) : (
        <Section title="Individual Profile">
          <Card>
            <Text
              style={[
                styles.individualText,
                {
                  color:
                    colors.textSecondary,
                },
              ]}>
              You're registered as an
              individual client. You can
              start discovering and hiring
              workers.
            </Text>
          </Card>
        </Section>
      )}

      <Section title="Location">
  <Card>
    {coordinates ? (
      <>
        <Text
          style={[
            styles.locationStatus,
            {color: colors.text},
          ]}>
          Location captured
        </Text>

        <Text
          style={[
            styles.locationText,
            {
              color:
                colors.textSecondary,
            },
          ]}>
          Latitude:{' '}
          {coordinates.latitude.toFixed(6)}
        </Text>

        <Text
          style={[
            styles.locationText,
            {
              color:
                colors.textSecondary,
            },
          ]}>
          Longitude:{' '}
          {coordinates.longitude.toFixed(6)}
        </Text>

        <Text
          style={[
            styles.locationText,
            {
              color:
                colors.textSecondary,
            },
          ]}>
          Accuracy: ±
          {Math.round(
            coordinates.accuracy,
          )}
          m
        </Text>
      </>
    ) : (
      <Text
        style={[
          styles.locationText,
          {
            color:
              colors.textSecondary,
          },
        ]}>
        Location not captured
      </Text>
    )}

    <Button
      title={
        coordinates
          ? 'Update Location'
          : 'Use Current Location'
      }
      onPress={getCurrentLocation}
      loading={locationLoading}
      style={styles.locationButton}
    />

    <Button
      title="Save Location"
      onPress={handleSaveLocation}
      loading={locationSaving}
      disabled={!coordinates}
      variant="outline"
      style={styles.locationSaveButton}
    />

    <Text
      style={[
        styles.locationPrivacy,
        {
          color:
            colors.textSecondary,
        },
      ]}>
      Your location is used for Worko
      services and is not displayed as your
      exact address to other users.
    </Text>
  </Card>
</Section>

      <Pressable
        disabled={saving}
        onPress={handleSave}
        style={[
          styles.saveButton,
          {
            backgroundColor:
              colors.primary,
            opacity: saving ? 0.7 : 1,
          },
        ]}>
        {saving ? (
          <ActivityIndicator
            color={colors.onPrimary}
          />
        ) : (
          <Text
            style={[
              styles.saveText,
              {
                color:
                  colors.onPrimary,
              },
            ]}>
            Save Profile
          </Text>
        )}
      </Pressable>

      {profile ? (
        <Text
          style={[
            styles.statusText,
            {
              color:
                colors.textSecondary,
            },
          ]}>
          Profile type: {profile.type}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.xl,
  },

  title: {
    ...typography.h2,
  },

  subtitle: {
    ...typography.body,
    marginTop: spacing.xs,
  },

  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },

  loadingText: {
    ...typography.body,
  },

  infoRow: {
    gap: spacing.xs,
  },

  label: {
    ...typography.caption,
  },

  value: {
    ...typography.bodyMedium,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.md,
  },

  typeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },

  typeButton: {
    flex: 1,
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  typeText: {
    ...typography.bodyMedium,
  },

  inputLabel: {
    ...typography.caption,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },

  input: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    ...typography.body,
  },

  addressInput: {
    minHeight: 110,
    paddingTop: spacing.md,
  },

  individualText: {
    ...typography.body,
    lineHeight: 22,
  },

  saveButton: {
    minHeight: 54,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },

  saveText: {
    ...typography.bodyMedium,
  },

  statusText: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },

  locationStatus: {
  ...typography.h3,
  marginBottom: spacing.md,
},

locationText: {
  ...typography.small,
  marginBottom: spacing.xs,
},

locationButton: {
  marginTop: spacing.lg,
},

locationSaveButton: {
  marginTop: spacing.md,
},

locationPrivacy: {
  ...typography.caption,
  textAlign: 'center',
  marginTop: spacing.lg,
  lineHeight: 20,
},
});