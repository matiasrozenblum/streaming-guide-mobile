import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ChannelWithSchedules } from '../../types/channel';
import { Schedule } from '../../types/schedule';
import { ProgramBlock } from './ProgramBlock';
import { getColorForChannel } from '../../utils/colors';
import { layout } from '../../theme/tokens';

interface Props {
    channel: ChannelWithSchedules;
    index: number;
    pixelsPerMinute: number;
    nowOffset: number;
    totalWidth: number;
    isViewingToday?: boolean;
    isPastDay?: boolean;
}

const parseTimeToMinutes = (timeStr: string): number => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
};

const formatMinutes = (totalMinutes: number): string => {
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

// Matches web mobile threshold: split programs longer than 6 hours into equal segments
// so the title is always visible within each segment. See streaming-guide-frontend/ScheduleRow.tsx.
const SPLIT_THRESHOLD_MINUTES = 360;

const splitLongSchedule = (schedule: Schedule): Schedule[] => {
    const start = parseTimeToMinutes(schedule.start_time);
    let end = parseTimeToMinutes(schedule.end_time);
    if (end <= start) end += 24 * 60;
    const duration = end - start;

    if (duration <= SPLIT_THRESHOLD_MINUTES) return [schedule];

    const numBlocks = Math.ceil(duration / SPLIT_THRESHOLD_MINUTES);
    const blockDuration = Math.ceil(duration / numBlocks);

    return Array.from({ length: numBlocks }, (_, i) => {
        const blockStart = start + i * blockDuration;
        const blockEnd = Math.min(blockStart + blockDuration, end);
        return {
            ...schedule,
            id: (schedule.id as number) * 1000 + i,
            start_time: formatMinutes(blockStart % (24 * 60)),
            end_time: formatMinutes(blockEnd % (24 * 60)),
        };
    });
};

const getOverlapInfo = (schedule: Schedule, schedules: Schedule[]) => {
    const start = parseTimeToMinutes(schedule.start_time);
    let end = parseTimeToMinutes(schedule.end_time);
    if (end < start) end += 24 * 60;

    const overlapping = schedules.filter(other => {
        const otherStart = parseTimeToMinutes(other.start_time);
        let otherEnd = parseTimeToMinutes(other.end_time);
        if (otherEnd < otherStart) otherEnd += 24 * 60;
        return start < otherEnd && otherStart < end;
    });

    overlapping.sort((a, b) => {
        const diff = parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time);
        return diff !== 0 ? diff : a.id - b.id;
    });

    return {
        multipleStreamsIndex: overlapping.findIndex(s => s.id === schedule.id),
        totalMultipleStreams: overlapping.length,
    };
};

export const ProgramRow = ({ channel, index, pixelsPerMinute, nowOffset, totalWidth, isViewingToday, isPastDay }: Props) => {
    const channelColor = getColorForChannel(index, 'dark');
    // Split long programs into segments before overlap detection so each segment
    // is narrow enough to show its title within the visible viewport.
    const schedules = channel.schedules.flatMap(splitLongSchedule);

    return (
        <View style={[styles.row, { width: totalWidth }]}>
            {/* Now Indicator Line — only shown when viewing today */}
            {isViewingToday && (
                <View
                    style={[styles.nowLine, { left: nowOffset }]}
                    pointerEvents="none"
                />
            )}

            {/* Programs Track */}
            <View style={[styles.programsTrack, { width: totalWidth }]}>
                {schedules.map((schedule) => {
                    const { multipleStreamsIndex, totalMultipleStreams } = getOverlapInfo(schedule, schedules);
                    return (
                        <ProgramBlock
                            key={schedule.id}
                            schedule={schedule}
                            pixelsPerMinute={pixelsPerMinute}
                            channelColor={channelColor}
                            multipleStreamsIndex={multipleStreamsIndex}
                            totalMultipleStreams={totalMultipleStreams}
                            isViewingToday={isViewingToday}
                            isPastDay={isPastDay}
                        />
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        height: layout.ROW_HEIGHT_MOBILE,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.12)',
        alignItems: 'center',
    },
    programsTrack: {
        flexDirection: 'row',
        position: 'relative',
        height: '100%',
    },
    nowLine: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 2,
        backgroundColor: '#F44336',
        zIndex: 5,
    },
});
