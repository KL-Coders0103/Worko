import * as Keychain from 'react-native-keychain';
import type {AuthTokens} from './types';

const KEYCHAIN_SERVICE = 'com.worko.auth';
const KEYCHAIN_USERNAME = 'worko-session';

let cachedTokens: AuthTokens | null = null;

export const tokenStorage = {
  async load(): Promise<AuthTokens | null> {
    if (cachedTokens) {
      return cachedTokens;
    }

    const credentials = await Keychain.getGenericPassword({
      service: KEYCHAIN_SERVICE,
    });

    if (!credentials) {
      return null;
    }

    try {
      const tokens = JSON.parse(credentials.password) as AuthTokens;

      if (
        !tokens.accessToken ||
        !tokens.refreshToken ||
        typeof tokens.expiresIn !== 'number'
      ) {
        await this.clear();
        return null;
      }

      cachedTokens = tokens;
      return tokens;
    } catch {
      await this.clear();
      return null;
    }
  },

  async save(tokens: AuthTokens): Promise<void> {
    await Keychain.setGenericPassword(
      KEYCHAIN_USERNAME,
      JSON.stringify(tokens),
      {
        service: KEYCHAIN_SERVICE,
      },
    );

    cachedTokens = tokens;
  },

  async clear(): Promise<void> {
    cachedTokens = null;

    await Keychain.resetGenericPassword({
      service: KEYCHAIN_SERVICE,
    });
  },

  getAccessToken(): string | null {
    return cachedTokens?.accessToken ?? null;
  },

  getRefreshToken(): string | null {
    return cachedTokens?.refreshToken ?? null;
  },

  getCachedTokens(): AuthTokens | null {
    return cachedTokens;
  },
};
