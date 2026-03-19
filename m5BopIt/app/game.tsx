import BLEManager from '@/ble/BLEManager';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Easing,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

type GameMode = 'Random' | 'Taskmaster';

interface Player {
  name: string;
  color: string;
  isOut: boolean;
}

interface GameState {
  players: Player[];
  gameMode: GameMode;
  currentPlayerIndex: number;
  roundTimeLimit: number;
}

interface BopCommand {
  key: 'BOP' | 'TWIST' | 'SLIDE' | 'SHAKE';
  label: string;
  icon: string;
  color: string;
}

// ─── Commands ─────────────────────────────────────────────────────────────────

const BOP_COMMANDS: BopCommand[] = [
  { key: 'BOP',   label: 'Bop It!',   icon: 'touch-app',       color: '#FF4D6D' },
  { key: 'TWIST', label: 'Twist It!', icon: 'screen-rotation', color: '#4CC9F0' },
  { key: 'SLIDE', label: 'Slide It!', icon: 'swap-horiz',      color: '#FFBE0B' },
  { key: 'SHAKE', label: 'Shake It!', icon: 'vibration',       color: '#06D6A0' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const findNextActive = (players: Player[], from: number): number => {
  let i = (from + 1) % players.length;
  while (players[i].isOut) i = (i + 1) % players.length;
  return i;
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function GameScreen() {
  const router = useRouter();
  const { state } = useLocalSearchParams<{ state: string }>();

  const parsed: GameState = state
    ? JSON.parse(state)
    : {
        players: [
          { name: 'Alex',   color: '#FF4D6D', isOut: false },
          { name: 'Jordan', color: '#4CC9F0', isOut: false },
        ],
        gameMode: 'Random',
        currentPlayerIndex: 0,
        roundTimeLimit: 3,
      };

  const [players, setPlayers]       = useState<Player[]>(parsed.players);
  const [currentIdx, setCurrentIdx] = useState(parsed.currentPlayerIndex);
  const [gameMode]                  = useState<GameMode>(parsed.gameMode);
  const [roundTime]                 = useState(parsed.roundTimeLimit);

  const [phase, setPhase]                 = useState<'idle' | 'countdown' | 'eliminated'>('idle');
  const [activeCommand, setActiveCommand] = useState<BopCommand | null>(null);
  const [timeLeft, setTimeLeft]           = useState(roundTime);

  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Ref copy of phase so BLE callback always sees latest value without re-subscribing
  const phaseRef         = useRef(phase);
  const playersRef       = useRef(players);
  const currentIdxRef    = useRef(currentIdx);

  useEffect(() => { phaseRef.current = phase; },      [phase]);
  useEffect(() => { playersRef.current = players; },  [players]);
  useEffect(() => { currentIdxRef.current = currentIdx; }, [currentIdx]);

  // Animations
  const fadeIn      = useRef(new Animated.Value(0)).current;
  const shakeAnim   = useRef(new Animated.Value(0)).current;
  const timerAnim   = useRef(new Animated.Value(1)).current;
  const cmdScale    = useRef(new Animated.Value(0.85)).current;
  const elimOpacity = useRef(new Animated.Value(0)).current;

  const currentPlayer = players[currentIdx];
  const activePlayers = players.filter(p => !p.isOut);
  const winner        = activePlayers.length === 1 ? activePlayers[0] : null;

  // ── Mount: fade in + subscribe to M5 notifications ──────────────────────────
  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 300, useNativeDriver: true }).start();

    BLEManager.subscribeToNotifications((message) => {
      if (message === "SUCCESS" && phaseRef.current === 'countdown') {
        clearInterval(timerIntervalRef.current!)
        timerAnim.stopAnimation()
        // Tell M5 the player is confirmed safe
        BLEManager.sendMessage("SAFE")
        advanceTurnRef.current()
      }
    })

    return () => { BLEManager.unsubscribe() }
  }, [])

  // ── advanceTurn in a ref so the BLE callback above never goes stale ──────────
  const advanceTurnRef = useRef(() => {})
  useEffect(() => {
    advanceTurnRef.current = () => {
      setCurrentIdx(findNextActive(playersRef.current, currentIdxRef.current))
      setActiveCommand(null)
      setPhase('idle')
    }
  })

  // ── Auto-fire in Random mode ─────────────────────────────────────────────────
  useEffect(() => {
    if (gameMode !== 'Random' || phase !== 'idle' || winner) return
    const delay = setTimeout(() => {
      const cmd = BOP_COMMANDS[Math.floor(Math.random() * BOP_COMMANDS.length)]
      issueCommand(cmd)
    }, 1200)
    return () => clearTimeout(delay)
  }, [gameMode, phase, currentIdx])

  // ── Countdown tick ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'countdown') return

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerIntervalRef.current!)
          handleTimeout()
          return 0
        }
        return t - 1
      })
    }, 1000)

    return () => clearInterval(timerIntervalRef.current!)
  }, [phase])

  // ── Pop-in animation ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'countdown') {
      cmdScale.setValue(0.85)
      Animated.spring(cmdScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start()
    }
  }, [phase])

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const issueCommand = (cmd: BopCommand) => {
    if (phase !== 'idle') return
    // Send "BOP_IT:PlayerName" so M5 knows who to display
    BLEManager.sendMessage(`BOP_IT:${players[currentIdx].name}:${cmd.key}`)
    setActiveCommand(cmd)
    setTimeLeft(roundTime)
    setPhase('countdown')

    timerAnim.setValue(1)
    Animated.timing(timerAnim, {
      toValue: 0,
      duration: roundTime * 1000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start()
  }

  const handleTimeout = () => {
    // Notify M5 that time is up
    BLEManager.sendMessage("TIMES_UP")
    doShake()
    setPhase('eliminated')
    elimOpacity.setValue(0)
    Animated.timing(elimOpacity, { toValue: 1, duration: 250, useNativeDriver: true }).start()
    setTimeout(eliminateAndAdvance, 2000)
  }

  const eliminateAndAdvance = () => {
    setPlayers(prev => {
      const updated = prev.map((p, i) => i === currentIdxRef.current ? { ...p, isOut: true } : p)
      const remaining = updated.filter(p => !p.isOut)
      if (remaining.length > 1) {
        setCurrentIdx(findNextActive(updated, currentIdxRef.current))
      }
      return updated
    })
    setActiveCommand(null)
    setPhase('idle')
  }

  const doShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 14,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -14, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 50, useNativeDriver: true }),
    ]).start()
  }

  const timerBarWidth = timerAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
  const timerBarColor = timerAnim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: ['#FF4D6D', '#FFBE0B', '#06D6A0'],
  })

  // ── Winner ───────────────────────────────────────────────────────────────────
  if (winner) {
    return <WinnerScreen winner={winner} onBack={() => router.back()} />
  }

  return (
    <Animated.View style={[styles.root, { opacity: fadeIn }]}>
      <LinearGradient colors={['#06060F', '#0C0C1E', '#06060F']} style={StyleSheet.absoluteFill} />
      <View style={[styles.ambientGlow, { backgroundColor: currentPlayer.color + '18' }]} />

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* ── Header ── */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>BOP-IT</Text>
            <View style={styles.modePill}>
              <MaterialIcons
                name={gameMode === 'Taskmaster' ? 'assignment' : 'casino'}
                size={11} color="rgba(255,255,255,0.6)"
              />
              <Text style={styles.modePillText}>{gameMode.toUpperCase()}</Text>
            </View>
          </View>

          {/* ── Main Card ── */}
          <Animated.View style={[
            styles.mainCard,
            { borderColor: currentPlayer.color + '50', transform: [{ translateX: shakeAnim }] },
          ]}>
            <LinearGradient
              colors={[currentPlayer.color + '1E', currentPlayer.color + '08', 'transparent']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.mainCardInner}
            >
              <Text style={styles.nowLabel}>NOW PLAYING</Text>
              <Text style={[styles.playerName, { color: currentPlayer.color }]}>
                {currentPlayer.name}
              </Text>

              {/* COUNTDOWN */}
              {phase === 'countdown' && activeCommand && (
                <Animated.View style={[styles.commandBlock, { transform: [{ scale: cmdScale }] }]}>
                  <View style={[styles.iconRing, { borderColor: activeCommand.color + '60' }]}>
                    <MaterialIcons name={activeCommand.icon as any} size={54} color={activeCommand.color} />
                  </View>
                  <Text style={[styles.commandText, { color: activeCommand.color }]}>
                    {activeCommand.label.toUpperCase()}
                  </Text>
                  <View style={styles.timerTrack}>
                    <Animated.View style={[
                      styles.timerFill,
                      { width: timerBarWidth, backgroundColor: timerBarColor as any },
                    ]} />
                  </View>
                  <Text style={styles.timerDigit}>{timeLeft}s</Text>
                </Animated.View>
              )}

              {/* ELIMINATED */}
              {phase === 'eliminated' && (
                <Animated.View style={[styles.elimBlock, { opacity: elimOpacity }]}>
                  <Text style={styles.elimEmoji}>💀</Text>
                  <Text style={styles.elimText}>TOO SLOW!</Text>
                  <Text style={styles.elimSub}>{currentPlayer.name} is out</Text>
                </Animated.View>
              )}

              {/* IDLE */}
              {phase === 'idle' && (
                <Text style={styles.idleHint}>
                  {gameMode === 'Taskmaster' ? 'Pick a command below ↓' : 'Get ready...'}
                </Text>
              )}
            </LinearGradient>
          </Animated.View>

          {/* ── Taskmaster Command Grid ── */}
          {gameMode === 'Taskmaster' && phase === 'idle' && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>⚡ SEND COMMAND</Text>
              <View style={styles.cmdGrid}>
                {BOP_COMMANDS.map(cmd => (
                  <TouchableOpacity
                    key={cmd.key}
                    onPress={() => issueCommand(cmd)}
                    activeOpacity={0.75}
                    style={[styles.cmdCard, { borderColor: cmd.color + '55' }]}
                  >
                    <LinearGradient
                      colors={[cmd.color + '1E', cmd.color + '06']}
                      style={styles.cmdCardInner}
                    >
                      <View style={[styles.cmdIconCircle, { backgroundColor: cmd.color + '20' }]}>
                        <MaterialIcons name={cmd.icon as any} size={30} color={cmd.color} />
                      </View>
                      <Text style={[styles.cmdCardLabel, { color: cmd.color }]}>{cmd.label}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* ── Scoreboard ── */}
          <View style={styles.scoreboard}>
            <Text style={styles.sectionLabel}>
              👥 {activePlayers.length} PLAYER{activePlayers.length !== 1 ? 'S' : ''} REMAINING
            </Text>
            {players.map((p, i) => {
              const isActive = i === currentIdx && !p.isOut
              return (
                <View
                  key={i}
                  style={[
                    styles.scoreRow,
                    isActive && { backgroundColor: p.color + '14', borderRadius: 13 },
                    p.isOut && styles.scoreRowOut,
                  ]}
                >
                  <View style={[styles.scoreDot, { backgroundColor: p.isOut ? '#1c1c2e' : p.color }]} />
                  <Text style={[styles.scoreName, p.isOut && styles.scoreNameOut]}>{p.name}</Text>
                  {isActive && (
                    <View style={[styles.activePill, { borderColor: p.color + '55', backgroundColor: p.color + '20' }]}>
                      <Text style={[styles.activePillText, { color: p.color }]}>ACTIVE</Text>
                    </View>
                  )}
                  {p.isOut && (
                    <View style={styles.outPill}>
                      <Text style={styles.outPillText}>OUT</Text>
                    </View>
                  )}
                </View>
              )
            })}
          </View>

        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  )
}

// ─── Winner Screen ─────────────────────────────────────────────────────────────

function WinnerScreen({ winner, onBack }: { winner: Player; onBack: () => void }) {
  const scale = useRef(new Animated.Value(0.3)).current
  useEffect(() => {
    Animated.spring(scale, { toValue: 1, friction: 4, tension: 50, useNativeDriver: true }).start()
  }, [])

  return (
    <LinearGradient colors={['#06060F', winner.color + '2A', '#06060F']} style={styles.winnerRoot}>
      <Animated.View style={[styles.winnerCard, { transform: [{ scale }], borderColor: winner.color + '55' }]}>
        <Text style={styles.winnerTrophy}>🏆</Text>
        <Text style={styles.winnerLabel}>WINNER</Text>
        <Text style={[styles.winnerName, { color: winner.color }]}>{winner.name}</Text>
        <Text style={styles.winnerSub}>Last one standing!</Text>
      </Animated.View>
      <TouchableOpacity onPress={onBack} style={styles.playAgainBtn}>
        <Text style={styles.playAgainText}>PLAY AGAIN</Text>
      </TouchableOpacity>
    </LinearGradient>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#06060F' },
  scroll: { padding: 20, paddingTop: 40, paddingBottom: 50 },
  ambientGlow: {
    position: 'absolute', top: -80, alignSelf: 'center',
    width: 360, height: 360, borderRadius: 180,
  },

  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 20, paddingTop: 6,
  },
  headerTitle: {
    fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: 8,
    textShadowColor: '#FF4D6D88', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12,
  },
  modePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
  },
  modePillText: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },

  mainCard: { borderRadius: 28, borderWidth: 1, marginBottom: 24, overflow: 'hidden', minHeight: 200 },
  mainCardInner: { padding: 28, alignItems: 'center' },
  nowLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 4, color: 'rgba(255,255,255,0.3)', marginBottom: 6 },
  playerName: { fontSize: 46, fontWeight: '900', letterSpacing: 1 },

  commandBlock: { alignItems: 'center', width: '100%', marginTop: 18 },
  iconRing: {
    width: 96, height: 96, borderRadius: 48, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  commandText: { fontSize: 26, fontWeight: '900', letterSpacing: 3, marginBottom: 22 },

  timerTrack: {
    width: '100%', height: 8, backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 4, overflow: 'hidden', marginBottom: 8,
  },
  timerFill: { height: '100%', borderRadius: 4 },
  timerDigit: { alignSelf: 'flex-end', color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '800', letterSpacing: 1 },

  elimBlock: { alignItems: 'center', marginTop: 18 },
  elimEmoji: { fontSize: 50, marginBottom: 8 },
  elimText: { fontSize: 26, fontWeight: '900', color: '#FF4D6D', letterSpacing: 3 },
  elimSub: { marginTop: 6, color: 'rgba(255,255,255,0.35)', fontSize: 15 },

  idleHint: { marginTop: 22, color: 'rgba(255,255,255,0.22)', fontSize: 14, fontStyle: 'italic' },

  section: { marginBottom: 24 },
  sectionLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 3, color: 'rgba(255,255,255,0.28)', marginBottom: 14 },

  cmdGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cmdCard: { width: '47%', borderRadius: 20, borderWidth: 1.5, overflow: 'hidden' },
  cmdCardInner: { paddingVertical: 22, alignItems: 'center', gap: 10 },
  cmdIconCircle: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  cmdCardLabel: { fontSize: 13, fontWeight: '800', letterSpacing: 1 },

  scoreboard: {
    backgroundColor: 'rgba(255,255,255,0.025)', borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.055)',
  },
  scoreRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 11, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.035)',
  },
  scoreRowOut: { opacity: 0.28 },
  scoreDot: { width: 11, height: 11, borderRadius: 6 },
  scoreName: { flex: 1, color: '#fff', fontSize: 17, fontWeight: '700' },
  scoreNameOut: { textDecorationLine: 'line-through', color: 'rgba(255,255,255,0.3)' },
  activePill: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 3 },
  activePillText: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  outPill: { backgroundColor: 'rgba(255,77,109,0.14)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  outPillText: { color: '#FF4D6D', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },

  winnerRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  winnerCard: {
    alignItems: 'center', padding: 40, borderRadius: 30, borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)', marginBottom: 30,
  },
  winnerTrophy: { fontSize: 72, marginBottom: 10 },
  winnerLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 6, color: 'rgba(255,255,255,0.32)', marginBottom: 8 },
  winnerName: { fontSize: 52, fontWeight: '900', letterSpacing: 2 },
  winnerSub: { marginTop: 10, color: 'rgba(255,255,255,0.32)', fontSize: 15, fontStyle: 'italic' },
  playAgainBtn: {
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 18,
    paddingHorizontal: 40, paddingVertical: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.11)',
  },
  playAgainText: { color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 3 },
})