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
  '#FF6584', '#FFD700', '#43E97B', '#00B4D8',
  '#FF8C42', '#9B59B6', '#1ABC9C', '#E74C3C',
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
      setPinError('Wrong PIN, try again 🙈');
      setPin('');
    }
  }

  const kids = family.kids.map((kid, i) => ({
    ...kid,
    color: kid.color || KID_COLORS[i % KID_COLORS.length],
  }));

  return (
    <LinearGradient colors={['#6C63FF', '#4834d4']} style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Text style={styles.title}>ChoreQuest ⭐</Text>
          <Text style={styles.subtitle}>Who's playing today?</Text>
        </View>

        <View style={styles.avatarGrid}>
          {/* Parent card */}
          <TouchableOpacity
            style={[styles.avatarCard, styles.parentCard]}
            onPress={handleParentPress}
            activeOpacity={0.88}
          >
            <View style={styles.cardInner}>
              <Text style={styles.avatarEmoji}>{family.parentEmoji}</Text>
              <Text style={styles.avatarName}>{family.parentName}</Text>
              <View style={styles.parentBadge}>
                <Text style={styles.parentBadgeText}>👑 Parent</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Kid cards */}
          {kids.map(kid => (
            <TouchableOpacity
              key={kid.id}
              style={[styles.avatarCard, { backgroundColor: kid.color }]}
              onPress={() => handleKidPress(kid)}
              activeOpacity={0.88}
            >
              <View style={styles.cardInner}>
                <Text style={styles.avatarEmoji}>{kid.emoji}</Text>
                <Text style={styles.avatarName}>{kid.name}</Text>
                <Text style={styles.tapHint}>Tap to play!</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* PIN Modal */}
      <Modal visible={showPinModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.lockIcon}>🔒</Text>
            <Text style={styles.modalTitle}>Parent Zone</Text>
            <Text style={styles.modalSubtitle}>Enter your 4-digit PIN</Text>

            <TextInput
              style={styles.pinInput}
              value={pin}
              onChangeText={setPin}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              placeholder="• • • •"
              placeholderTextColor="#C4B5FD"
              textAlign="center"
              autoFocus
              onSubmitEditing={handlePinSubmit}
            />

            {pinError ? <Text style={styles.pinError}>{pinError}</Text> : null}

            <TouchableOpacity
              style={[styles.modalBtn, pin.length < 4 && styles.modalBtnDisabled]}
              onPress={handlePinSubmit}
              activeOpacity={0.85}
            >
              <Text style={styles.modalBtnText}>Enter</Text>
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
    paddingTop: 72,
    paddingHorizontal: 20,
    paddingBottom: 48,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 38,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 8,
    fontWeight: '600',
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
  },
  avatarCard: {
    width: 150,
    height: 175,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  parentCard: {
    backgroundColor: '#5B4FE9',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  cardInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  avatarEmoji: {
    fontSize: 60,
  },
  avatarName: {
    fontSize: 17,
    fontWeight: '800',
    color: 'white',
    marginTop: 8,
  },
  parentBadge: {
    marginTop: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  parentBadgeText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '700',
  },
  tapHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
    fontWeight: '600',
  },

  // ─── PIN Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: 'white',
    borderRadius: 28,
    padding: 32,
    width: '84%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 32,
    elevation: 14,
  },
  lockIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 15,
    color: '#9CA3AF',
    marginBottom: 24,
    fontWeight: '500',
  },
  pinInput: {
    borderWidth: 2,
    borderColor: '#DDD6FE',
    borderRadius: 16,
    fontSize: 32,
    fontWeight: '900',
    paddingVertical: 14,
    paddingHorizontal: 16,
    width: '100%',
    color: '#1A1A2E',
    letterSpacing: 14,
    backgroundColor: '#F5F3FF',
  },
  pinError: {
    color: '#EF4444',
    fontSize: 14,
    marginTop: 12,
    fontWeight: '600',
  },
  modalBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 100,
    paddingVertical: 16,
    paddingHorizontal: 56,
    marginTop: 24,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  modalBtnDisabled: {
    opacity: 0.5,
  },
  modalBtnText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '800',
  },
  cancelTouchable: {
    marginTop: 16,
    padding: 10,
  },
  cancelText: {
    color: '#9CA3AF',
    fontSize: 15,
    fontWeight: '600',
  },
});
