import React, {useEffect, useState} from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {Button} from '../../../components/Button';
import {Screen} from '../../../components/Screen';

import {
  spacing,
  typography,
  useTheme,
} from '../../../theme';

import {
  getCategories,
  getMyWorkerProfile,
  updateWorkerCategories,
} from '../worker.api';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import type {WorkerOnboardingParamList} from '../../../navigation/WorkerOnboardingNavigator';
import type {WorkerCategory} from '../worker.type';

export function WorkerCategoryScreen() {
  const {colors} = useTheme();
  const navigation =
    useNavigation<
      NativeStackNavigationProp<WorkerOnboardingParamList>
    >();
  const [categories, setCategories] =
    useState<WorkerCategory[]>([]);

  const [selectedCategoryIds, setSelectedCategoryIds] =
    useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const [categoryData, profile] =
          await Promise.all([
            getCategories(),
            getMyWorkerProfile(),
          ]);

        setCategories(categoryData);

        setSelectedCategoryIds(
          profile.categories.map(
            item => item.category.id,
          ),
        );
      } catch {
        Alert.alert(
          'Unable to load categories',
          'Please try again.',
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const toggleCategory = (categoryId: string) => {
    setSelectedCategoryIds(current => {
      if (current.includes(categoryId)) {
        return current.filter(
          id => id !== categoryId,
        );
      }

      return [...current, categoryId];
    });
  };

  const handleContinue = async () => {
    if (selectedCategoryIds.length === 0) {
      Alert.alert(
        'Select a category',
        'Please select at least one work category.',
      );
      return;
    }

    try {
      setSaving(true);

      await updateWorkerCategories(
        selectedCategoryIds,
      );

      navigation.navigate('WorkerSkills');

      Alert.alert(
        'Categories saved',
        'Your work categories have been updated.',
      );
    } catch (error: any) {
      const message =
        error?.response?.data?.message;

      Alert.alert(
        'Unable to save',
        Array.isArray(message)
          ? message.join('\n')
          : message || 'Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <View style={styles.loading}>
          <ActivityIndicator
            size="large"
            color={colors.primary}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text
        style={[
          styles.title,
          {color: colors.text},
        ]}>
        What kind of work do you do?
      </Text>

      <Text
        style={[
          styles.subtitle,
          {color: colors.textSecondary},
        ]}>
        Select all categories that match your
        experience.
      </Text>

      {categories.length === 0 ? (
        <View style={styles.emptyState}>
          <Text
            style={[
              styles.emptyTitle,
              {color: colors.text},
            ]}>
            No work categories available
          </Text>

          <Text
            style={[
              styles.emptySubtitle,
              {color: colors.textSecondary},
            ]}>
            Categories are currently unavailable.
            Please try again.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {categories.map(category => {
            const selected =
              selectedCategoryIds.includes(
                category.id,
              );

            return (
              <Pressable
                key={category.id}
                onPress={() =>
                  toggleCategory(category.id)
                }
                style={[
                  styles.card,
                  {
                    backgroundColor: selected
                      ? colors.primary
                      : colors.surface,
                    borderColor: selected
                      ? colors.primary
                      : colors.border,
                  },
                ]}>
                <View style={styles.cardContent}>
                  <Text
                    style={[
                      styles.categoryName,
                      {color: colors.text},
                    ]}>
                    {category.name}
                  </Text>

                  {category.description ? (
                    <Text
                      style={[
                        styles.description,
                        {
                          color: selected
                            ? colors.text
                            : colors.textSecondary,
                        },
                      ]}>
                      {category.description}
                    </Text>
                  ) : null}
                </View>

                <View
                  style={[
                    styles.check,
                    {
                      borderColor: selected
                        ? colors.text
                        : colors.border,
                      backgroundColor: selected
                        ? colors.text
                        : 'transparent',
                    },
                  ]}>
                  {selected ? (
                    <Text
                      style={[
                        styles.checkText,
                        {
                          color: colors.primary,
                        },
                      ]}>
                      ✓
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      <Button
        title="Save & Continue"
        onPress={handleContinue}
        loading={saving}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    ...typography.h2,
    marginBottom: spacing.sm,
  },

  subtitle: {
    ...typography.body,
    marginBottom: spacing.xl,
  },

  list: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },

  emptyState: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },

  emptyTitle: {
    ...typography.h3,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },

  emptySubtitle: {
    ...typography.body,
    textAlign: 'center',
  },

  card: {
    minHeight: 90,
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },

  cardContent: {
    flex: 1,
    paddingRight: spacing.md,
  },

  categoryName: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },

  description: {
    ...typography.small,
  },

  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkText: {
    fontSize: 17,
    fontWeight: '700',
  },
});