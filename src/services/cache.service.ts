import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@cache:';

interface CacheEntry<T> {
    data: T;
    expiresAt: number; // timestamp
}

export interface CachedValue<T> {
    data: T;
    /** True once the TTL has elapsed. The value is still returned. */
    stale: boolean;
    /** How long ago the TTL elapsed, in ms. 0 while still fresh. */
    expiredForMs: number;
}

export const CacheService = {
    async get<T>(key: string): Promise<CachedValue<T> | null> {
        try {
            const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
            if (!raw) return null;

            const entry: CacheEntry<T> = JSON.parse(raw);
            const expiredForMs = Math.max(0, Date.now() - entry.expiresAt);
            return { data: entry.data, stale: expiredForMs > 0, expiredForMs };
        } catch {
            return null;
        }
    },

    async set<T>(key: string, data: T, ttlMs: number): Promise<void> {
        try {
            const entry: CacheEntry<T> = {
                data,
                expiresAt: Date.now() + ttlMs,
            };
            await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
        } catch (error) {
            console.warn('[Cache] Failed to write:', key, error);
        }
    },

    async invalidate(key: string): Promise<void> {
        try {
            await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
        } catch {
            // ignore
        }
    },

    async invalidateAll(): Promise<void> {
        try {
            const keys = await AsyncStorage.getAllKeys();
            const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
            if (cacheKeys.length > 0) {
                await AsyncStorage.multiRemove(cacheKeys);
            }
        } catch {
            // ignore
        }
    },
};
