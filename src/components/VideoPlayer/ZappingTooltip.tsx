import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ZappingTooltipProps {
  text: string;
  onDismiss: () => void;
  style?: object;
}

export const ZappingTooltip: React.FC<ZappingTooltipProps> = ({ text, onDismiss, style }) => (
  <View style={[styles.container, style]} pointerEvents="box-none">
    <View style={styles.content} pointerEvents="auto">
      <Text style={styles.text}>{text}</Text>
      <TouchableOpacity
        onPress={onDismiss}
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        activeOpacity={0.6}
      >
        <Text style={styles.dismiss}>✕</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(15,23,42,0.97)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.5)',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    gap: 8,
  },
  text: {
    color: '#e2e8f0',
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  dismiss: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    paddingTop: 1,
  },
});
