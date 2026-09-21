import React, {useEffect, useState} from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import type {WorkerOnboardingParamList} from '../../../navigation/WorkerOnboardingNavigator';
import {Button} from '../../../components/Button';
import {Screen} from '../../../components/Screen';

import {
  spacing,
  typography,
  useTheme,
} from '../../../theme';

import {
  getMyWorkerProfile,
  getSkills,
  updateWorkerSkills,
} from '../worker.api';

import type {WorkerSkill} from '../worker.type';

export function WorkerSkillsScreen() {
  const {colors} = useTheme();
  const navigation =
    useNavigation<
      NativeStackNavigationProp<WorkerOnboardingParamList>
    >();
  const [skills, setSkills] =
    useState<WorkerSkill[]>([]);

  const [selectedSkillIds, setSelectedSkillIds] =
    useState<string[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const profile =
          await getMyWorkerProfile();

        const categoryIds =
          profile.categories.map(
            item => item.category.id,
          );

        if (categoryIds.length === 0) {
          setSkills([]);
          setLoading(false);
          return;
        }

        const skillLists = await Promise.all(
          categoryIds.map(categoryId =>
            getSkills(categoryId),
          ),
        );

        const mergedSkills = skillLists
          .flat()
          .filter(
            (skill, index, array) =>
              array.findIndex(
                item => item.id === skill.id,
              ) === index,
          );

        setSkills(mergedSkills);

        setSelectedSkillIds(
          profile.skills.map(
            item => item.skill.id,
          ),
        );
      } catch {
        Alert.alert(
          'Unable to load skills',
          'Please try again.',
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const toggleSkill = (skillId: string) => {
    setSelectedSkillIds(current => {
      if (current.includes(skillId)) {
        return current.filter(
          id => id !== skillId,
        );
      }

      return [...current, skillId];
    });
  };

  const handleContinue = async () => {
    if (selectedSkillIds.length === 0) {
      Alert.alert(
        'Select skills',
        'Please select at least one skill.',
      );
      return;
    }

    try {
      setSaving(true);

      await updateWorkerSkills(
        selectedSkillIds,
      );

      navigation.navigate('WorkerLocation');

      Alert.alert(
        'Skills saved',
        'Your skills have been updated.',
      );
    } catch (error: any) {
      const message =
        error?.response?.data?.message;

      Alert.alert(
        'Unable to save',
        Array.isArray(message)
          ? message.join('\n')
          : message ||
              'Please try again.',
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
        Select your skills
      </Text>

      <Text
        style={[
          styles.subtitle,
          {color: colors.textSecondary},
        ]}>
        Choose the skills you can provide to
        clients.
      </Text>

      {skills.length === 0 ? (
        <View
          style={[
            styles.empty,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}>
          <Text
            style={[
              styles.emptyText,
              {color: colors.textSecondary},
            ]}>
            Select a work category first to see
            available skills.
          </Text>
        </View>
      ) : (
        <View style={styles.skills}>
          {skills.map(skill => {
            const selected =
              selectedSkillIds.includes(skill.id);

            return (
              <Pressable
                key={skill.id}
                onPress={() =>
                  toggleSkill(skill.id)
                }
                style={[
                  styles.skill,
                  {
                    backgroundColor: selected
                      ? colors.primary
                      : colors.surface,
                    borderColor: selected
                      ? colors.primary
                      : colors.border,
                  },
                ]}>
                <Text
                  style={[
                    styles.skillText,
                    {color: colors.text},
                  ]}>
                  {skill.name}
                </Text>

                {selected ? (
                  <Text
                    style={[
                      styles.selectedMark,
                      {color: colors.text},
                    ]}>
                    ✓
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      )}

      <Button
        title="Save & Continue"
        onPress={handleContinue}
        loading={saving}
        disabled={skills.length === 0}
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

  skills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },

  skill: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },

  skillText: {
    ...typography.small,
  },

  selectedMark: {
    marginLeft: spacing.sm,
    fontSize: 15,
    fontWeight: '700',
  },

  empty: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },

  emptyText: {
    ...typography.body,
    textAlign: 'center',
  },
});