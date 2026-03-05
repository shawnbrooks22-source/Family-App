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
  '#FF6584',
  '#FFD700',
  '#43E97B',
  '#00B4D8',
  '#FF8C42',
  '#9B59B6',
  '#1ABC9C',
  '#E74C3C',
];

export default function SetupScreen() {
  const { setupFamily } = useApp();
  const [step, setStep] = useState(1);

  // Step 1 state
  const [parentName, setParentName] = useState('');
  const [parentPin, setParentPin] = useState('');
  const [parentEmoji, setParentEmoji] = useState('👑');

  // Step 2 state
  const [kids, setKids] = useState([]);
  const [kidName, setKidName] = useState('');
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
    const newKid = {
      id: Date.now().toString(),
      name: kidName.trim(),
      emoji: selectedEmoji,
      color: selectedColor,
    };
    const nextIndex = kids.length + 1;
    setKids([...kids, newKid]);
    setKidName('');
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
      parentPin,
      parentEmoji,
      kids,
    });
  }

  return (
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.appTitle}>⭐ ChoreQuest!</Text>
        <Text style={styles.appSubtitle}>Let's set up your family</Text>

        {step === 1 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Parent Setup 👑</Text>
            <Text style={styles.cardSubtitle}>Create your account first</Text>

            <Text style={styles.label}>Your Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Mom, Dad, Guardian..."
              value={parentName}
              onChangeText={setParentName}
              placeholderTextColor="#ccc"
            />

            <Text style={styles.label}>Choose Your Emoji</Text>
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

            <Text style={styles.label}>Secret 4-Digit PIN 🔒</Text>
            <Text style={styles.hint}>This keeps kids out of parent controls</Text>
            <TextInput
              style={[styles.input, styles.pinInputStyle]}
              placeholder="••••"
              value={parentPin}
              onChangeText={setParentPin}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              placeholderTextColor="#ccc"
              textAlign="center"
            />

            <TouchableOpacity style={styles.primaryBtn} onPress={handleStep1}>
              <Text style={styles.primaryBtnText}>Next: Add Your Kids 👶</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Add Your Kids! 👧👦</Text>
            <Text style={styles.cardSubtitle}>Add everyone who will use ChoreQuest</Text>

            {/* Added kids */}
            {kids.map(kid => (
              <View key={kid.id} style={[styles.kidChip, { backgroundColor: kid.color }]}>
                <Text style={styles.kidChipEmoji}>{kid.emoji}</Text>
                <Text style={styles.kidChipName}>{kid.name}</Text>
                <TouchableOpacity
                  onPress={() => setKids(kids.filter(k => k.id !== kid.id))}
                  style={styles.removeKidBtn}
                >
                  <Text style={styles.removeKidText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            <Text style={styles.label}>Kid's Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Lily, Jake, Sam..."
              value={kidName}
              onChangeText={setKidName}
              placeholderTextColor="#ccc"
            />

            <Text style={styles.label}>Choose an Emoji</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.emojiScroll}
            >
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

            <Text style={styles.label}>Choose a Color</Text>
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

            <TouchableOpacity style={[styles.primaryBtn, styles.addKidBtn]} onPress={addKid}>
              <Text style={styles.primaryBtnText}>+ Add Kid</Text>
            </TouchableOpacity>

            {kids.length > 0 && (
              <TouchableOpacity style={styles.primaryBtn} onPress={handleFinish}>
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
    paddingTop: 70,
    paddingHorizontal: 20,
    paddingBottom: 50,
  },
  appTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: 'white',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
  },
  appSubtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 28,
    marginTop: 8,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 32,
    padding: 26,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    marginBottom: 22,
    fontWeight: '600',
  },
  label: {
    fontSize: 16,
    fontWeight: '800',
    color: '#555',
    marginTop: 18,
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    color: '#aaa',
    marginBottom: 8,
    fontWeight: '500',
    marginTop: -6,
  },
  input: {
    borderWidth: 2.5,
    borderColor: '#DDD0FF',
    borderRadius: 14,
    padding: 14,
    fontSize: 17,
    color: '#333',
    backgroundColor: '#FAFAFA',
  },
  pinInputStyle: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 14,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emojiScroll: {
    marginBottom: 4,
  },
  emojiBtn: {
    padding: 8,
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: 'transparent',
    backgroundColor: '#F5F0FF',
    margin: 5,
  },
  emojiBtnSelected: {
    borderColor: '#6C63FF',
    backgroundColor: '#EAE4FF',
  },
  emojiText: {
    fontSize: 32,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  colorDot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    margin: 5,
  },
  colorDotSelected: {
    borderWidth: 3.5,
    borderColor: '#333',
    transform: [{ scale: 1.2 }],
  },
  primaryBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 22,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  addKidBtn: {
    backgroundColor: '#43E97B',
    shadowColor: '#43E97B',
  },
  primaryBtnText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '900',
  },
  kidChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  kidChipEmoji: {
    fontSize: 28,
    marginRight: 10,
  },
  kidChipName: {
    color: 'white',
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
  },
  removeKidBtn: {
    padding: 4,
  },
  removeKidText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 18,
    fontWeight: '900',
  },
  backTextBtn: {
    alignItems: 'center',
    marginTop: 18,
    padding: 8,
  },
  backText: {
    color: '#aaa',
    fontSize: 15,
    fontWeight: '600',
  },
});
