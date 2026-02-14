import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ChannelWithSchedules } from '../../types/channel';

interface ScheduleState {
    channels: ChannelWithSchedules[];
    loading: boolean;
    error: string | null;
    selectedDate: string; // YYYY-MM-DD
}

const initialState: ScheduleState = {
    channels: [],
    loading: false,
    error: null,
    selectedDate: new Date().toISOString().split('T')[0],
};

const scheduleSlice = createSlice({
    name: 'schedule',
    initialState,
    reducers: {
        setChannels(state, action: PayloadAction<ChannelWithSchedules[]>) {
            state.channels = action.payload;
            state.loading = false;
            state.error = null;
        },
        setLoading(state, action: PayloadAction<boolean>) {
            state.loading = action.payload;
        },
        setError(state, action: PayloadAction<string>) {
            state.loading = false;
            state.error = action.payload;
        },
        setSelectedDate(state, action: PayloadAction<string>) {
            state.selectedDate = action.payload;
        },
    },
});

export const { setChannels, setLoading, setError, setSelectedDate } = scheduleSlice.actions;
export default scheduleSlice.reducer;
