import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const KEYS = {
  player: 'tooltip_zapping_player_v1',
  panel: 'tooltip_zapping_panel_v1',
} as const;

export function useZappingTooltip() {
  const { isAuthenticated } = useAuth();
  const [showPlayer, setShowPlayer] = useState(false);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    const check = async () => {
      const [playerSeen, panelSeen] = await Promise.all([
        AsyncStorage.getItem(KEYS.player),
        AsyncStorage.getItem(KEYS.panel),
      ]);
      if (!playerSeen) setShowPlayer(true);
      if (!panelSeen) setShowPanel(true);
    };
    check();
  }, []);

  const markSeen = useCallback(async (key: keyof typeof KEYS) => {
    const storageKey = KEYS[key];
    if (key === 'player') setShowPlayer(false);
    else setShowPanel(false);
    await AsyncStorage.setItem(storageKey, 'true');
    if (isAuthenticated) {
      api.post('/users/me/seen-features', { feature: storageKey }).catch(() => {});
    }
  }, [isAuthenticated]);

  const markPlayerSeen = useCallback(() => markSeen('player'), [markSeen]);
  const markPanelSeen = useCallback(() => markSeen('panel'), [markSeen]);

  return { showPlayer, showPanel, markPlayerSeen, markPanelSeen };
}
