import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ChannelWithSchedules } from '../../types/channel';
import { Schedule } from '../../types/schedule';
import { ZapItem } from '../../types/zap';
import { ProgramBlock } from './ProgramBlock';
import { getColorForChannel } from '../../utils/colors';
import { layout } from '../../theme/tokens';

const TOTAL_WIDTH_WITH_OVERFLOW = 3360; // 28 * 60 * 2px

interface Props {
    channel: ChannelWithSchedules;
    index: number;
    pixelsPerMinute: number;
    nowOffset: number;
    totalWidth: number;
    isViewingToday?: boolean;
    isPastDay?: boolean;
    zapList?: ZapItem[];
    zapIndex?: number;
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

// Greedy interval graph coloring (matching streaming-guide-frontend/ScheduleRow.tsx).
// Assigns each schedule to the lowest available lane so that no two overlapping
// schedules share a lane. The total lanes equals the true maximum concurrency,
// avoiding the over-count bug of the naïve approach (where A overlaps B and A
// overlaps C but B and C don't overlap → old code said totalStreams=3, correct=2).
const getKey = (s: Schedule) => `${s.id}_${s.positionOffset ?? 0}`;

const computeLaneAssignments = (
    schedules: Schedule[],
): Map<string, { laneIndex: number; totalLanes: number }> => {
    // Effective start/end accounting for positionOffset (overflow zone schedules are shifted by 24*60)
    const getStart = (s: Schedule) => parseTimeToMinutes(s.start_time) + (s.positionOffset ?? 0);
    const getEnd = (s: Schedule) => {
        const start = parseTimeToMinutes(s.start_time);
        let end = parseTimeToMinutes(s.end_time);
        if (end <= start) end += 24 * 60;
        return end + (s.positionOffset ?? 0);
    };
    const overlaps = (a: Schedule, b: Schedule) => {
        const aStart = getStart(a), aEnd = getEnd(a);
        const bStart = getStart(b), bEnd = getEnd(b);
        return aStart < bEnd && bStart < aEnd;
    };

    // Sort by start time so the greedy scan is monotone
    const sorted = [...schedules].sort((a, b) => {
        const diff = getStart(a) - getStart(b);
        return diff !== 0 ? diff : getKey(a).localeCompare(getKey(b));
    });

    const laneEndTimes: number[] = []; // when each lane next becomes free
    const laneMap = new Map<string, number>(); // composite key → assigned lane index

    for (const s of sorted) {
        // Solo schedules (no overlap with anything) don't need lane assignment
        const hasAnyOverlap = schedules.some(other => getKey(other) !== getKey(s) && overlaps(s, other));
        if (!hasAnyOverlap) continue;

        const start = getStart(s);
        let lane = laneEndTimes.findIndex(t => t <= start);
        if (lane === -1) {
            lane = laneEndTimes.length; // open a new lane
            laneEndTimes.push(getEnd(s));
        } else {
            laneEndTimes[lane] = getEnd(s);
        }
        laneMap.set(getKey(s), lane);
    }

    const totalLanes = laneEndTimes.length;
    const result = new Map<string, { laneIndex: number; totalLanes: number }>();
    for (const s of schedules) {
        const lane = laneMap.get(getKey(s));
        result.set(getKey(s), lane === undefined
            ? { laneIndex: 0, totalLanes: 1 }       // solo: full row
            : { laneIndex: lane, totalLanes },        // overlapping: share row
        );
    }
    return result;
};

export const ProgramRow = ({ channel, index, pixelsPerMinute, nowOffset, totalWidth, isViewingToday, isPastDay, zapList, zapIndex }: Props) => {
    const channelColor = getColorForChannel(index, 'dark');
    // Split long programs into segments before overlap detection so each segment
    // is narrow enough to show its title within the visible viewport.
    const schedules = channel.schedules.flatMap(splitLongSchedule);
    const laneAssignments = computeLaneAssignments(schedules);

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
                {/* Overflow zone background (00:00–03:59 of next day) */}
                <View
                    pointerEvents="none"
                    style={{
                        position: 'absolute',
                        left: 24 * 60 * pixelsPerMinute,
                        top: 0,
                        bottom: 0,
                        width: 4 * 60 * pixelsPerMinute,
                        backgroundColor: 'rgba(255,255,255,0.02)',
                    }}
                />
                {schedules.map((schedule) => {
                    const { laneIndex, totalLanes } = laneAssignments.get(getKey(schedule)) ?? { laneIndex: 0, totalLanes: 1 };
                    return (
                        <ProgramBlock
                            key={getKey(schedule)}
                            schedule={schedule}
                            pixelsPerMinute={pixelsPerMinute}
                            channelName={channel.channel.name}
                            channelColor={channelColor}
                            multipleStreamsIndex={laneIndex}
                            totalMultipleStreams={totalLanes}
                            isViewingToday={isViewingToday}
                            isPastDay={isPastDay}
                            zapList={zapList}
                            zapIndex={zapIndex}
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
