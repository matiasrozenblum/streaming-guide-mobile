import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ZappingTooltipProps {
  text: string;
  onDismiss: () => void;
  /** 'down' renders a downward arrow at the bottom edge; 'none' renders no arrow. */
  arrow?: 'down' | 'none';
  /** Horizontal offset (px) of the down arrow from the tooltip's left edge. */
  arrowLeft?: number;
  style?: object;
}

const BG = '#334155'; // slate-700, matches web tooltip

export const ZappingTooltip: React.FC<ZappingTooltipProps> = ({
  text,
  onDismiss,
  arrow = 'none',
  arrowLeft = 20,
  style,
}) => (
  <View style={[styles.wrapper, style]} pointerEvents="box-none">
    <View style={styles.bubble} pointerEvents="auto">
      <Text style={styles.text}>{text}</Text>
      <TouchableOpacity
        onPress={onDismiss}
        style={styles.closeBtn}
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        activeOpacity={0.7}
      >
        <Text style={styles.closeIcon}>✕</Text>
      </TouchableOpacity>
    </View>
    {arrow === 'down' && <View style={[styles.arrowDown, { left: arrowLeft }]} pointerEvents="none" />}
  </View>
);

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  bubble: {
    backgroundColor: BG,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
  },
  text: {
    color: '#e2e8f0',
    fontSize: 13,
    lineHeight: 20,
    flexShrink: 1,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  closeIcon: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 17,
  },
  arrowDown: {
    position: 'absolute',
    bottom: -10,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 11,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: BG,
  },
});
