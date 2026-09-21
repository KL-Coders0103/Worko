import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Modal,
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import Geolocation from '@react-native-community/geolocation';

import {Screen} from '../../../components/Screen';
import {Card} from '../../../components/Card';
import {useTheme} from '../../../theme';
import {spacing, typography} from '../../../theme';

import {
  discoverWorkers,
  DiscoveryWorker,
} from '../discovery.api';

type FilterState = {
  category?: string;
  skill?: string;
  radiusKm?: number;
};

const DEBOUNCE_MS = 500;

export function ClientDiscoveryScreen() {
  const {colors} = useTheme();

  const [search, setSearch] = useState('');

  const [workers, setWorkers] = useState<
    DiscoveryWorker[]
  >([]);

  // Filters currently selected in the filter UI.
  const [draftCategory, setDraftCategory] =
    useState<string | undefined>();

  const [draftSkill, setDraftSkill] =
    useState<string | undefined>();

  const [draftRadiusKm, setDraftRadiusKm] =
    useState<number | undefined>();

  // Filters actually applied to API.
  const [appliedFilters, setAppliedFilters] =
    useState<FilterState>({});

  const [showFilters, setShowFilters] =
    useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [locationLoading, setLocationLoading] =
    useState(false);

  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [selectedWorker, setSelectedWorker] =
    useState<DiscoveryWorker | null>(null);

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
          'Allow location permission to find workers near you.',
        );
        return;
      }

      Geolocation.getCurrentPosition(
        position => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
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
              'Please make sure GPS is enabled.',
            );
            return;
          }

          Alert.alert(
            'Unable to get location',
            error.message ||
              'Please try again.',
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

  const loadWorkers = useCallback(
    async (
      searchValue: string,
      filters: FilterState,
      showLoader = true,
    ) => {
      try {
        if (showLoader) {
          setLoading(true);
        }

        const response =
          await discoverWorkers({
            search:
              searchValue.trim() || undefined,

            category: filters.category,

            skill: filters.skill,

            available: true,

            verified: true,

            latitude:
              location?.latitude,

            longitude:
              location?.longitude,

            radiusKm:
              location
                ? filters.radiusKm
                : undefined,
          });

        setWorkers(response.workers);
      } catch (error: any) {
        const rawMessage =
          error?.response?.data?.message;

        const message =
          Array.isArray(rawMessage)
            ? rawMessage.join('\n')
            : typeof rawMessage === 'string'
              ? rawMessage
              : 'Unable to load workers.';

        Alert.alert(
          'Discovery Error',
          message,
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [location],
  );

  /*
   * SEARCH DEBOUNCE
   *
   * API is called only after the user
   * stops typing for 500ms.
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      loadWorkers(
        search,
        appliedFilters,
      );
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [
    search,
    appliedFilters,
    loadWorkers,
  ]);

  const handleSearch = () => {
    loadWorkers(
      search,
      appliedFilters,
    );
  };

  const handleClearSearch = () => {
    setSearch('');
  };

  const handleRefresh = async () => {
    setRefreshing(true);

    await loadWorkers(
      search,
      appliedFilters,
      false,
    );
  };

  /*
   * APPLY FILTERS
   *
   * Draft filter state is copied to applied
   * state only here.
   */
  const handleApplyFilters = () => {
    const nextFilters: FilterState = {
      category: draftCategory,
      skill: draftSkill,
      radiusKm: draftRadiusKm,
    };

    setAppliedFilters(nextFilters);
    setShowFilters(false);

    loadWorkers(
      search,
      nextFilters,
    );
  };

  const clearFilters = () => {
    const emptyFilters: FilterState = {};

    setDraftCategory(undefined);
    setDraftSkill(undefined);
    setDraftRadiusKm(undefined);

    setAppliedFilters(emptyFilters);
    setShowFilters(false);

    loadWorkers(
      search,
      emptyFilters,
    );
  };

  const renderWorkerCard = (
    worker: DiscoveryWorker,
  ) => (
    <Card key={worker.id}>
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.avatar,
            {
              backgroundColor:
                colors.primary,
            },
          ]}>
          <Text
            style={[
              styles.avatarText,
              {
                color:
                  colors.onPrimary,
              },
            ]}>
            {getInitials(worker.name)}
          </Text>
        </View>

        <View style={styles.workerIdentity}>
          <View style={styles.nameRow}>
            <Text
              numberOfLines={1}
              style={[
                styles.workerName,
                {
                  color: colors.text,
                },
              ]}>
              {worker.name ||
                'Worko Worker'}
            </Text>

            {worker.verified ? (
              <View
                style={[
                  styles.verifiedBadge,
                  {
                    backgroundColor:
                      colors.primary,
                  },
                ]}>
                <Text
                  style={[
                    styles.verifiedText,
                    {
                      color:
                        colors.onPrimary,
                    },
                  ]}>
                  ✓
                </Text>
              </View>
            ) : null}
          </View>

          <Text
            style={[
              styles.availability,
              {
                color:
                  colors.textSecondary,
              },
            ]}>
            Available for work
          </Text>
        </View>
      </View>

      {worker.bio ? (
        <Text
          numberOfLines={3}
          style={[
            styles.bio,
            {
              color:
                colors.textSecondary,
            },
          ]}>
          {worker.bio}
        </Text>
      ) : null}

      <View style={styles.metaRow}>
        {worker.experienceYears !== null ? (
          <View
            style={[
              styles.metaItem,
              {
                backgroundColor:
                  colors.background,
              },
            ]}>
            <Text
              style={[
                styles.metaText,
                {
                  color: colors.text,
                },
              ]}>
              {worker.experienceYears}{' '}
              yrs exp.
            </Text>
          </View>
        ) : null}

        {worker.distanceKm !== null ? (
          <View
            style={[
              styles.metaItem,
              {
                backgroundColor:
                  colors.background,
              },
            ]}>
            <Text
              style={[
                styles.metaText,
                {
                  color: colors.text,
                },
              ]}>
              {worker.distanceKm} km away
            </Text>
          </View>
        ) : null}
      </View>

      {worker.categories.length > 0 ? (
        <View style={styles.chipRow}>
          {worker.categories
            .slice(0, 2)
            .map(item => (
              <View
                key={item.id}
                style={[
                  styles.chip,
                  {
                    borderColor:
                      colors.border,
                  },
                ]}>
                <Text
                  style={[
                    styles.chipText,
                    {
                      color:
                        colors.text,
                    },
                  ]}>
                  {item.name}
                </Text>
              </View>
            ))}
        </View>
      ) : null}

      {worker.skills.length > 0 ? (
        <Text
          numberOfLines={2}
          style={[
            styles.skills,
            {
              color:
                colors.textSecondary,
            },
          ]}>
          {worker.skills
            .slice(0, 4)
            .map(item => item.name)
            .join(' • ')}
        </Text>
      ) : null}

      <View
        style={[
          styles.rateRow,
          {
            borderTopColor:
              colors.border,
          },
        ]}>
        <View>
          <Text
            style={[
              styles.rateLabel,
              {
                color:
                  colors.textSecondary,
              },
            ]}>
            Rate
          </Text>

          <Text
            style={[
              styles.rateValue,
              {
                color: colors.text,
              },
            ]}>
            {formatRate(worker)}
          </Text>
        </View>

        <Pressable
          onPress={() =>
            setSelectedWorker(worker)
          }
          style={[
            styles.viewButton,
            {
              backgroundColor:
                colors.primary,
            },
          ]}>
          <Text
            style={[
              styles.viewButtonText,
              {
                color:
                  colors.onPrimary,
              },
            ]}>
            View Profile
          </Text>
        </Pressable>
      </View>
    </Card>
  );

  return (
    <>
      <Screen scroll>
        <View style={styles.header}>
          <Text
            style={[
              styles.title,
              {
                color: colors.text,
              },
            ]}>
            Find a Worker
          </Text>

          <Text
            style={[
              styles.subtitle,
              {
                color:
                  colors.textSecondary,
              },
            ]}>
            Discover verified workers near you
          </Text>
        </View>

        <View style={styles.searchRow}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={
              handleSearch
            }
            returnKeyType="search"
            placeholder="Search workers or skills"
            placeholderTextColor={
              colors.textSecondary
            }
            style={[
              styles.searchInput,
              {
                color: colors.text,
                backgroundColor:
                  colors.surface,
                borderColor:
                  colors.border,
              },
            ]}
          />

          <Pressable
            onPress={handleSearch}
            style={[
              styles.searchButton,
              {
                backgroundColor:
                  colors.primary,
              },
            ]}>
            <Text
              style={[
                styles.buttonText,
                {
                  color:
                    colors.onPrimary,
                },
              ]}>
              Search
            </Text>
          </Pressable>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            onPress={() =>
              setShowFilters(
                previous => !previous,
              )
            }
            style={[
              styles.filterButton,
              {
                borderColor:
                  colors.border,
                backgroundColor:
                  colors.surface,
              },
            ]}>
            <Text
              style={[
                styles.filterText,
                {
                  color: colors.text,
                },
              ]}>
              Filters
              {hasActiveFilters(
                appliedFilters,
              )
                ? ' • Applied'
                : ''}
            </Text>
          </Pressable>

          <Pressable
            onPress={getCurrentLocation}
            style={[
              styles.locationButton,
              {
                backgroundColor:
                  colors.primary,
              },
            ]}>
            {locationLoading ? (
              <ActivityIndicator
                size="small"
                color={
                  colors.onPrimary
                }
              />
            ) : (
              <Text
                style={[
                  styles.buttonText,
                  {
                    color:
                      colors.onPrimary,
                  },
                ]}>
                {location
                  ? 'Location On'
                  : 'Use Location'}
              </Text>
            )}
          </Pressable>
        </View>

        {showFilters ? (
          <Card>
            <Text
              style={[
                styles.filterTitle,
                {
                  color: colors.text,
                },
              ]}>
              Filter Workers
            </Text>

            <Text
              style={[
                styles.filterLabel,
                {
                  color:
                    colors.textSecondary,
                },
              ]}>
              Category
            </Text>

            <View style={styles.optionRow}>
              {[
                ['Industrial', 'industrial'],
                ['Security', 'security'],
                ['Domestic', 'domestic'],
                ['Technical', 'technical'],
              ].map(([label, value]) => (
                <Pressable
                  key={value}
                  onPress={() =>
                    setDraftCategory(
                      draftCategory === value
                        ? undefined
                        : value,
                    )
                  }
                  style={[
                    styles.option,
                    {
                      borderColor:
                        draftCategory ===
                        value
                          ? colors.primary
                          : colors.border,
                      backgroundColor:
                        draftCategory ===
                        value
                          ? colors.primary
                          : colors.surface,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.optionText,
                      {
                        color:
                          draftCategory ===
                          value
                            ? colors.onPrimary
                            : colors.text,
                      },
                    ]}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text
              style={[
                styles.filterLabel,
                {
                  color:
                    colors.textSecondary,
                },
              ]}>
              Skill
            </Text>

            <View style={styles.optionRow}>
              {[
                ['Security Guard', 'security-guard'],
                ['Electrician', 'electrician'],
                ['Plumber', 'plumber'],
                ['Cook', 'cook'],
              ].map(([label, value]) => (
                <Pressable
                  key={value}
                  onPress={() =>
                    setDraftSkill(
                      draftSkill === value
                        ? undefined
                        : value,
                    )
                  }
                  style={[
                    styles.option,
                    {
                      borderColor:
                        draftSkill === value
                          ? colors.primary
                          : colors.border,
                      backgroundColor:
                        draftSkill === value
                          ? colors.primary
                          : colors.surface,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.optionText,
                      {
                        color:
                          draftSkill === value
                            ? colors.onPrimary
                            : colors.text,
                      },
                    ]}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text
              style={[
                styles.filterLabel,
                {
                  color:
                    colors.textSecondary,
                },
              ]}>
              Radius
            </Text>

            <View style={styles.optionRow}>
              {[5, 10, 25, 50].map(
                value => (
                  <Pressable
                    key={value}
                    onPress={() =>
                      setDraftRadiusKm(
                        draftRadiusKm === value
                          ? undefined
                          : value,
                      )
                    }
                    style={[
                      styles.option,
                      {
                        borderColor:
                          draftRadiusKm ===
                          value
                            ? colors.primary
                            : colors.border,
                        backgroundColor:
                          draftRadiusKm ===
                          value
                            ? colors.primary
                            : colors.surface,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.optionText,
                        {
                          color:
                            draftRadiusKm ===
                            value
                              ? colors.onPrimary
                              : colors.text,
                        },
                      ]}>
                      {value} km
                    </Text>
                  </Pressable>
                ),
              )}
            </View>

            {!location ? (
              <Text
                style={[
                  styles.locationHint,
                  {
                    color:
                      colors.textSecondary,
                  },
                ]}>
                Enable location to use radius
                filtering.
              </Text>
            ) : null}

            <View style={styles.filterActions}>
              <Pressable
                onPress={clearFilters}
                style={[
                  styles.clearFilterButton,
                  {
                    borderColor:
                      colors.border,
                  },
                ]}>
                <Text
                  style={[
                    styles.filterActionText,
                    {
                      color:
                        colors.text,
                    },
                  ]}>
                  Clear
                </Text>
              </Pressable>

              <Pressable
                onPress={handleApplyFilters}
                style={[
                  styles.applyButton,
                  {
                    backgroundColor:
                      colors.primary,
                  },
                ]}>
                <Text
                  style={[
                    styles.filterActionText,
                    {
                      color:
                        colors.onPrimary,
                    },
                  ]}>
                  Apply Filters
                </Text>
              </Pressable>
            </View>
          </Card>
        ) : null}

        <View style={styles.resultHeader}>
          <Text
            style={[
              styles.resultTitle,
              {
                color: colors.text,
              },
            ]}>
            Verified Workers
          </Text>

          {!loading ? (
            <Pressable
              onPress={handleRefresh}>
              <Text
                style={[
                  styles.refreshText,
                  {
                    color:
                      colors.primary,
                  },
                ]}>
                Refresh
              </Text>
            </Pressable>
          ) : null}
        </View>

        {hasActiveFilters(appliedFilters) ? (
          <View style={styles.appliedFilterRow}>
            {appliedFilters.category ? (
              <FilterBadge
                text={formatFilter(
                  appliedFilters.category,
                )}
                colors={colors}
              />
            ) : null}

            {appliedFilters.skill ? (
              <FilterBadge
                text={formatFilter(
                  appliedFilters.skill,
                )}
                colors={colors}
              />
            ) : null}

            {appliedFilters.radiusKm ? (
              <FilterBadge
                text={`${appliedFilters.radiusKm} km`}
                colors={colors}
              />
            ) : null}
          </View>
        ) : null}

        {loading ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator
              size="large"
              color={colors.primary}
            />

            <Text
              style={[
                styles.stateText,
                {
                  color:
                    colors.textSecondary,
                },
              ]}>
              Finding workers...
            </Text>
          </View>
        ) : workers.length === 0 ? (
          <Card>
            <View style={styles.emptyState}>
              <Text
                style={[
                  styles.emptyTitle,
                  {
                    color: colors.text,
                  },
                ]}>
                No workers found
              </Text>

              <Text
                style={[
                  styles.emptyText,
                  {
                    color:
                      colors.textSecondary,
                  },
                ]}>
                Try changing your search or
                filters.
              </Text>
            </View>
          </Card>
        ) : (
          <View style={styles.workerList}>
            {workers.map(renderWorkerCard)}
          </View>
        )}
      </Screen>

      {/* Proper worker profile modal */}
      <Modal
        visible={Boolean(selectedWorker)}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setSelectedWorker(null)
        }>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor:
                  colors.surface,
              },
            ]}>
            {selectedWorker ? (
              <>
                <View style={styles.previewHeader}>
                  <Text
                    style={[
                      styles.previewTitle,
                      {
                        color:
                          colors.text,
                      },
                    ]}>
                    {selectedWorker.name ||
                      'Worko Worker'}
                  </Text>

                  <Pressable
                    onPress={() =>
                      setSelectedWorker(null)
                    }>
                    <Text
                      style={[
                        styles.closeText,
                        {
                          color:
                            colors.primary,
                        },
                      ]}>
                      Close
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.modalDivider} />

                <Text
                  style={[
                    styles.previewStatus,
                    {
                      color:
                        colors.primary,
                    },
                  ]}>
                  ✓ Verified Worker
                </Text>

                {selectedWorker.bio ? (
                  <Text
                    style={[
                      styles.previewBio,
                      {
                        color:
                          colors.textSecondary,
                      },
                    ]}>
                    {selectedWorker.bio}
                  </Text>
                ) : null}

                <View
                  style={
                    styles.previewInfoGroup
                  }>
                  <Text
                    style={[
                      styles.previewInfo,
                      {
                        color:
                          colors.text,
                      },
                    ]}>
                    Experience:{' '}
                    {selectedWorker.experienceYears ??
                      'N/A'}{' '}
                    years
                  </Text>

                  <Text
                    style={[
                      styles.previewInfo,
                      {
                        color:
                          colors.text,
                      },
                    ]}>
                    Skills:{' '}
                    {selectedWorker.skills
                      .map(item => item.name)
                      .join(', ') ||
                      'Not specified'}
                  </Text>

                  <Text
                    style={[
                      styles.previewInfo,
                      {
                        color:
                          colors.text,
                      },
                    ]}>
                    Categories:{' '}
                    {selectedWorker.categories
                      .map(item => item.name)
                      .join(', ') ||
                      'Not specified'}
                  </Text>

                  {selectedWorker.distanceKm !==
                  null ? (
                    <Text
                      style={[
                        styles.previewInfo,
                        {
                          color:
                            colors.text,
                        },
                      ]}>
                      Distance:{' '}
                      {selectedWorker.distanceKm}{' '}
                      km
                    </Text>
                  ) : null}

                  <Text
                    style={[
                      styles.previewInfo,
                      {
                        color:
                          colors.text,
                      },
                    ]}>
                    Rate:{' '}
                    {formatRate(
                      selectedWorker,
                    )}
                  </Text>
                </View>

                <Pressable
                  onPress={() =>
                    setSelectedWorker(null)
                  }
                  style={[
                    styles.modalCloseButton,
                    {
                      backgroundColor:
                        colors.primary,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.viewButtonText,
                      {
                        color:
                          colors.onPrimary,
                      },
                    ]}>
                    Done
                  </Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  );
}

function FilterBadge({
  text,
  colors,
}: {
  text: string;
  colors: any;
}) {
  return (
    <View
      style={[
        styles.appliedBadge,
        {
          backgroundColor:
            colors.surface,
          borderColor:
            colors.border,
        },
      ]}>
      <Text
        style={[
          styles.appliedBadgeText,
          {
            color: colors.text,
          },
        ]}>
        {text}
      </Text>
    </View>
  );
}

function hasActiveFilters(
  filters: FilterState,
): boolean {
  return Boolean(
    filters.category ||
      filters.skill ||
      filters.radiusKm,
  );
}

function formatFilter(value: string): string {
  return value
    .split('-')
    .map(
      item =>
        item.charAt(0).toUpperCase() +
        item.slice(1),
    )
    .join(' ');
}

function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return 'W';
  }

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();
}

function formatRate(
  worker: DiscoveryWorker,
): string {
  if (worker.expectedHourlyRate) {
    return `₹${worker.expectedHourlyRate}/hr`;
  }

  if (worker.expectedDailyRate) {
    return `₹${worker.expectedDailyRate}/day`;
  }

  return 'Rate on request';
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.lg,
  },

  title: {
    ...typography.h2,
  },

  subtitle: {
    ...typography.body,
    marginTop: spacing.xs,
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },

  searchInput: {
    flex: 1,
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    ...typography.body,
  },

  searchButton: {
    minHeight: 50,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },

  filterButton: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  locationButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonText: {
    ...typography.small,
  },

  filterText: {
    ...typography.small,
  },

  filterTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
  },

  filterLabel: {
    ...typography.caption,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },

  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  option: {
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },

  optionText: {
    ...typography.small,
  },

  locationHint: {
    ...typography.caption,
    marginTop: spacing.md,
  },

  filterActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },

  clearFilterButton: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  applyButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  filterActionText: {
    ...typography.small,
  },

  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  resultTitle: {
    ...typography.h3,
  },

  refreshText: {
    ...typography.small,
  },

  appliedFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },

  appliedBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },

  appliedBadgeText: {
    ...typography.caption,
  },

  workerList: {
    gap: spacing.md,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    ...typography.bodyMedium,
  },

  workerIdentity: {
    flex: 1,
    marginLeft: spacing.md,
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },

  workerName: {
    flex: 1,
    ...typography.bodyMedium,
  },

  verifiedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  verifiedText: {
    fontSize: 12,
    fontWeight: '700',
  },

  availability: {
    ...typography.small,
    marginTop: 2,
  },

  bio: {
    ...typography.small,
    lineHeight: 20,
    marginTop: spacing.md,
  },

  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },

  metaItem: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },

  metaText: {
    ...typography.small,
  },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },

  chip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },

  chipText: {
    ...typography.small,
  },

  skills: {
    ...typography.small,
    marginTop: spacing.sm,
    lineHeight: 20,
  },

  rateRow: {
    borderTopWidth:
      StyleSheet.hairlineWidth,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  rateLabel: {
    ...typography.caption,
  },

  rateValue: {
    ...typography.bodyMedium,
    marginTop: 2,
  },

  viewButton: {
    minHeight: 42,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  viewButtonText: {
    ...typography.small,
  },

  stateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    gap: spacing.md,
  },

  stateText: {
    ...typography.body,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },

  emptyTitle: {
    ...typography.bodyMedium,
  },

  emptyText: {
    ...typography.small,
    marginTop: spacing.xs,
    textAlign: 'center',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },

  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    minHeight: 360,
  },

  modalDivider: {
    height: StyleSheet.hairlineWidth,
    marginTop: spacing.md,
  },

  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  previewTitle: {
    flex: 1,
    ...typography.h3,
  },

  closeText: {
    ...typography.small,
  },

  previewStatus: {
    ...typography.small,
    marginTop: spacing.md,
  },

  previewBio: {
    ...typography.body,
    marginTop: spacing.md,
    lineHeight: 21,
  },

  previewInfoGroup: {
    marginTop: spacing.md,
  },

  previewInfo: {
    ...typography.small,
    marginTop: spacing.sm,
  },

  modalCloseButton: {
    minHeight: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
});