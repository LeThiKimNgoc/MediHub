import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../app/_layout';

export default function ModuleCard({ title, description, mainColor, iconMain, route }: any) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onPress={() => router.push(route)}
    >
      <View style={[styles.iconBox, { backgroundColor: mainColor + '15' }]}>
        <MaterialCommunityIcons name={iconMain} size={24} color={mainColor} />
      </View>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.desc, { color: theme.muted }]}>{description}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { padding: 20, borderRadius: 16, borderWidth: 1, flex: 1, minWidth: 200 },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  desc: { fontSize: 12, lineHeight: 18 }
});