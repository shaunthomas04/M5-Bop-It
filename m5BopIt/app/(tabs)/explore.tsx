import React from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function ExploreScreen() {
  return (
    <LinearGradient colors={['#FF9F1C', '#FF6B6B']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>How to Play</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Getting Started</Text>
          <Text style={styles.cardText}>
            1. Power on your M5 Stack Core 2 device.
          </Text>
          <Text style={styles.cardText}>
            2. In the 'Setup' tab, add players and choose a game mode.
          </Text>
          <Text style={styles.cardText}>
            3. Enter the device name and service UUID to connect via Bluetooth.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Game Modes</Text>
          <View style={styles.modeRow}>
            <MaterialIcons name="casino" size={24} color="#6A11CB" />
            <View style={styles.modeInfo}>
              <Text style={styles.modeTitle}>Random Mode</Text>
              <Text style={styles.modeDescription}>
                The M5 Core 2 will shout random commands that players must perform quickly!
              </Text>
            </View>
          </View>
          <View style={styles.modeRow}>
            <MaterialIcons name="assignment" size={24} color="#6A11CB" />
            <View style={styles.modeInfo}>
              <Text style={styles.modeTitle}>Taskmaster Mode</Text>
              <Text style={styles.modeDescription}>
                The host (this app) assigns tasks to specific players. Perform your task to score points!
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Supported Commands</Text>
          <View style={styles.commandGrid}>
            <View style={styles.commandItem}>
              <MaterialIcons name="touch-app" size={32} color="#FF6B6B" />
              <Text style={styles.commandLabel}>Bop It!</Text>
            </View>
            <View style={styles.commandItem}>
              <MaterialIcons name="screen-rotation" size={32} color="#4ECDC4" />
              <Text style={styles.commandLabel}>Twist It!</Text>
            </View>
            <View style={styles.commandItem}>
              <MaterialIcons name="swipe" size={32} color="#FFE66D" />
              <Text style={styles.commandLabel}>Pull It!</Text>
            </View>
            <View style={styles.commandItem}>
              <MaterialIcons name="shake" size={32} color="#1A535C" />
              <Text style={styles.commandLabel}>Shake It!</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 30,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  cardText: {
    fontSize: 16,
    color: '#555',
    lineHeight: 24,
    marginBottom: 10,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 15,
  },
  modeInfo: {
    flex: 1,
  },
  modeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6A11CB',
    marginBottom: 4,
  },
  modeDescription: {
    fontSize: 14,
    color: '#666',
  },
  commandGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 15,
  },
  commandItem: {
    width: '45%',
    backgroundColor: '#F8F9FA',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
  },
  commandLabel: {
    marginTop: 8,
    fontWeight: 'bold',
    color: '#333',
  },
});
