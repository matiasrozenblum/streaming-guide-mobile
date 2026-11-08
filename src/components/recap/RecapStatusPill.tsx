import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { recapStatus, type RecapRange } from '../../utils/recapSchedule';

/**
 * One line above the carousel saying which instalment is on screen and what
 * happens next.
 *
 * The recap is published in instalments and, from Monday to Thursday, the one
 * you are reading is last week's — a date range alone does not say that, and
 * people read a stale recap as a broken one. The phrase is derived from the
 * range the API returns rather than from the device's clock, so a phone in
 * another timezone cannot name the wrong day.
 */
export const RecapStatusPill = ({ range }: { range: RecapRange }) => {
    const { lead, rest } = recapStatus(range);

    return (
        <View style={styles.root}>
            <View style={styles.box}>
                <View style={styles.dot} />
                {/* One line, as drawn: the rest is what gives way on a narrow
                    screen, not the lead that says what you are looking at. */}
                <Text style={styles.text} numberOfLines={1}>
                    <Text style={styles.lead}>{lead}</Text>
                    {' · '}
                    {rest}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    root: {
        paddingTop: 12,
        paddingHorizontal: 20,
        paddingBottom: 0,
    },
    box: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#3B82F61F',
        borderWidth: 1,
        borderColor: '#3B82F659',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 9,
    },
    dot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: '#60A5FA',
        flexShrink: 0,
    },
    text: {
        flex: 1,
        fontFamily: 'Inter_400Regular',
        fontSize: 12,
        color: '#CBD5E1',
    },
    lead: {
        fontFamily: 'Inter_700Bold',
        color: '#F1F5F9',
    },
});
