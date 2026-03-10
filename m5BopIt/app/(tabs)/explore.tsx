import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';

const COMMANDS = [
  { icon: 'touch-app',       label: 'Bop It!',   color: '#FF4D6D' },
  { icon: 'screen-rotation', label: 'Twist It!', color: '#4CC9F0' },
  { icon: 'open-with',       label: 'Pull It!',  color: '#FFBE0B' },
  { icon: 'vibration',       label: 'Shake It!', color: '#06D6A0' },
];

export default function ExploreScreen() {
  const fadeIn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={[styles.root, { opacity: fadeIn }]}>
      <LinearGradient colors={['#06060F', '#0C0C1E', '#06060F']} style={StyleSheet.absoluteFill} />
      {/* Dark yellow ambient glow */}
      <View style={styles.ambientGlow} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.appTitle}>BOP-IT</Text>
          <Text style={styles.appSubtitle}>HOW TO PLAY</Text>
        </View>

        {/* ── Getting Started ── */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>🚀 GETTING STARTED</Text>
          {[
            'Power on your M5 Stack Core 2 device.',
            "In the 'Setup' tab, add players and choose a game mode.",
            'Enter the device name and service UUID to connect via Bluetooth.',
          ].map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        {/* ── Game Modes ── */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>⚡ GAME MODES</Text>

          <View style={[styles.modeBlock, { borderLeftColor: '#FF4D6D' }]}>
            <View style={styles.modeHeader}>
              <MaterialIcons name="casino" size={20} color="#FF4D6D" />
              <Text style={[styles.modeTitle, { color: '#FF4D6D' }]}>Random Mode</Text>
            </View>
            <Text style={styles.modeDesc}>
              Commands fire automatically one after another. Every player must react fast — no one controls the pace.
            </Text>
          </View>

          <View style={[styles.modeBlock, { borderLeftColor: '#4CC9F0', marginBottom: 0 }]}>
            <View style={styles.modeHeader}>
              <MaterialIcons name="assignment" size={20} color="#4CC9F0" />
              <Text style={[styles.modeTitle, { color: '#4CC9F0' }]}>Taskmaster Mode</Text>
            </View>
            <Text style={styles.modeDesc}>
              One person controls the phone and manually picks which player gets which command — and when.
            </Text>
          </View>
        </View>

        {/* ── Commands ── */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>🎮 COMMANDS</Text>
          <View style={styles.cmdGrid}>
            {COMMANDS.map(cmd => (
              <View key={cmd.label} style={[styles.cmdCard, { borderColor: cmd.color + '55' }]}>
                <LinearGradient
                  colors={[cmd.color + '20', cmd.color + '06']}
                  style={styles.cmdCardInner}
                >
                  <View style={[styles.cmdIconCircle, { backgroundColor: cmd.color + '20' }]}>
                    <MaterialIcons name={cmd.icon as any} size={28} color={cmd.color} />
                  </View>
                  <Text style={[styles.cmdLabel, { color: cmd.color }]}>{cmd.label}</Text>
                </LinearGradient>
              </View>
            ))}
          </View>
        </View>

        {/* ── How it Works ── */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>📡 HOW IT WORKS</Text>
          {[
            { icon: 'smartphone',   color: '#A855F7', text: 'Phone sends commands to the M5 device over Bluetooth.' },
            { icon: 'vibration',    color: '#FFBE0B', text: 'M5 displays the command — player must perform the action.' },
            { icon: 'timer',        color: '#FF4D6D', text: 'If no response is detected in time, the player is eliminated.' },
            { icon: 'emoji-events', color: '#06D6A0', text: 'Last player standing wins!' },
          ].map((item, i) => (
            <View key={i} style={styles.howRow}>
              <View style={[styles.howIconWrap, { backgroundColor: item.color + '20' }]}>
                <MaterialIcons name={item.icon as any} size={18} color={item.color} />
              </View>
              <Text style={styles.howText}>{item.text}</Text>
            </View>
          ))}
        </View>

      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#06060F',
  },
  ambientGlow: {
    position: 'absolute',
    top: -60,
    alignSelf: 'center',
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(255,190,11,0.07)',
  },
  scroll: {
    padding: 20,
    paddingTop: 64,
    paddingBottom: 50,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  appTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 10,
    textShadowColor: '#FFBE0B66',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  appSubtitle: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 5,
    color: 'rgba(255,255,255,0.28)',
  },

  // Cards
  card: {
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    padding: 20,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.3)',
    marginBottom: 18,
  },

  // Steps
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 14,
  },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,190,11,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,190,11,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    color: '#FFBE0B',
    fontSize: 12,
    fontWeight: '900',
  },
  stepText: {
    flex: 1,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    lineHeight: 22,
    paddingTop: 2,
  },

  // Modes
  modeBlock: {
    borderLeftWidth: 3,
    paddingLeft: 14,
    marginBottom: 18,
  },
  modeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  modeTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  modeDesc: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 13,
    lineHeight: 20,
  },

  // Command grid
  cmdGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cmdCard: {
    width: '47%',
    borderRadius: 18,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  cmdCardInner: {
    paddingVertical: 18,
    alignItems: 'center',
    gap: 10,
  },
  cmdIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cmdLabel: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },

  // How it works
  howRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  howIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  howText: {
    flex: 1,
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    lineHeight: 20,
  },
});