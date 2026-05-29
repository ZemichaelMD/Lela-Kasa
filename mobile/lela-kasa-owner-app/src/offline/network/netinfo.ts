import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { BASE_URL } from '../../lib/sdk/client';
import type { NetworkState } from '../types';

type NetworkListener = (state: NetworkState) => void;

const listeners = new Set<NetworkListener>();

let _isConnected = false;
let _isInternetReachable = false;
let _apiReachable = false;
let _currentState: NetworkState = 'offline';

export function getCurrentNetworkState(): NetworkState {
  return _currentState;
}

export function isOnline(): boolean {
  return _currentState === 'online';
}

export function subscribeToNetwork(listener: NetworkListener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export async function probeApiHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${BASE_URL}/api/v1/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

function updateState() {
  const prev = _currentState;
  if (_isConnected && _isInternetReachable && _apiReachable) {
    _currentState = 'online';
  } else if (_isConnected && _isInternetReachable && !_apiReachable) {
    _currentState = 'degraded';
  } else {
    _currentState = 'offline';
  }
  if (prev !== _currentState) {
    listeners.forEach(fn => fn(_currentState));
  }
}

export function startNetworkMonitoring(): () => void {
  const unsubscribeNetInfo = NetInfo.addEventListener((state: NetInfoState) => {
    _isConnected = state.isConnected ?? false;
    _isInternetReachable = state.isInternetReachable ?? false;
    if (_isConnected && _isInternetReachable) {
      probeApiHealth().then(ok => {
        _apiReachable = ok;
        updateState();
      });
    } else {
      _apiReachable = false;
      updateState();
    }
  });

  const healthInterval = setInterval(async () => {
    if (_isConnected && _isInternetReachable) {
      _apiReachable = await probeApiHealth();
      updateState();
    }
  }, 30000);

  return () => {
    unsubscribeNetInfo();
    clearInterval(healthInterval);
  };
}
