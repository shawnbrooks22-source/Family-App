import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { kidColors } from '../theme/index';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import useDevice from '../hooks/useDevice';

const PARENT_EMOJIS = ['👑', '🦸', '🧙', '⭐', '🏆', '💫', '🌟', '🎯'];
const KID_EMOJIS = ['🦊', '🐱', '🐶', '🐸', '🐻', '🦁', '🐼', '🦄', '🐯', '🐰', '🦋', '🐬'];

// ─── Reusable input ────────────────────────────────────────────────────────────
function Field({ label, optional, hint, colors, t, ...inputProps }) {
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
      backgroundColor: colors.divider,
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
      backgroundColor: colors.surface,
    },
    pinInput: {
      fontSize: 24,
      fontWeight: '800',
      letterSpacing: 16,
      textAlign: 'center',
    },
  });

  return (
    <View style={fieldStyles.wrapper}>
      <View style={fieldStyles.labelRow}>
        <Text style={fieldStyles.label}>{label}</Text>
        {optional && <Text style={fieldStyles.optional}>{t ? t('optional') : 'Optional'}</Text>}
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

// ─── COPPA Consent Screen ──────────────────────────────────────────────────────
function ConsentScreen({ onAccept, colors, shadows, t }) {
  const [checked, setChecked] = useState(false);

  const consentStyles = StyleSheet.create({
    scroll: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 20 },
    shield: { fontSize: 56, textAlign: 'center', marginBottom: 16 },
    title: {
      fontSize: 30,
      fontWeight: '800',
      color: colors.text1,
      textAlign: 'center',
      letterSpacing: -0.5,
      lineHeight: 38,
      marginBottom: 10,
    },
    sub: {
      fontSize: 15,
      color: colors.text3,
      fontWeight: '500',
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 24,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 18,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.text2,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 12,
    },
    bullet: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 9 },
    bulletIcon: { fontSize: 16, width: 22, textAlign: 'center', marginTop: 1 },
    bulletText: { flex: 1, fontSize: 14, color: colors.text2, fontWeight: '500', lineHeight: 20 },
    coppaNote: {
      backgroundColor: '#EFF6FF',
      borderRadius: 16,
      padding: 16,
      marginBottom: 22,
      borderWidth: 1,
      borderColor: '#BFDBFE',
    },
    coppaTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: '#1E40AF',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 8,
    },
    coppaText: {
      fontSize: 13,
      color: '#1D4ED8',
      fontWeight: '500',
      lineHeight: 20,
    },
    checkRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 20,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
      flexShrink: 0,
    },
    checkboxChecked: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    checkmark: { color: '#fff', fontSize: 14, fontWeight: '900' },
    checkLabel: {
      flex: 1,
      fontSize: 14,
      color: colors.text1,
      fontWeight: '600',
      lineHeight: 20,
    },
    acceptBtn: {
      backgroundColor: colors.primary,
      borderRadius: 100,
      paddingVertical: 17,
      alignItems: 'center',
      ...shadows.md,
    },
    acceptBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  });

  return (
    <ScrollView
      contentContainerStyle={consentStyles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <Text style={consentStyles.shield}>🛡️</Text>
      <Text style={consentStyles.title}>{t('setup.privacyTitle')}</Text>
      <Text style={consentStyles.sub}>
        {t('setup.privacySub')}
      </Text>

      <View style={consentStyles.card}>
        <Text style={consentStyles.cardTitle}>{t('setup.whatWeCollect')}</Text>
        {[
          ['👤', 'Parent & kid first names or nicknames'],
          ['✅', 'Chore completion records and star counts'],
          ['📱', 'Optional phone numbers for notifications'],
          ['🔒', 'Hashed PIN (never stored in plain text)'],
        ].map(([icon, text]) => (
          <View key={text} style={consentStyles.bullet}>
            <Text style={consentStyles.bulletIcon}>{icon}</Text>
            <Text style={consentStyles.bulletText}>{text}</Text>
          </View>
        ))}
      </View>

      <View style={consentStyles.card}>
        <Text style={consentStyles.cardTitle}>{t('setup.howWeProtect')}</Text>
        {[
          ['🔐', 'PIN is SHA-256 hashed before storage'],
          ['📴', 'No ads, no third-party tracking, no data selling'],
          ['👨‍👩‍👧', "Children's data used only within your family"],
          ['🗑️', 'Delete all data anytime in Parent Settings'],
        ].map(([icon, text]) => (
          <View key={text} style={consentStyles.bullet}>
            <Text style={consentStyles.bulletIcon}>{icon}</Text>
            <Text style={consentStyles.bulletText}>{text}</Text>
          </View>
        ))}
      </View>

      <View style={consentStyles.coppaNote}>
        <Text style={consentStyles.coppaTitle}>{t('setup.coppaNotice')}</Text>
        <Text style={consentStyles.coppaText}>
          Kindo is designed for family use and may be used by children under 13
          under parental supervision. As the parent or guardian setting up this
          account, you are providing consent for your child's limited information
          (name, chore data) to be stored on this device and, if enabled, in our
          secure cloud database.
        </Text>
      </View>

      {/* Checkbox */}
      <TouchableOpacity
        style={consentStyles.checkRow}
        onPress={() => setChecked(c => !c)}
        activeOpacity={0.7}
      >
        <View style={[consentStyles.checkbox, checked && consentStyles.checkboxChecked]}>
          {checked && <Text style={consentStyles.checkmark}>✓</Text>}
        </View>
        <Text style={consentStyles.checkLabel}>
          {t('setup.consentCheck')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[consentStyles.acceptBtn, !checked && { opacity: 0.4 }]}
        onPress={checked ? onAccept : undefined}
        activeOpacity={checked ? 0.85 : 1}
        disabled={!checked}
      >
        <Text style={consentStyles.acceptBtnText}>{t('setup.setupMyFamily')}</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── Main SetupScreen ──────────────────────────────────────────────────────────
export default function SetupScreen() {
  const { setupFamily, family } = useApp();
  const { colors, shadows, isDark } = useTheme();
  const { t } = useTranslation();
  const { isTablet, fs, pad, contentWidth } = useDevice();
  const [consentGiven, setConsentGiven] = useState(false);
  const [step, setStep]       = useState(1);
  const [saving, setSaving]   = useState(false);
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
    setSaving(true);
    try {
      await setupFamily({
        parentName: parentName.trim(),
        parentPhone: parentPhone.trim(),
        parentPin,
        parentEmoji,
        kids,
      });
    } catch (e) {
      setSaving(false);
      Alert.alert('Setup failed', e?.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surface },

    // Header
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: pad,
      paddingTop: 12,
      paddingBottom: 12,
    },
    logoText: {
      fontSize: fs(20, 24),
      fontWeight: '800',
      color: colors.text1,
      letterSpacing: -0.3,
    },
    stepBadge: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text3,
      backgroundColor: colors.divider,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 100,
    },

    // Progress bar
    progressTrack: {
      height: 3,
      backgroundColor: colors.divider,
      overflow: 'hidden',
    },
    progressFill: {
      height: 3,
      backgroundColor: colors.primary,
      borderRadius: 2,
    },

    // Scroll
    scroll: {
      paddingHorizontal: isTablet ? pad : 24,
      paddingBottom: 60,
      alignItems: isTablet ? 'center' : undefined,
    },
    scrollInner: {
      width: '100%',
      maxWidth: isTablet ? 600 : undefined,
    },

    // Step content
    stepContent: { paddingTop: isTablet ? 48 : 32 },
    stepTitle: {
      fontSize: fs(32, 40),
      fontWeight: '800',
      color: colors.text1,
      letterSpacing: -0.6,
      lineHeight: isTablet ? 50 : 40,
      marginBottom: 8,
    },
    stepSub: {
      fontSize: fs(15, 17),
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
      backgroundColor: colors.bg,
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
      backgroundColor: colors.bg,
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
      backgroundColor: colors.bg,
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

    // Label row helper
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
  });

  // ─── Consent gate ──────────────────────────────────────────────────────────
  if (!consentGiven) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />
        <SafeAreaView style={{ backgroundColor: colors.surface }}>
          <View style={styles.header}>
            <Text style={styles.logoText}>🌟 {t('appName')}</Text>
            <Text style={styles.stepBadge}>{t('privacy')}</Text>
          </View>
        </SafeAreaView>
        <ConsentScreen onAccept={() => setConsentGiven(true)} colors={colors} shadows={shadows} t={t} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />

      <SafeAreaView style={{ backgroundColor: colors.surface }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logoText}>🌟 {t('appName')}</Text>
          <Text style={styles.stepBadge}>{t('setup.step', { step })}</Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets={true}
      >
        <View style={styles.scrollInner}>
        {step === 1 ? (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{t('setup.title')}</Text>
            <Text style={styles.stepSub}>{t('setup.subtitle')}</Text>

            {/* Emoji picker */}
            <View style={styles.labelRow}>
              <Text style={styles.label}>{t('setup.avatar')}</Text>
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
              label={t('setup.yourName')}
              placeholder={t('setup.namePlaceholder')}
              value={parentName}
              onChangeText={setParentName}
              returnKeyType="next"
              colors={colors}
              t={t}
            />

            <Field
              label={t('setup.phone')}
              optional
              placeholder={t('setup.phonePlaceholder')}
              value={parentPhone}
              onChangeText={setParentPhone}
              keyboardType="phone-pad"
              colors={colors}
              t={t}
            />

            <Field
              label={t('setup.secretPin')}
              hint={t('setup.pinHint')}
              placeholder={t('setup.pinPlaceholder')}
              value={parentPin}
              onChangeText={txt => setParentPin(txt.replace(/\D/g, '').slice(0, 4))}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              colors={colors}
              t={t}
            />

            <TouchableOpacity style={styles.primaryBtn} onPress={goToStep2} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>{t('setup.continue')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{t('setup.addKids')}</Text>
            <Text style={styles.stepSub}>{t('setup.addKidsSub')}</Text>

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
                {kids.length === 0 ? t('setup.addFirstKid') : t('setup.addAnotherKid')}
              </Text>

              <Field
                label={t('setup.kidName')}
                placeholder={t('setup.kidNamePlaceholder')}
                value={kidName}
                onChangeText={setKidName}
                returnKeyType="done"
                colors={colors}
                t={t}
              />

              <Field
                label={t('setup.phone')}
                optional
                placeholder={t('setup.kidPhonePlaceholder')}
                value={kidPhone}
                onChangeText={setKidPhone}
                keyboardType="phone-pad"
                colors={colors}
                t={t}
              />

              {/* Emoji row */}
              <View style={[styles.labelRow, { marginTop: 20 }]}>
                <Text style={styles.label}>{t('setup.emoji')}</Text>
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
              <View style={[styles.labelRow, { marginTop: 18 }]}>
                <Text style={styles.label}>{t('setup.color')}</Text>
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

              <TouchableOpacity style={styles.addKidBtn} onPress={addKid} activeOpacity={0.85}>
                <Text style={styles.addKidBtnText}>{t('setup.addKid')}</Text>
              </TouchableOpacity>
            </View>

            {kids.length > 0 && (
              <TouchableOpacity
                style={[styles.primaryBtn, saving && { opacity: 0.7 }]}
                onPress={handleFinish}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.primaryBtnText}>{t('setup.letsGo')}</Text>
                }
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={goBack} style={styles.backLink}>
              <Text style={styles.backLinkText}>{t('setup.backToParent')}</Text>
            </TouchableOpacity>
          </View>
        )}
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
