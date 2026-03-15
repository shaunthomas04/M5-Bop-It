import BLEManager from '@/ble/BLEManager';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Device } from 'react-native-ble-plx';

const PLAYER_COLORS = ['#FF4D6D', '#4CC9F0', '#FFBE0B', '#06D6A0', '#A855F7'];

type BleStatus = 'idle' | 'scanning' | 'connecting' | 'connected' | 'error';

export default function GameSetupScreen() {
  const router = useRouter();

  const [players, setPlayers]     = useState<string[]>(['Player 1']);
  const [gameMode, setGameMode]   = useState<'Random' | 'Taskmaster'>('Random');
  const [timeLimit, setTimeLimit] = useState(3);

  // BLE
  const [m5Name, setM5Name]                   = useState('Grissoms M5Core2024');
  const [bleStatus, setBleStatus]             = useState<BleStatus>('idle');
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null);

  // Player name editing modal
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName]   = useState('');

  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    BLEManager.requestPermissions();
    return () => { BLEManager.disconnect(); };
  }, []);

  ///////////////////////////////////////////////////////////////
  // Player name editing
  ///////////////////////////////////////////////////////////////
  const openEditModal = (index: number) => {
    setEditingIndex(index);
    setEditingName(players[index]);
  };

  const confirmEditName = () => {
    if (editingIndex === null) return;
    const trimmed = editingName.trim();
    if (trimmed.length === 0) {
      Alert.alert('Invalid Name', 'Player name cannot be empty.');
      return;
    }
    const updated = [...players];
    updated[editingIndex] = trimmed;
    setPlayers(updated);
    setEditingIndex(null);
    setEditingName('');
  };

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

  ///////////////////////////////////////////////////////////////
  // BLE scan → connect
  ///////////////////////////////////////////////////////////////
  const handleScanAndConnect = async () => {
    if (bleStatus === 'connected') {
      await BLEManager.disconnect();
      setConnectedDevice(null);
      setBleStatus('idle');
      return;
    }

    const name = m5Name.trim();
    if (!name) {
      Alert.alert('Missing Device Name', 'Enter your M5 device name before scanning.');
      return;
    }

    setBleStatus('scanning');

    BLEManager.scanForDevice(name, async (device) => {
      setBleStatus('connecting');
      try {
        const connected = await BLEManager.connect(device);
        setConnectedDevice(connected);
        setBleStatus('connected');
      } catch (e) {
        console.log('Connect error:', e);
        setBleStatus('error');
        Alert.alert('Connection Failed', 'Could not connect to M5 device.');
      }
    });

    // Timeout after 10s
    setTimeout(() => {
      setBleStatus(prev => {
        if (prev === 'scanning') {
          BLEManager.stopScan();
          Alert.alert('Not Found', `Could not find "${name}". Make sure it is powered on.`);
          return 'error';
        }
        return prev;
      });
    }, 10000);
  };

  ///////////////////////////////////////////////////////////////
  // Start game
  ///////////////////////////////////////////////////////////////
  const handleStartGame = () => {
    const trimmed = players.map(p => p.trim()).filter(Boolean);
    if (trimmed.length < 2) {
      Alert.alert('Not Enough Players', 'Add at least 2 players to start.');
      return;
    }
    if (bleStatus !== 'connected') {
      Alert.alert('M5 Not Connected', 'Connect to your M5 device before starting.');
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

    router.push({ pathname: '/game', params: { state: JSON.stringify(gameState) } });
  };

  ///////////////////////////////////////////////////////////////
  // BLE helpers
  ///////////////////////////////////////////////////////////////
  const bleButtonLabel = () => {
    switch (bleStatus) {
      case 'idle':       return 'SCAN FOR M5';
      case 'scanning':   return 'SCANNING...';
      case 'connecting': return 'CONNECTING...';
      case 'connected':  return 'CONNECTED  ✓';
      case 'error':      return 'RETRY SCAN';
    }
  };

  const bleGradient = (): [string, string] => {
    switch (bleStatus) {
      case 'connected': return ['#06D6A0', '#4CC9F0'];
      case 'error':     return ['#FF4D6D', '#C1121F'];
      default:          return ['#4CC9F0', '#7B2FBE'];
    }
  };

  ///////////////////////////////////////////////////////////////
  // Render
  ///////////////////////////////////////////////////////////////
  return (
    <Animated.View style={[styles.root, { opacity: fadeIn }]}>
      <LinearGradient colors={['#06060F', '#0C0C1E', '#06060F']} style={StyleSheet.absoluteFill} />
      <View style={styles.ambientGlow} />

      {/* ── Player Name Edit Modal ── */}
      <Modal
        visible={editingIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingIndex(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>EDIT PLAYER NAME</Text>
            {editingIndex !== null && (
              <View style={[styles.modalInputRow, { borderColor: PLAYER_COLORS[editingIndex] }]}>
                <View style={[styles.playerDot, { backgroundColor: PLAYER_COLORS[editingIndex] }]} />
                <TextInput
                  style={styles.modalInput}
                  value={editingName}
                  onChangeText={setEditingName}
                  autoFocus
                  maxLength={16}
                  placeholder="Enter name..."
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  selectionColor={PLAYER_COLORS[editingIndex]}
                  onSubmitEditing={confirmEditName}
                  returnKeyType="done"
                />
              </View>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setEditingIndex(null)}
                style={[styles.modalBtn, styles.modalBtnCancel]}
                activeOpacity={0.75}
              >
                <Text style={styles.modalBtnText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmEditName}
                style={[styles.modalBtn, styles.modalBtnConfirm]}
                activeOpacity={0.75}
              >
                <LinearGradient
                  colors={['#FF4D6D', '#7B2FBE']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>SAVE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
              <TouchableOpacity
                key={index}
                onPress={() => openEditModal(index)}
                activeOpacity={0.75}
                style={[styles.playerRow, { borderLeftColor: PLAYER_COLORS[index] }]}
              >
                <View style={[styles.playerDot, { backgroundColor: PLAYER_COLORS[index] }]} />
                <Text style={styles.playerNameText}>{player}</Text>
                <MaterialIcons name="edit" size={16} color="rgba(255,255,255,0.25)" />
                {players.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removePlayer(index)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialIcons name="remove-circle-outline" size={22} color="rgba(255,77,109,0.7)" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
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

            {/* Device name input */}
            <View style={styles.inputRow}>
              <MaterialIcons name="bluetooth" size={18} color="#4CC9F0" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={m5Name}
                onChangeText={setM5Name}
                placeholder="Device name (e.g. Grissoms M5Core2024)"
                placeholderTextColor="rgba(255,255,255,0.2)"
                selectionColor="#4CC9F0"
                editable={bleStatus !== 'connected'}
              />
            </View>

            {/* Status */}
            <View style={styles.bleStatusRow}>
              <MaterialIcons
                name="bluetooth"
                size={16}
                color={
                  bleStatus === 'connected' ? '#06D6A0' :
                  bleStatus === 'error'     ? '#FF4D6D' :
                  'rgba(255,255,255,0.25)'
                }
              />
              <Text style={[
                styles.bleStatusText,
                bleStatus === 'connected' && { color: '#06D6A0' },
                bleStatus === 'error'     && { color: '#FF4D6D' },
              ]}>
                {bleStatus === 'connected'  ? `Connected to ${m5Name}`  :
                 bleStatus === 'scanning'   ? 'Searching...'            :
                 bleStatus === 'connecting' ? 'Connecting...'           :
                 bleStatus === 'error'      ? 'Device not found'        :
                                             'No device connected'}
              </Text>
            </View>

            {/* Scan button */}
            <TouchableOpacity
              onPress={handleScanAndConnect}
              activeOpacity={0.85}
              style={styles.bleButtonWrap}
              disabled={bleStatus === 'scanning' || bleStatus === 'connecting'}
            >
              <LinearGradient
                colors={bleGradient()}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.bleButton}
              >
                <MaterialIcons
                  name={bleStatus === 'connected' ? 'bluetooth-connected' : 'bluetooth-searching'}
                  size={18}
                  color="#fff"
                />
                <Text style={styles.bleButtonText}>{bleButtonLabel()}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* ── Start Button ── */}
          <TouchableOpacity onPress={handleStartGame} activeOpacity={0.85} style={styles.startWrap}>
            <LinearGradient
              colors={bleStatus === 'connected' ? ['#FF4D6D', '#C1121F'] : ['#333', '#222']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.startBtn}
            >
              <Text style={styles.startBtnText}>START GAME</Text>
              <MaterialIcons name="arrow-forward" size={22} color={bleStatus === 'connected' ? '#fff' : 'rgba(255,255,255,0.3)'} />
            </LinearGradient>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#06060F' },
  ambientGlow: {
    position: 'absolute', top: -60, alignSelf: 'center',
    width: 340, height: 340, borderRadius: 170,
    backgroundColor: 'rgba(6,214,160,0.07)',
  },
  scroll: { padding: 20, paddingTop: 64, paddingBottom: 50 },

  header:     { alignItems: 'center', marginBottom: 32 },
  appTitle:   {
    fontSize: 42, fontWeight: '900', color: '#fff', letterSpacing: 10,
    textShadowColor: '#FF4D6D88', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 16,
  },
  appSubtitle: { marginTop: 6, fontSize: 11, fontWeight: '800', letterSpacing: 5, color: 'rgba(255,255,255,0.28)' },

  card: {
    backgroundColor: 'rgba(255,255,255,0.025)', borderRadius: 22,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', padding: 20, marginBottom: 16,
  },
  cardHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 3, color: 'rgba(255,255,255,0.3)', marginBottom: 14 },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.11)', marginBottom: 14,
  },
  addBtnText: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: '800', letterSpacing: 1 },

  playerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14,
    borderLeftWidth: 3, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10,
  },
  playerDot:      { width: 10, height: 10, borderRadius: 5 },
  playerNameText: { flex: 1, fontSize: 16, fontWeight: '700', color: '#fff' },

  modeRow: { flexDirection: 'row', gap: 12 },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
    overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.03)',
  },
  modeBtnActive:     { borderColor: 'transparent' },
  modeBtnText:       { fontSize: 12, fontWeight: '800', letterSpacing: 1.5, color: 'rgba(255,255,255,0.32)' },
  modeBtnTextActive: { color: '#fff' },

  timerRow:  { flexDirection: 'row', gap: 10 },
  timerChip: {
    flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(255,255,255,0.03)', overflow: 'hidden',
  },
  timerChipActive:     { borderColor: 'transparent' },
  timerChipText:       { fontSize: 15, fontWeight: '800', color: 'rgba(255,255,255,0.32)', letterSpacing: 1 },
  timerChipTextActive: { color: '#fff' },

  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 14, marginBottom: 10, height: 50,
  },
  inputIcon: { marginRight: 10 },
  textInput: { flex: 1, fontSize: 15, color: '#fff', fontWeight: '600' },

  bleStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  bleStatusText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.3)' },

  bleButtonWrap: { borderRadius: 14, overflow: 'hidden' },
  bleButton:     {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14,
  },
  bleButtonText: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 2 },

  startWrap: { marginTop: 8, borderRadius: 20, overflow: 'hidden' },
  startBtn:  {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 22,
  },
  startBtnText: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 4 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  modalCard: {
    width: '100%', backgroundColor: '#0F0F1E',
    borderRadius: 24, padding: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  modalTitle: {
    fontSize: 11, fontWeight: '800', letterSpacing: 3,
    color: 'rgba(255,255,255,0.3)', marginBottom: 20, textAlign: 'center',
  },
  modalInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14,
    borderLeftWidth: 3, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 24,
  },
  modalInput: { flex: 1, fontSize: 18, fontWeight: '700', color: '#fff' },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 14, overflow: 'hidden',
  },
  modalBtnCancel:  { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalBtnConfirm: { backgroundColor: 'transparent' },
  modalBtnText:    { fontSize: 13, fontWeight: '800', letterSpacing: 2, color: 'rgba(255,255,255,0.5)' },
});