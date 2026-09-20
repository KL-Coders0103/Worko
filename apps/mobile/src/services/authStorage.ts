import * as Keychain from 'react-native-keychain';

const SERVICE_NAME = 'com.worko.auth';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

export type StoredTokens = {
  accessToken: string;
  refreshToken: string;
};

export async function saveTokens(
  tokens: StoredTokens,
): Promise<void> {
  await Keychain.setGenericPassword(
    ACCESS_TOKEN_KEY,
    tokens.accessToken,
    {
      service: `${SERVICE_NAME}.${ACCESS_TOKEN_KEY}`,
    },
  );

  await Keychain.setGenericPassword(
    REFRESH_TOKEN_KEY,
    tokens.refreshToken,
    {
      service: `${SERVICE_NAME}.${REFRESH_TOKEN_KEY}`,
    },
  );
}

export async function getTokens(): Promise<StoredTokens | null> {
  const accessCredentials = await Keychain.getGenericPassword({
    service: `${SERVICE_NAME}.${ACCESS_TOKEN_KEY}`,
  });

  const refreshCredentials = await Keychain.getGenericPassword({
    service: `${SERVICE_NAME}.${REFRESH_TOKEN_KEY}`,
  });

  if (!accessCredentials || !refreshCredentials) {
    return null;
  }

  return {
    accessToken: accessCredentials.password,
    refreshToken: refreshCredentials.password,
  };
}

export async function clearTokens(): Promise<void> {
  await Keychain.resetGenericPassword({
    service: `${SERVICE_NAME}.${ACCESS_TOKEN_KEY}`,
  });

  await Keychain.resetGenericPassword({
    service: `${SERVICE_NAME}.${REFRESH_TOKEN_KEY}`,
  });
}