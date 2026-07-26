import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const PLAYER_KEY = 'tooltip_zapping_player_v1';

export function useZappingTooltip() {
  const { isAuthenticated, isLoading } = useAuth();
  const [showPlayer, setShowPlayer] = useState(false);

  useEffect(() => {
    if (isLoading) return; // wait until auth state resolves to avoid a flash
    let cancelled = false;

    const run = async () => {
      const localSeen = !!(await AsyncStorage.getItem(PLAYER_KEY));
      if (cancelled) return;

      if (isAuthenticated) {
        // Reconcile local flag with the backend for cross-device persistence.
        try {
          const res = await api.get('/users/me/seen-features');
          if (cancelled) return;
          const seen: string[] = Array.isArray(res.data) ? res.data : [];
          if (seen.includes(PLAYER_KEY)) {
            // Seen on another device → suppress here too.
            await AsyncStorage.setItem(PLAYER_KEY, 'true');
            setShowPlayer(false);
          } else if (localSeen) {
            // Seen locally (e.g. dismissed while logged out) → push to backend.
            api.post('/users/me/seen-features', { feature: PLAYER_KEY }).catch(() => {});
            setShowPlayer(false);
          } else {
            setShowPlayer(true);
          }
        } catch {
          // Network/endpoint error → fall back to local-only behaviour.
          if (!cancelled) setShowPlayer(!localSeen);
        }
      } else {
        setShowPlayer(!localSeen);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading]);

  const markPlayerSeen = useCallback(async () => {
    setShowPlayer(false);
    await AsyncStorage.setItem(PLAYER_KEY, 'true');
    if (isAuthenticated) {
      api.post('/users/me/seen-features', { feature: PLAYER_KEY }).catch(() => {});
    }
  }, [isAuthenticated]);

  return { showPlayer, markPlayerSeen };
}
