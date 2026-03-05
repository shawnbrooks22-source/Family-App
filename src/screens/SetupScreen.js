import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';

const PARENT_EMOJIS = ['👑', '🦸', '🧙', '⭐', '🏆', '💫', '🌟', '🎯'];
const KID_EMOJIS = ['🦊', '🐱', '🐶', '🐸', '🐻', '🦁', '🐼', '🦄', '🐯', '🐰', '🦋', '🐬'];
const KID_COLORS = [
  '#FF6584', '#FFD700', '#43E97B', '#00B4D8',
  '#FF8C42', '#9B59B6', '#1ABC9C', '#E74C3C',
];

export default function SetupScreen() {
  const { setupFamily } = useApp();
  const [step, setStep] = useState(1);

  // Step 1
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentPin, setParentPin] = useState('');
  const [parentEmoji, setParentEmoji] = useState('👑');

  // Step 2
  const [kids, setKids] = useState([]);
  const [kidName, setKidName] = useState('');
  const [kidPhone, setKidPhone] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🦊');
  const [selectedColor, setSelectedColor] = useState(KID_COLORS[0]);

  function handleStep1() {
    if (!parentName.trim()) {
      Alert.alert('Oops!', 'Please enter your name! 😊');
      return;
    }
    if (parentPin.length !== 4) {
      Alert.alert('Oops!', 'PIN must be exactly 4 digits! 🔒');
      return;
    }
    setStep(2);
  }

  function addKid() {
    if (!kidName.trim()) {
      Alert.alert('Oops!', "Enter your kid's name! 👶");
      return;
    }
    const nextIndex = kids.length + 1;
    const newKid = {
      id: Date.now().toString(),
      name: kidName.trim(),
      emoji: selectedEmoji,
      color: selectedColor,
      phone: kidPhone.trim(),
    };
    setKids([...kids, newKid]);
    setKidName('');
    setKidPhone('');
    setSelectedEmoji(KID_EMOJIS[nextIndex % KID_EMOJIS.length]);
    setSelectedColor(KID_COLORS[nextIndex % KID_COLORS.length]);
  }

  async function handleFinish() {
    if (kids.length === 0) {
      Alert.alert('Oops!', 'Add at least one kid to get started! 👧');
      return;
    }
    await setupFamily({
      parentName: parentName.trim(),
      parentPhone: parentPhone.trim(),
      parentPin,
      parentEmoji,
      kids,
    });
  }

  return (
    <LinearGradient colors={['#6C63FF', '#4834d4']} style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appTitle}>ChoreQuest ⭐</Text>
          <Text style={styles.appSubtitle}>Let's get your family set up</Text>

          {/* Step indicator */}
          <View style={styles.stepRow}>
            <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
            <View style={styles.stepLine} />
            <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
          </View>
          <Text style={styles.stepLabel}>Step {step} of 2</Text>
        </View>

        {step === 1 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Parent Setup 👑</Text>
            <Text style={styles.cardSubtitle}>Create your parent account</Text>

            <Text style={styles.label}>YOUR NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Mom, Dad, Guardian..."
              value={parentName}
              onChangeText={setParentName}
              placeholderTextColor="#C4B5FD"
            />

            <Text style={styles.label}>PHONE NUMBER (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 555-867-5309"
              value={parentPhone}
              onChangeText={setParentPhone}
              keyboardType="phone-pad"
              placeholderTextColor="#C4B5FD"
            />

            <Text style={styles.label}>CHOOSE YOUR EMOJI</Text>
            <View style={styles.emojiGrid}>
              {PARENT_EMOJIS.map(e => (
                <TouchableOpacity
                  key={e}
                  style={[styles.emojiBtn, parentEmoji === e && styles.emojiBtnSelected]}
                  onPress={() => setParentEmoji(e)}
                >
                  <Text style={styles.emojiText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>SECRET 4-DIGIT PIN 🔒</Text>
            <Text style={styles.hint}>Keeps kids out of parent controls</Text>
            <TextInput
              style={[styles.input, styles.pinInput]}
              placeholder="• • • •"
              value={parentPin}
              onChangeText={setParentPin}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              placeholderTextColor="#C4B5FD"
              textAlign="center"
            />

            <TouchableOpacity style={styles.primaryBtn} onPress={handleStep1} activeOpacity={0.88}>
              <Text style={styles.primaryBtnText}>Next: Add Your Kids →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Add Your Kids! 👧👦</Text>
            <Text style={styles.cardSubtitle}>Add everyone who will use ChoreQuest</Text>

            {/* Added kids list */}
            {kids.map(kid => (
              <View key={kid.id} style={[styles.kidChip, { backgroundColor: kid.color }]}>
                <Text style={styles.kidChipEmoji}>{kid.emoji}</Text>
                <View style={styles.kidChipInfo}>
                  <Text style={styles.kidChipName}>{kid.name}</Text>
                  {kid.phone ? <Text style={styles.kidChipPhone}>📞 {kid.phone}</Text> : null}
                </View>
                <TouchableOpacity
                  onPress={() => setKids(kids.filter(k => k.id !== kid.id))}
                  style={styles.removeKidBtn}
                >
                  <Text style={styles.removeKidText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            <Text style={styles.label}>KID'S NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Lily, Jake, Sam..."
              value={kidName}
              onChangeText={setKidName}
              placeholderTextColor="#C4B5FD"
            />

            <Text style={styles.label}>PHONE NUMBER (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 555-123-4567"
              value={kidPhone}
              onChangeText={setKidPhone}
              keyboardType="phone-pad"
              placeholderTextColor="#C4B5FD"
            />

            <Text style={styles.label}>CHOOSE AN EMOJI</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiScroll}>
              {KID_EMOJIS.map(e => (
                <TouchableOpacity
                  key={e}
                  style={[styles.emojiBtn, selectedEmoji === e && styles.emojiBtnSelected]}
                  onPress={() => setSelectedEmoji(e)}
                >
                  <Text style={styles.emojiText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>CHOOSE A COLOR</Text>
            <View style={styles.colorRow}>
              {KID_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c },
                    selectedColor === c && styles.colorDotSelected,
                  ]}
                  onPress={() => setSelectedColor(c)}
                />
              ))}
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, styles.addKidBtn]}
              onPress={addKid}
              activeOpacity={0.88}
            >
              <Text style={styles.primaryBtnText}>+ Add Kid</Text>
            </TouchableOpacity>

            {kids.length > 0 && (
              <TouchableOpacity style={styles.primaryBtn} onPress={handleFinish} activeOpacity={0.88}>
                <Text style={styles.primaryBtnText}>Let's Go! 🚀</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={() => setStep(1)} style={styles.backTextBtn}>
              <Text style={styles.backText}>← Back to parent setup</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingTop: 64,
    paddingHorizontal: 20,
    paddingBottom: 50,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  appTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: 'white',
    letterSpacing: 0.5,
  },
  appSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
    marginTop: 6,
    marginBottom: 20,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  stepDotActive: {
    backgroundColor: 'white',
  },
  stepLine: {
    width: 48,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 6,
  },
  stepLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 28,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    marginTop: 18,
    marginBottom: 8,
    letterSpacing: 1,
  },
  hint: {
    fontSize: 12,
    color: '#C4B5FD',
    marginBottom: 8,
    fontWeight: '500',
    marginTop: -6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#EDE9FF',
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    color: '#1A1A2E',
    backgroundColor: '#FAFAFF',
  },
  pinInput: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 14,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  emojiScroll: {
    marginBottom: 4,
  },
  emojiBtn: {
    padding: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#F5F3FF',
    margin: 4,
  },
  emojiBtnSelected: {
    borderColor: '#6C63FF',
    backgroundColor: '#EDE9FF',
  },
  emojiText: {
    fontSize: 30,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: '#1A1A2E',
    transform: [{ scale: 1.18 }],
  },
  primaryBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 100,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  addKidBtn: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
  },
  primaryBtnText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '800',
  },
  kidChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  kidChipEmoji: {
    fontSize: 26,
    marginRight: 10,
  },
  kidChipInfo: {
    flex: 1,
  },
  kidChipName: {
    color: 'white',
    fontSize: 17,
    fontWeight: '800',
  },
  kidChipPhone: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  removeKidBtn: {
    padding: 6,
  },
  removeKidText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    fontWeight: '900',
  },
  backTextBtn: {
    alignItems: 'center',
    marginTop: 16,
    padding: 10,
  },
  backText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
  },
});
