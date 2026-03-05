import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  StatusBar,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { colors, kidColors, shadows } from '../theme/index';

const { width } = Dimensions.get('window');

const PARENT_EMOJIS = ['👑', '🦸', '🧙', '⭐', '🏆', '💫', '🌟', '🎯'];
const KID_EMOJIS = ['🦊', '🐱', '🐶', '🐸', '🐻', '🦁', '🐼', '🦄', '🐯', '🐰', '🦋', '🐬'];

// ─── Reusable input ────────────────────────────────────────────────────────────
function Field({ label, optional, hint, ...inputProps }) {
  return (
    <View style={fieldStyles.wrapper}>
      <View style={fieldStyles.labelRow}>
        <Text style={fieldStyles.label}>{label}</Text>
        {optional && <Text style={fieldStyles.optional}>Optional</Text>}
      </View>
      {hint ? <Text style={fieldStyles.hint}>{hint}</Text> : null}
      <TextInput
        style={[fieldStyles.input, inputProps.secureTextEntry && fieldStyles.pinInput]}
        placeholderTextColor={colors.text3}
        {...inputProps}
      />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrapper: { marginBottom: 4 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    marginTop: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text2,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  optional: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text3,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  hint: {
    fontSize: 12,
    color: colors.text3,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: -12,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.text1,
    backgroundColor: '#F8FAFC',
  },
  pinInput: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 16,
    textAlign: 'center',
  },
});

// ─── Main SetupScreen ──────────────────────────────────────────────────────────
export default function SetupScreen() {
  const { setupFamily } = useApp();
  const [step, setStep] = useState(1);
  const progressAnim = useRef(new Animated.Value(0.5)).current;

  // Step 1 state
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentPin, setParentPin] = useState('');
  const [parentEmoji, setParentEmoji] = useState('👑');

  // Step 2 state
  const [kids, setKids] = useState([]);
  const [kidName, setKidName] = useState('');
  const [kidPhone, setKidPhone] = useState('');
  const [kidEmoji, setKidEmoji] = useState('🦊');
  const [kidColor, setKidColor] = useState(kidColors[0]);

  function goToStep2() {
    if (!parentName.trim()) {
      Alert.alert('One more thing', 'Please enter your name to continue.');
      return;
    }
    if (parentPin.length !== 4) {
      Alert.alert('Set your PIN', 'Your PIN must be exactly 4 digits.');
      return;
    }
    Animated.timing(progressAnim, { toValue: 1, duration: 400, useNativeDriver: false }).start();
    setStep(2);
  }

  function goBack() {
    Animated.timing(progressAnim, { toValue: 0.5, duration: 320, useNativeDriver: false }).start();
    setStep(1);
  }

  function addKid() {
    if (!kidName.trim()) {
      Alert.alert('Add a name', "Please enter your kid's name.");
      return;
    }
    const idx = kids.length;
    setKids([
      ...kids,
      {
        id: Date.now().toString(),
        name: kidName.trim(),
        emoji: kidEmoji,
        color: kidColor,
        phone: kidPhone.trim(),
      },
    ]);
    setKidName('');
    setKidPhone('');
    setKidEmoji(KID_EMOJIS[(idx + 1) % KID_EMOJIS.length]);
    setKidColor(kidColors[(idx + 1) % kidColors.length]);
  }

  async function handleFinish() {
    if (kids.length === 0) {
      Alert.alert('Add a kid', 'Add at least one kid to get started!');
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

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      <SafeAreaView style={{ backgroundColor: colors.surface }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logoText}>⭐ ChoreQuest</Text>
          <Text style={styles.stepBadge}>Step {step} / 2</Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 1 ? (
          <Step1
            parentEmoji={parentEmoji}
            setParentEmoji={setParentEmoji}
            parentName={parentName}
            setParentName={setParentName}
            parentPhone={parentPhone}
            setParentPhone={setParentPhone}
            parentPin={parentPin}
            setParentPin={setParentPin}
            onContinue={goToStep2}
          />
        ) : (
          <Step2
            kids={kids}
            setKids={setKids}
            kidName={kidName}
            setKidName={setKidName}
            kidPhone={kidPhone}
            setKidPhone={setKidPhone}
            kidEmoji={kidEmoji}
            setKidEmoji={setKidEmoji}
            kidColor={kidColor}
            setKidColor={setKidColor}
            onAddKid={addKid}
            onFinish={handleFinish}
            onBack={goBack}
          />
        )}
      </ScrollView>
    </View>
  );
}

// ─── Step 1: Parent Setup ──────────────────────────────────────────────────────
function Step1({
  parentEmoji, setParentEmoji,
  parentName, setParentName,
  parentPhone, setParentPhone,
  parentPin, setParentPin,
  onContinue,
}) {
  return (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Set up your{'\n'}parent account</Text>
      <Text style={styles.stepSub}>Manage your family's quests from here</Text>

      {/* Emoji picker */}
      <View style={fieldStyles.labelRow}>
        <Text style={fieldStyles.label}>Your Avatar</Text>
      </View>
      <View style={styles.emojiGrid}>
        {PARENT_EMOJIS.map(e => (
          <TouchableOpacity
            key={e}
            style={[styles.emojiBtn, parentEmoji === e && styles.emojiBtnActive]}
            onPress={() => setParentEmoji(e)}
            activeOpacity={0.7}
          >
            <Text style={styles.emojiBtnText}>{e}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Field
        label="Your Name"
        placeholder="e.g. Mom, Dad, Guardian…"
        value={parentName}
        onChangeText={setParentName}
        returnKeyType="next"
      />

      <Field
        label="Phone Number"
        optional
        placeholder="555-867-5309"
        value={parentPhone}
        onChangeText={setParentPhone}
        keyboardType="phone-pad"
      />

      <Field
        label="Secret PIN 🔐"
        hint="Kids won't be able to see this"
        placeholder="••••"
        value={parentPin}
        onChangeText={t => setParentPin(t.replace(/\D/g, '').slice(0, 4))}
        keyboardType="number-pad"
        maxLength={4}
        secureTextEntry
      />

      <TouchableOpacity style={styles.primaryBtn} onPress={onContinue} activeOpacity={0.85}>
        <Text style={styles.primaryBtnText}>Continue →</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Step 2: Add Kids ──────────────────────────────────────────────────────────
function Step2({
  kids, setKids,
  kidName, setKidName,
  kidPhone, setKidPhone,
  kidEmoji, setKidEmoji,
  kidColor, setKidColor,
  onAddKid, onFinish, onBack,
}) {
  return (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Add your kids</Text>
      <Text style={styles.stepSub}>Everyone who'll use ChoreQuest</Text>

      {/* Kids list */}
      {kids.map(kid => (
        <View key={kid.id} style={[styles.kidChip, { borderLeftColor: kid.color, borderLeftWidth: 4 }]}>
          <View style={[styles.kidChipAvatar, { backgroundColor: kid.color }]}>
            <Text style={{ fontSize: 22 }}>{kid.emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.kidChipName}>{kid.name}</Text>
            {kid.phone ? (
              <Text style={styles.kidChipPhone}>📞 {kid.phone}</Text>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={() => setKids(kids.filter(k => k.id !== kid.id))}
            hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
            style={styles.removeKidBtn}
          >
            <Text style={styles.removeKidText}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* Add kid form */}
      <View style={styles.addKidCard}>
        <Text style={styles.addKidCardTitle}>
          {kids.length === 0 ? '👧 Add your first kid' : '➕ Add another kid'}
        </Text>

        <Field
          label="Kid's Name"
          placeholder="e.g. Lily, Jake, Sam…"
          value={kidName}
          onChangeText={setKidName}
          returnKeyType="done"
        />

        <Field
          label="Phone Number"
          optional
          placeholder="555-123-4567"
          value={kidPhone}
          onChangeText={setKidPhone}
          keyboardType="phone-pad"
        />

        {/* Emoji row */}
        <View style={[fieldStyles.labelRow, { marginTop: 20 }]}>
          <Text style={fieldStyles.label}>Emoji</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 4 }}
          contentContainerStyle={{ gap: 8 }}
        >
          {KID_EMOJIS.map(e => (
            <TouchableOpacity
              key={e}
              style={[styles.emojiSmBtn, kidEmoji === e && styles.emojiSmBtnActive]}
              onPress={() => setKidEmoji(e)}
              activeOpacity={0.7}
            >
              <Text style={styles.emojiSmText}>{e}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Color row */}
        <View style={[fieldStyles.labelRow, { marginTop: 18 }]}>
          <Text style={fieldStyles.label}>Color</Text>
        </View>
        <View style={styles.colorRow}>
          {kidColors.map(c => (
            <TouchableOpacity
              key={c}
              onPress={() => setKidColor(c)}
              style={[
                styles.colorDot,
                { backgroundColor: c },
                kidColor === c && styles.colorDotActive,
              ]}
              activeOpacity={0.8}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.addKidBtn} onPress={onAddKid} activeOpacity={0.85}>
          <Text style={styles.addKidBtnText}>Add Kid</Text>
        </TouchableOpacity>
      </View>

      {kids.length > 0 && (
        <TouchableOpacity style={styles.primaryBtn} onPress={onFinish} activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>Let's Go! 🚀</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={onBack} style={styles.backLink}>
        <Text style={styles.backLinkText}>← Back to parent setup</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 12,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text1,
    letterSpacing: -0.3,
  },
  stepBadge: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text3,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },

  // Progress bar
  progressTrack: {
    height: 3,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  progressFill: {
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },

  // Scroll
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 60,
  },

  // Step content
  stepContent: { paddingTop: 32 },
  stepTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text1,
    letterSpacing: -0.6,
    lineHeight: 40,
    marginBottom: 8,
  },
  stepSub: {
    fontSize: 15,
    color: colors.text3,
    fontWeight: '500',
    marginBottom: 8,
  },

  // Emoji picker (parent)
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 4,
  },
  emojiBtn: {
    padding: 10,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#F8FAFC',
  },
  emojiBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  emojiBtnText: { fontSize: 28 },

  // Emoji picker (kid, horizontal)
  emojiSmBtn: {
    padding: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#F8FAFC',
  },
  emojiSmBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  emojiSmText: { fontSize: 26 },

  // Colors
  colorRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotActive: {
    borderColor: colors.text1,
    transform: [{ scale: 1.2 }],
  },

  // Buttons
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 100,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 24,
    ...shadows.md,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  addKidBtn: {
    backgroundColor: colors.success,
    borderRadius: 100,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 18,
    ...shadows.sm,
  },
  addKidBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  backLink: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 10,
  },
  backLinkText: {
    color: colors.text3,
    fontSize: 15,
    fontWeight: '600',
  },

  // Kids list
  kidChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  kidChipAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  kidChipName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text1,
  },
  kidChipPhone: {
    fontSize: 12,
    color: colors.text3,
    marginTop: 2,
  },
  removeKidBtn: {
    padding: 6,
  },
  removeKidText: {
    color: colors.text3,
    fontSize: 15,
    fontWeight: '600',
  },

  // Add kid card
  addKidCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
    marginBottom: 4,
  },
  addKidCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text1,
    marginBottom: 4,
  },
});
