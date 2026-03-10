import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const PLAYER_COLORS = ['#FF4D6D', '#4CC9F0', '#FFBE0B', '#06D6A0', '#A855F7'];

export default function GameSetupScreen() {
  const router = useRouter();

  const [players, setPlayers]         = useState<string[]>(['Player 1']);
  const [gameMode, setGameMode]       = useState<'Random' | 'Taskmaster'>('Random');
  const [m5Name, setM5Name]           = useState('M5Core2');
  const [serviceUuid, setServiceUuid] = useState('180D');
  const [timeLimit, setTimeLimit]     = useState(3);

  const fadeIn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, []);

  const addPlayer = () => {
    if (players.length < 5) {
      setPlayers([...players, `Player ${players.length + 1}`]);
    } else {
      Alert.alert('Limit Reached', 'Maximum 5 players allowed.');
    }
  };

  const removePlayer = (index: number) => {
    if (players.length > 1) {
      setPlayers(players.filter((_, i) => i !== index));
    }
  };

  const updatePlayerName = (name: string, index: number) => {
    const updated = [...players];
    updated[index] = name;
    setPlayers(updated);
  };

  const handleStartGame = () => {
    const trimmed = players.map(p => p.trim()).filter(Boolean);
    if (trimmed.length < 2) {
      Alert.alert('Not enough players', 'Add at least 2 players to start.');
      return;
    }

    const gameState = {
      players: trimmed.map((name, i) => ({
        name,
        color: PLAYER_COLORS[i],
        isOut: false,
      })),
      gameMode,
      currentPlayerIndex: 0,
      currentCommand: null,
      roundTimeLimit: timeLimit,
    };

    router.push({
      pathname: '/game',
      params: { state: JSON.stringify(gameState) },
    });
  };

  return (
    <Animated.View style={[styles.root, { opacity: fadeIn }]}>
      <LinearGradient colors={['#06060F', '#0C0C1E', '#06060F']} style={StyleSheet.absoluteFill} />
      <View style={styles.ambientGlow} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* ── Header ── */}
          <View style={styles.header}>
            <Text style={styles.appTitle}>BOP-IT</Text>
            <Text style={styles.appSubtitle}>GAME SETUP</Text>
          </View>

          {/* ── Players ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.sectionLabel}>👥 PLAYERS</Text>
              <TouchableOpacity onPress={addPlayer} style={styles.addBtn} activeOpacity={0.75}>
                <MaterialIcons name="person-add" size={16} color="#fff" />
                <Text style={styles.addBtnText}>{players.length}/5</Text>
              </TouchableOpacity>
            </View>

            {players.map((player, index) => (
              <View key={index} style={[styles.playerRow, { borderLeftColor: PLAYER_COLORS[index] }]}>
                <View style={[styles.playerDot, { backgroundColor: PLAYER_COLORS[index] }]} />
                <TextInput
                  style={styles.playerInput}
                  value={player}
                  onChangeText={text => updatePlayerName(text, index)}
                  placeholder={`Player ${index + 1}`}
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  selectionColor={PLAYER_COLORS[index]}
                />
                {players.length > 1 && (
                  <TouchableOpacity onPress={() => removePlayer(index)} activeOpacity={0.7}>
                    <MaterialIcons name="remove-circle-outline" size={22} color="rgba(255,77,109,0.7)" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>

          {/* ── Game Mode ── */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>⚡ GAME MODE</Text>
            <View style={styles.modeRow}>
              {(['Random', 'Taskmaster'] as const).map(mode => {
                const active = gameMode === mode;
                return (
                  <TouchableOpacity
                    key={mode}
                    onPress={() => setGameMode(mode)}
                    activeOpacity={0.75}
                    style={[styles.modeBtn, active && styles.modeBtnActive]}
                  >
                    {active && (
                      <LinearGradient
                        colors={['#FF4D6D', '#7B2FBE']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                    )}
                    <MaterialIcons
                      name={mode === 'Random' ? 'casino' : 'assignment'}
                      size={22}
                      color={active ? '#fff' : 'rgba(255,255,255,0.35)'}
                    />
                    <Text style={[styles.modeBtnText, active && styles.modeBtnTextActive]}>
                      {mode.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Reaction Time ── */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>⏱ REACTION TIME</Text>
            <View style={styles.timerRow}>
              {[2, 3, 4, 5].map(t => {
                const active = timeLimit === t;
                return (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setTimeLimit(t)}
                    activeOpacity={0.75}
                    style={[styles.timerChip, active && styles.timerChipActive]}
                  >
                    {active && (
                      <LinearGradient
                        colors={['#06D6A0', '#4CC9F0']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                    )}
                    <Text style={[styles.timerChipText, active && styles.timerChipTextActive]}>
                      {t}s
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── BLE Connection ── */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>📡 M5 CONNECTION</Text>
            <View style={styles.inputRow}>
              <MaterialIcons name="bluetooth" size={18} color="#4CC9F0" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={m5Name}
                onChangeText={setM5Name}
                placeholder="Device name (e.g. M5Core2)"
                placeholderTextColor="rgba(255,255,255,0.2)"
                selectionColor="#4CC9F0"
              />
            </View>
            <View style={styles.inputRow}>
              <MaterialIcons name="settings-input-component" size={18} color="#4CC9F0" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={serviceUuid}
                onChangeText={setServiceUuid}
                placeholder="Service UUID (e.g. 180D)"
                placeholderTextColor="rgba(255,255,255,0.2)"
                selectionColor="#4CC9F0"
              />
            </View>
          </View>

          {/* ── Start Button ── */}
          <TouchableOpacity onPress={handleStartGame} activeOpacity={0.85} style={styles.startWrap}>
            <LinearGradient
              colors={['#FF4D6D', '#C1121F']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.startBtn}
            >
              <Text style={styles.startBtnText}>START GAME</Text>
              <MaterialIcons name="arrow-forward" size={22} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
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
    backgroundColor: 'rgba(6,214,160,0.07)',
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
    textShadowColor: '#FF4D6D88',
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.3)',
    marginBottom: 14,
  },

  // Add player button
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.11)',
    marginBottom: 14,
  },
  addBtnText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },

  // Player rows
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderLeftWidth: 3,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  playerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  playerInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },

  // Mode buttons
  modeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  modeBtnActive: {
    borderColor: 'transparent',
  },
  modeBtnText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.32)',
  },
  modeBtnTextActive: {
    color: '#fff',
  },

  // Timer chips
  timerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  timerChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    overflow: 'hidden',
  },
  timerChipActive: {
    borderColor: 'transparent',
  },
  timerChipText: {
    fontSize: 15,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.32)',
    letterSpacing: 1,
  },
  timerChipTextActive: {
    color: '#fff',
  },

  // BLE inputs
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 14,
    marginBottom: 10,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },

  // Start button
  startWrap: {
    marginTop: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 22,
  },
  startBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 4,
  },
});