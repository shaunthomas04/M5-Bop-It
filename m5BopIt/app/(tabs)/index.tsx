import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const PLAYER_COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#1A535C', '#FF9F1C'];

export default function GameSetupScreen() {
  const [players, setPlayers] = useState<string[]>(['Player 1']);
  const [gameMode, setGameMode] = useState<'Random' | 'Taskmaster'>('Random');
  const [m5Name, setM5Name] = useState('M5Core2');
  const [serviceUuid, setServiceUuid] = useState('180D');

  const addPlayer = () => {
    if (players.length < 5) {
      setPlayers([...players, `Player ${players.length + 1}`]);
    } else {
      Alert.alert('Limit Reached', 'Maximum 5 players allowed.');
    }
  };

  const removePlayer = (index: number) => {
    if (players.length > 1) {
      const newPlayers = players.filter((_, i) => i !== index);
      setPlayers(newPlayers);
    }
  };

  const updatePlayerName = (name: string, index: number) => {
    const newPlayers = [...players];
    newPlayers[index] = name;
    setPlayers(newPlayers);
  };

  return (
    <LinearGradient colors={['#6A11CB', '#2575FC']} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>M5 Bop-It Host</Text>

          {/* Player Management Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Players ({players.length}/5)</Text>
              <TouchableOpacity onPress={addPlayer} style={styles.addButton}>
                <MaterialIcons name="person-add" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            
            {players.map((player, index) => (
              <View key={index} style={[styles.playerRow, { borderLeftColor: PLAYER_COLORS[index] }]}>
                <MaterialIcons name="person" size={24} color={PLAYER_COLORS[index]} style={styles.playerIcon} />
                <TextInput
                  style={styles.playerInput}
                  value={player}
                  onChangeText={(text) => updatePlayerName(text, index)}
                  placeholder={`Player ${index + 1}`}
                  placeholderTextColor="#AAA"
                />
                {players.length > 1 && (
                  <TouchableOpacity onPress={() => removePlayer(index)}>
                    <MaterialIcons name="remove-circle-outline" size={24} color="#FF6B6B" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>

          {/* Game Mode Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Game Mode</Text>
            <View style={styles.modeContainer}>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  gameMode === 'Random' && styles.modeButtonActive,
                ]}
                onPress={() => setGameMode('Random')}
              >
                <MaterialIcons 
                  name="casino" 
                  size={24} 
                  color={gameMode === 'Random' ? '#FFF' : '#6A11CB'} 
                />
                <Text style={[styles.modeText, gameMode === 'Random' && styles.modeTextActive]}>
                  Random
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  gameMode === 'Taskmaster' && styles.modeButtonActive,
                ]}
                onPress={() => setGameMode('Taskmaster')}
              >
                <MaterialIcons 
                  name="assignment" 
                  size={24} 
                  color={gameMode === 'Taskmaster' ? '#FFF' : '#6A11CB'} 
                />
                <Text style={[styles.modeText, gameMode === 'Taskmaster' && styles.modeTextActive]}>
                  Taskmaster
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Connection Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>M5 Stack Core 2 Connection</Text>
            <View style={styles.inputContainer}>
              <MaterialIcons name="bluetooth" size={20} color="#6A11CB" />
              <TextInput
                style={styles.input}
                value={m5Name}
                onChangeText={setM5Name}
                placeholder="Device Name (e.g. M5Core2)"
                placeholderTextColor="#AAA"
              />
            </View>
            <View style={styles.inputContainer}>
              <MaterialIcons name="settings-input-component" size={20} color="#6A11CB" />
              <TextInput
                style={styles.input}
                value={serviceUuid}
                onChangeText={setServiceUuid}
                placeholder="Service UUID (e.g. 180D)"
                placeholderTextColor="#AAA"
              />
            </View>
          </View>

          <TouchableOpacity style={styles.startButton}>
            <Text style={styles.startButtonText}>START GAME</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
  section: {
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  addButton: {
    backgroundColor: '#6A11CB',
    borderRadius: 12,
    padding: 8,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 5,
  },
  playerIcon: {
    marginRight: 10,
  },
  playerInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  modeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#6A11CB',
    gap: 8,
  },
  modeButtonActive: {
    backgroundColor: '#6A11CB',
  },
  modeText: {
    fontWeight: 'bold',
    color: '#6A11CB',
  },
  modeTextActive: {
    color: '#FFF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 10,
    height: 50,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  startButton: {
    backgroundColor: '#FF6B6B',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  startButtonText: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
  },
});
