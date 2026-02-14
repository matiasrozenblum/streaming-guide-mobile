import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@cache:';

interface CacheEntry<T> {
    data: T;
    expiresAt: number; // timestamp
}

export const CacheService = {
    async get<T>(key: string): Promise<{ data: T; stale: boolean } | null> {
        try {
            const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
            if (!raw) return null;

            const entry: CacheEntry<T> = JSON.parse(raw);
            const stale = Date.now() > entry.expiresAt;
            return { data: entry.data, stale };
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
