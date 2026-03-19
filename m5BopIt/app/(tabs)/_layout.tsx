import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FF4D6D',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.28)',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: '#0C0C1E',
          borderTopColor: 'rgba(255,255,255,0.07)',
          borderTopWidth: 1,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Setup',
          tabBarActiveTintColor: '#FF4D6D',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="gamecontroller.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'How to Play',
          tabBarActiveTintColor: '#4CC9F0',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="list.bullet" color={color} />,
        }}
      />
    </Tabs>
  );
}