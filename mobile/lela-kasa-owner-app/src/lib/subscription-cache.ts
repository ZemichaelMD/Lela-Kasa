import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_KEY = "kasa_subscription_cache";

export interface CachedSubscription {
  hasSubscription: boolean;
  planId?: string;
  planName?: string;
  status: string;
  paidUntil?: string;
  trialEndsAt?: string;
  cachedAt: string;
}

export async function saveSubscriptionCache(data: {
  hasSubscription: boolean;
  planId?: string;
  planName?: string;
  status: string;
  paidUntil?: string;
  trialEndsAt?: string;
}): Promise<void> {
  const cached: CachedSubscription = {
    ...data,
    cachedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cached));
}

export async function loadSubscriptionCache(): Promise<CachedSubscription | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedSubscription;
  } catch {
    return null;
  }
}

export async function clearSubscriptionCache(): Promise<void> {
  await AsyncStorage.removeItem(CACHE_KEY);
}
