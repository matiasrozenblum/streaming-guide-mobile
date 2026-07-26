import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const PLAYER_KEY = 'tooltip_zapping_player_v1';

export function useZappingTooltip() {
  const { isAuthenticated } = useAuth();
  const [showPlayer, setShowPlayer] = useState(false);

  useEffect(() => {
    const check = async () => {
      const playerSeen = await AsyncStorage.getItem(PLAYER_KEY);
      if (!playerSeen) setShowPlayer(true);
    };
    check();
  }, []);

  const markPlayerSeen = useCallback(async () => {
    setShowPlayer(false);
    await AsyncStorage.setItem(PLAYER_KEY, 'true');
    if (isAuthenticated) {
      api.post('/users/me/seen-features', { feature: PLAYER_KEY }).catch(() => {});
    }
  }, [isAuthenticated]);

  return { showPlayer, markPlayerSeen };
}
