import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { ScheduleService } from '../services/schedule.service';

const SSE_URL = 'https://streaming-guide-backend-staging.up.railway.app/youtube/live-events';
const RECONNECT_DELAY = 5000;

type LiveStatusCallback = () => void;

/**
 * SSE listener for live status updates from the backend.
 * When a relevant event is received, triggers onRefresh to reload data.
 *
 * Uses XMLHttpRequest for RN compatibility (no EventSource polyfill needed).
 */
export function useLiveStatus(onRefresh: LiveStatusCallback) {
    const xhrRef = useRef<XMLHttpRequest | null>(null);
    const lastIndexRef = useRef(0);
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const mountedRef = useRef(true);

    const connect = useCallback(() => {
        if (!mountedRef.current) return;

        // Clean up previous connection
        if (xhrRef.current) {
            xhrRef.current.abort();
            xhrRef.current = null;
        }

        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;
        lastIndexRef.current = 0;

        xhr.open('GET', SSE_URL, true);
        xhr.setRequestHeader('Accept', 'text/event-stream');
        xhr.setRequestHeader('Cache-Control', 'no-cache');

        xhr.onreadystatechange = () => {
            if (xhr.readyState >= 3 && xhr.status === 200) {
                // Process new data since last read
                const newData = xhr.responseText.substring(lastIndexRef.current);
                lastIndexRef.current = xhr.responseText.length;

                if (!newData) return;

                // Parse SSE messages
                const lines = newData.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data:')) {
                        try {
                            const jsonStr = line.substring(5).trim();
                            if (!jsonStr) continue;
                            const data = JSON.parse(jsonStr);

                            const refreshEvents = [
                                'live_status_changed',
                                'streamer_went_live',
                                'streamer_went_offline',
                                'live',
                                'schedule_created',
                                'schedule_updated',
                                'schedule_deleted',
                                'channel_updated',
                                'program_updated',
                            ];

                            if (refreshEvents.includes(data.type)) {
                                console.log('[SSE] Refresh event:', data.type);
                                // Invalidate schedule cache so fresh data is fetched
                                ScheduleService.invalidateScheduleCache().then(() => onRefresh());
                            }
                        } catch {
                            // Ignore parse errors for heartbeats etc.
                        }
                    }
                }
            }
        };

        xhr.onerror = () => {
            console.log('[SSE] Connection error, reconnecting...');
            scheduleReconnect();
        };

        xhr.onloadend = () => {
            // Connection closed by server, reconnect
            if (mountedRef.current) {
                console.log('[SSE] Connection ended, reconnecting...');
                scheduleReconnect();
            }
        };

        xhr.send();
        console.log('[SSE] Connected to live events');
    }, [onRefresh]);

    const scheduleReconnect = useCallback(() => {
        if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
        }
        if (mountedRef.current) {
            reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY);
        }
    }, [connect]);

    useEffect(() => {
        mountedRef.current = true;
        connect();

        // Reconnect when app comes to foreground
        const handleAppState = (state: AppStateStatus) => {
            if (state === 'active') {
                connect();
            } else if (state === 'background') {
                xhrRef.current?.abort();
                if (reconnectTimerRef.current) {
                    clearTimeout(reconnectTimerRef.current);
                }
            }
        };

        const subscription = AppState.addEventListener('change', handleAppState);

        return () => {
            mountedRef.current = false;
            xhrRef.current?.abort();
            if (reconnectTimerRef.current) {
                clearTimeout(reconnectTimerRef.current);
            }
            subscription.remove();
        };
    }, [connect]);
}
