import AsyncStorage from "@react-native-async-storage/async-storage";

export async function cacheResponse<T>(key: string, data: T): Promise<void> {
  try {
    const entry = { data, cachedAt: new Date().toISOString() };
    await AsyncStorage.setItem(`api_cache:${key}`, JSON.stringify(entry));
  } catch {
    // silently fail - cache is non-critical
  }
}

export async function getCachedResponse<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(`api_cache:${key}`);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    return entry.data as T;
  } catch {
    return null;
  }
}

export async function clearCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith("api_cache:"));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  } catch {
    // silently fail
  }
}

export async function withCache<T>(
  key: string,
  apiCall: () => Promise<T>,
): Promise<T> {
  try {
    const result = await apiCall();
    await cacheResponse(key, result);
    return result;
  } catch {
    const cached = await getCachedResponse<T>(key);
    if (cached) return cached;
    throw new Error("No data available offline");
  }
}
