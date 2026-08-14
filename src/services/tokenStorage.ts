import * as SecureStore from 'expo-secure-store';

/**
 * Atomic storage for the access/refresh token pair.
 *
 * The tokens used to live in two independent SecureStore keys, written with two
 * sequential `setItemAsync` calls. That pair is not atomic: if the second write
 * failed (or the process died between them) the device was left holding an
 * access token with no refresh token. Seven days later the access token expired,
 * the 401 interceptor found no refresh token, and tore the session down without
 * ever asking the backend — a silent logout with zero server-side trace.
 *
 * Storing the pair as a single JSON value makes the write all-or-nothing: either
 * both tokens are persisted or neither is, and a half-written state can never be
 * observed by a later read.
 */

const TOKENS_KEY = 'auth_tokens';

// Pre-atomic keys. Still read once, to migrate sessions created by older builds.
const LEGACY_ACCESS_KEY = 'access_token';
const LEGACY_REFRESH_KEY = 'refresh_token';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  /** When this pair was persisted. Drives the proactive refresh on foreground. */
  savedAt: number;
}

/** Access tokens live 7 days server-side; renew with a day of headroom. */
const ACCESS_TOKEN_MAX_AGE_MS = 6 * 24 * 60 * 60 * 1000;

function isValidPair(value: unknown): value is TokenPair {
  if (!value || typeof value !== 'object') return false;
  const pair = value as Partial<TokenPair>;
  return (
    typeof pair.accessToken === 'string' &&
    pair.accessToken.length > 0 &&
    typeof pair.refreshToken === 'string' &&
    pair.refreshToken.length > 0
  );
}

async function readLegacyPair(): Promise<TokenPair | null> {
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(LEGACY_ACCESS_KEY),
    SecureStore.getItemAsync(LEGACY_REFRESH_KEY),
  ]);

  if (accessToken && refreshToken) {
    return { accessToken, refreshToken, savedAt: Date.now() };
  }

  // Exactly one of the two present is the corrupt state this module exists to
  // prevent. There is nothing to recover: without a refresh token the access
  // token cannot be renewed, and an orphaned refresh token has no session.
  if (accessToken || refreshToken) {
    console.warn('[TokenStorage] Discarding partially written legacy token pair');
    await clearLegacy();
  }

  return null;
}

async function clearLegacy(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(LEGACY_ACCESS_KEY),
    SecureStore.deleteItemAsync(LEGACY_REFRESH_KEY),
  ]);
}

/**
 * Coalesces concurrent reads.
 *
 * A cold start fires several `get()` calls at once — the session loader, the request
 * interceptor on every outbound call, the proactive refresh check. Left uncoordinated
 * they all observe the legacy keys and all run the migration (six times, in practice).
 * Beyond the wasted writes that opens a real hole: a caller that reads the new key just
 * before another writes it, and reaches the legacy keys just after that one deletes
 * them, sees nothing and reports "no session" for an account that is perfectly signed
 * in — which in loadSession also unregisters the device from push.
 */
let inFlightRead: Promise<TokenPair | null> | null = null;

export const tokenStorage = {
  /**
   * Read the token pair, migrating a legacy two-key session on first run.
   * Returns null when there is no usable session.
   */
  async get(): Promise<TokenPair | null> {
    if (!inFlightRead) {
      inFlightRead = this.readOnce().finally(() => {
        inFlightRead = null;
      });
    }
    return inFlightRead;
  },

  async readOnce(): Promise<TokenPair | null> {
    try {
      const raw = await SecureStore.getItemAsync(TOKENS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isValidPair(parsed)) {
          return { ...parsed, savedAt: parsed.savedAt ?? Date.now() };
        }
        console.warn('[TokenStorage] Stored token pair is malformed, discarding');
        await SecureStore.deleteItemAsync(TOKENS_KEY);
        return null;
      }

      const legacy = await readLegacyPair();
      if (legacy) {
        await this.set(legacy.accessToken, legacy.refreshToken);
        await clearLegacy();
        console.log('[TokenStorage] Migrated legacy token pair to atomic storage');
        return legacy;
      }

      return null;
    } catch (error) {
      // A read failure is not proof the session is gone — never let it be
      // mistaken for "logged out".
      console.error('[TokenStorage] Failed to read tokens:', error);
      throw error;
    }
  },

  async getAccessToken(): Promise<string | null> {
    try {
      const pair = await this.get();
      return pair?.accessToken ?? null;
    } catch {
      return null;
    }
  },

  /** Persist both tokens in a single write. Throws if the write fails. */
  async set(accessToken: string, refreshToken: string): Promise<TokenPair> {
    if (!accessToken || !refreshToken) {
      throw new Error('[TokenStorage] Refusing to persist an incomplete token pair');
    }
    const pair: TokenPair = { accessToken, refreshToken, savedAt: Date.now() };
    await SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(pair));
    return pair;
  },

  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKENS_KEY);
    await clearLegacy();
  },

  /** True when the access token is old enough that it should be renewed early. */
  isAccessTokenStale(pair: TokenPair): boolean {
    return Date.now() - pair.savedAt > ACCESS_TOKEN_MAX_AGE_MS;
  },
};
