import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ChannelWithSchedules } from '../../types/channel';
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

export const ProgramRow = ({ channel, index, pixelsPerMinute, nowOffset, totalWidth }: Props) => {
    const channelColor = getColorForChannel(index, 'dark');

    return (
        <View style={[styles.row, { width: totalWidth }]}>
            {/* Now Indicator Line Segment */}
            <View
                style={[styles.nowLine, { left: nowOffset }]}
                pointerEvents="none"
            />

            {/* Programs Track */}
            <View style={[styles.programsTrack, { width: totalWidth }]}>
                {channel.schedules.map((schedule) => (
                    <ProgramBlock
                        key={schedule.id}
                        schedule={schedule}
                        pixelsPerMinute={pixelsPerMinute}
                        channelColor={channelColor}
                    />
                ))}
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
