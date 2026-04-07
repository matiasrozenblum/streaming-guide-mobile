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
}

const parseTimeToMinutes = (timeStr: string): number => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
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

export const ProgramRow = ({ channel, index, pixelsPerMinute, nowOffset, totalWidth }: Props) => {
    const channelColor = getColorForChannel(index, 'dark');
    const schedules = channel.schedules;

    return (
        <View style={[styles.row, { width: totalWidth }]}>
            {/* Now Indicator Line Segment */}
            <View
                style={[styles.nowLine, { left: nowOffset }]}
                pointerEvents="none"
            />

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
