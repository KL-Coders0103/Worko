import React, {useEffect, useMemo, useState} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {AppButton} from '../../components/ui/AppButton';
import {AppInput} from '../../components/ui/AppInput';
import {AppText} from '../../components/ui/AppText';
import {ErrorState} from '../../components/ui/ErrorState';
import {LoadingState} from '../../components/ui/LoadingState';
import {Screen} from '../../components/ui/Screen';
import {SectionHeader} from '../../components/ui/SectionHeader';
import {getWorkoApiErrorMessage} from '../../api/apiClient';
import {clientApi, type ClientCategory, type ClientSkill} from '../../client/clientApi';
import {useClientStore} from '../../store/clientStore';
import {useTheme} from '../../theme/ThemeProvider';
import type {AppStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'CreateRequirement'>;

const getSchedule = (hoursFromNow: number) => {
  const start = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  return {start, end};
};

const formatSchedule = (date: Date) =>
  date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });

export const CreateRequirementScreen = ({navigation}: Props): React.JSX.Element => {
  const {theme} = useTheme();
  const loadRequirements = useClientStore(state => state.loadRequirements);

  const [categories, setCategories] = useState<ClientCategory[]>([]);
  const [skills, setSkills] = useState<ClientSkill[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [skillId, setSkillId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [address, setAddress] = useState('');
  const [scheduleHours, setScheduleHours] = useState(2);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const schedule = useMemo(() => getSchedule(scheduleHours), [scheduleHours]);

  useEffect(() => {
    let active = true;
    void clientApi.listCategories()
      .then(data => {
        if (active) {
          setCategories(data);
          if (data[0]) setCategoryId(data[0].id);
        }
      })
      .catch(err => {
        if (active) setError(getWorkoApiErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoadingCategories(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!categoryId) {
      setSkills([]);
      setSkillId('');
      return;
    }

    let active = true;
    setLoadingSkills(true);
    setSkillId('');
    void clientApi.listSkills(categoryId)
      .then(data => {
        if (active) setSkills(data);
      })
      .catch(err => {
        if (active) setError(getWorkoApiErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoadingSkills(false);
      });
    return () => { active = false; };
  }, [categoryId]);

  const submit = async () => {
    const trimmedTitle = title.trim();
    const trimmedAddress = address.trim();
    const parsedBudget = budget.trim() ? Number(budget) : undefined;

    if (!categoryId) return setError('Please select a category.');
    if (!trimmedTitle) return setError('Please enter a work title.');
    if (!trimmedAddress) return setError('Please enter the work address.');
    if (parsedBudget !== undefined && (!Number.isFinite(parsedBudget) || parsedBudget < 0)) {
      return setError('Please enter a valid budget.');
    }

    setSubmitting(true);
    setError(null);

    try {
      await clientApi.createRequirement({
        categoryId,
        ...(skillId ? {skillId} : {}),
        title: trimmedTitle,
        ...(description.trim() ? {description: description.trim()} : {}),
        ...(parsedBudget !== undefined ? {budget: parsedBudget} : {}),
        scheduledStart: schedule.start.toISOString(),
        scheduledEnd: schedule.end.toISOString(),
        address: trimmedAddress,
      });
      await loadRequirements();
      navigation.goBack();
    } catch (err) {
      setError(getWorkoApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingCategories) {
    return <Screen><LoadingState message="Loading work categories..." /></Screen>;
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AppText variant="display">Post work</AppText>
        <AppText muted>Tell Worko what needs to be done. We will dispatch the requirement to matching workers.</AppText>

        {error ? (
          <ErrorState
            title="Could not continue"
            description={error}
            actionLabel="Dismiss"
            onActionPress={() => setError(null)}
          />
        ) : null}

        <SectionHeader title="Work details" />
        <AppInput label="Work title" placeholder="e.g. Need an electrician" value={title} onChangeText={setTitle} />
        <AppInput
          label="Description"
          placeholder="Describe the work"
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
          style={styles.multiline}
        />

        <SectionHeader title="Category" />
        <View style={styles.chips}>
          {categories.map(category => (
            <AppButton
              key={category.id}
              label={category.name}
              variant={category.id === categoryId ? 'primary' : 'outline'}
              onPress={() => setCategoryId(category.id)}
            />
          ))}
        </View>

        {loadingSkills ? <LoadingState message="Loading skills..." /> : null}
        {skills.length > 0 ? (
          <>
            <SectionHeader title="Skill (optional)" />
            <View style={styles.chips}>
              {skills.map(skill => (
                <AppButton
                  key={skill.id}
                  label={skill.name}
                  variant={skill.id === skillId ? 'primary' : 'outline'}
                  onPress={() => setSkillId(skill.id)}
                />
              ))}
            </View>
          </>
        ) : null}

        <AppInput
          label="Budget (optional)"
          placeholder="Enter amount"
          value={budget}
          onChangeText={setBudget}
          keyboardType="decimal-pad"
        />
        <AppInput
          label="Work address"
          placeholder="Enter the complete work location"
          value={address}
          onChangeText={setAddress}
        />

        <SectionHeader title="Schedule" subtitle="Choose when the work should start." />
        <View style={styles.scheduleRow}>
          {[2, 6, 24].map(hours => (
            <AppButton
              key={hours}
              label={hours === 24 ? 'Tomorrow' : `In ${hours}h`}
              variant={scheduleHours === hours ? 'primary' : 'outline'}
              onPress={() => setScheduleHours(hours)}
            />
          ))}
        </View>
        <View style={[styles.scheduleCard, {backgroundColor: theme.colors.surface, borderColor: theme.colors.border}]}>
          <AppText variant="label">Start</AppText>
          <AppText muted>{formatSchedule(schedule.start)}</AppText>
          <AppText variant="label" style={styles.endLabel}>End</AppText>
          <AppText muted>{formatSchedule(schedule.end)}</AppText>
        </View>

        <AppButton label="Post requirement" onPress={() => void submit()} loading={submitting} disabled={submitting} />
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {padding: 20, paddingBottom: 40, gap: 16},
  multiline: {minHeight: 120, paddingTop: 14},
  chips: {gap: 10},
  scheduleRow: {gap: 10},
  scheduleCard: {borderWidth: 1, borderRadius: 16, padding: 16, gap: 5},
  endLabel: {marginTop: 8},
});
