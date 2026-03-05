import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';

const KID_COLORS = [
  '#FF6584',
  '#FFD700',
  '#43E97B',
  '#00B4D8',
  '#FF8C42',
  '#9B59B6',
  '#1ABC9C',
  '#E74C3C',
];

export default function HomeScreen({ navigation }) {
  const { family, verifyPin } = useApp();
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');

  function handleKidPress(kid) {
    navigation.navigate('Kid', { kidId: kid.id });
  }

  function handleParentPress() {
    setPin('');
    setPinError('');
    setShowPinModal(true);
  }

  function handlePinSubmit() {
    if (verifyPin(pin)) {
      setShowPinModal(false);
      navigation.navigate('Parent');
    } else {
      setPinError('Wrong PIN! Try again 🙈');
      setPin('');
    }
  }

  const kids = family.kids.map((kid, i) => ({
    ...kid,
    color: kid.color || KID_COLORS[i % KID_COLORS.length],
  }));

  return (
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>⭐ ChoreQuest! ⭐</Text>
          <Text style={styles.subtitle}>Who's playing today?</Text>
        </View>

        <View style={styles.avatarGrid}>
          {/* Parent card */}
          <TouchableOpacity
            style={[styles.avatarCard, { backgroundColor: '#6C63FF' }]}
            onPress={handleParentPress}
            activeOpacity={0.85}
          >
            <Text style={styles.avatarEmoji}>{family.parentEmoji}</Text>
            <Text style={styles.avatarName}>{family.parentName}</Text>
            <View style={styles.parentBadgeRow}>
              <Text style={styles.parentBadge}>👑 Parent</Text>
            </View>
          </TouchableOpacity>

          {/* Kid cards */}
          {kids.map(kid => (
            <TouchableOpacity
              key={kid.id}
              style={[styles.avatarCard, { backgroundColor: kid.color }]}
              onPress={() => handleKidPress(kid)}
              activeOpacity={0.85}
            >
              <Text style={styles.avatarEmoji}>{kid.emoji}</Text>
              <Text style={styles.avatarName}>{kid.name}</Text>
              <Text style={styles.tapHint}>Tap to play!</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* PIN Modal */}
      <Modal visible={showPinModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Parent Zone 🔒</Text>
            <Text style={styles.modalSubtitle}>Enter your 4-digit PIN</Text>
            <TextInput
              style={styles.pinInput}
              value={pin}
              onChangeText={setPin}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              placeholder="••••"
              placeholderTextColor="#ccc"
              textAlign="center"
              autoFocus
            />
            {pinError ? <Text style={styles.pinError}>{pinError}</Text> : null}
            <TouchableOpacity style={styles.modalBtn} onPress={handlePinSubmit}>
              <Text style={styles.modalBtnText}>Enter! 🚀</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowPinModal(false)} style={styles.cancelTouchable}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingTop: 70,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 40,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 2, height: 3 },
    textShadowRadius: 6,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 10,
    fontWeight: '700',
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  avatarCard: {
    width: 148,
    height: 172,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  avatarEmoji: {
    fontSize: 64,
  },
  avatarName: {
    fontSize: 18,
    fontWeight: '900',
    color: 'white',
    marginTop: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  parentBadgeRow: {
    marginTop: 5,
  },
  parentBadge: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '700',
  },
  tapHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: 'white',
    borderRadius: 32,
    padding: 36,
    width: '82%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  modalTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#333',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#777',
    marginBottom: 28,
    fontWeight: '600',
  },
  pinInput: {
    borderWidth: 3,
    borderColor: '#6C63FF',
    borderRadius: 18,
    fontSize: 36,
    fontWeight: '900',
    padding: 16,
    width: '100%',
    color: '#333',
    letterSpacing: 16,
    backgroundColor: '#F8F5FF',
  },
  pinError: {
    color: '#FF6584',
    fontSize: 15,
    marginTop: 14,
    fontWeight: '700',
  },
  modalBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 48,
    marginTop: 28,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  modalBtnText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '900',
  },
  cancelTouchable: {
    marginTop: 18,
    padding: 8,
  },
  cancelText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '600',
  },
});
