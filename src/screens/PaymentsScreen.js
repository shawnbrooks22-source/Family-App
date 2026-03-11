/**
 * PaymentsScreen — Real money rewards for kids
 *
 * ─── SETUP ───────────────────────────────────────────────────────────────────
 * 1. Create a Stripe account at https://stripe.com
 * 2. Deploy the stripe-setup and stripe-charge Edge Functions (see those files)
 * 3. In your .env file:
 *      EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY = pk_test_...  (or pk_live_...)
 *      EXPO_PUBLIC_SUPABASE_STRIPE_SETUP  = https://<project>.supabase.co/functions/v1/stripe-setup
 *      EXPO_PUBLIC_SUPABASE_STRIPE_CHARGE = https://<project>.supabase.co/functions/v1/stripe-charge
 * 4. Run: npx expo install react-native-webview
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

// Lazy-load WebView to avoid crashes when react-native-webview isn't installed
let WebView = null;
try { WebView = require('react-native-webview').WebView; } catch {}

const STRIPE_PK    = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
const STRIPE_READY = !!(STRIPE_PK && !STRIPE_PK.includes('pk_') === false && STRIPE_PK.startsWith('pk_'));

function buildCardHTML(publishableKey) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <script src="https://js.stripe.com/v3/"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { padding: 24px 20px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #fff; }
    h3 { font-size: 18px; font-weight: 700; color: #1a202c; margin-bottom: 20px; }
    label { display: block; font-size: 12px; font-weight: 700; color: #64748b; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 8px; }
    #card-element { border: 2px solid #e2e8f0; border-radius: 12px; padding: 16px; background: #f8fafc; }
    #card-element.focused { border-color: #7C3AED; }
    .error { color: #ef4444; font-size: 14px; margin-top: 10px; min-height: 20px; }
    button {
      background: #7C3AED; color: white; border: none; border-radius: 100px;
      padding: 16px; font-size: 17px; font-weight: 700; width: 100%;
      cursor: pointer; margin-top: 20px;
    }
    button:disabled { opacity: 0.5; }
    .secure { display: flex; align-items: center; gap: 6px; margin-top: 14px; justify-content: center; }
    .secure span { font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <h3>Add Payment Method</h3>
  <label>Card Details</label>
  <div id="card-element"></div>
  <div class="error" id="card-error"></div>
  <button id="save-btn">Save Card Securely</button>
  <div class="secure">
    <span>🔒 Secured by Stripe — Kindo never sees your card number</span>
  </div>
  <script>
    const stripe = Stripe('${publishableKey}');
    const elements = stripe.elements();
    const cardEl = elements.create('card', {
      style: { base: { fontSize: '16px', color: '#1a202c', fontFamily: '-apple-system, sans-serif', '::placeholder': { color: '#94a3b8' } } }
    });
    cardEl.mount('#card-element');
    cardEl.on('focus',  () => document.getElementById('card-element').classList.add('focused'));
    cardEl.on('blur',   () => document.getElementById('card-element').classList.remove('focused'));

    document.getElementById('save-btn').addEventListener('click', async function() {
      const btn = this;
      btn.disabled = true;
      btn.textContent = 'Saving…';
      document.getElementById('card-error').textContent = '';
      const { paymentMethod, error } = await stripe.createPaymentMethod({ type: 'card', card: cardEl });
      if (error) {
        document.getElementById('card-error').textContent = error.message;
        btn.disabled = false;
        btn.textContent = 'Save Card Securely';
      } else {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'success',
          paymentMethodId: paymentMethod.id,
          last4: paymentMethod.card.last4,
          brand: paymentMethod.card.brand,
        }));
      }
    });
  </script>
</body>
</html>`;
}

function formatCents(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

function getBrandIcon(brand) {
  const icons = { visa: '💳', mastercard: '💳', amex: '💳', discover: '💳' };
  return icons[brand?.toLowerCase()] || '💳';
}

export default function PaymentsScreen({ navigation }) {
  const { family, familyId, setupPaymentMethod, recordPayout, transactions, loadTransactions } = useApp();
  const { colors, shadows, isDark } = useTheme();
  const { t } = useTranslation();

  const [showCardModal, setShowCardModal] = useState(false);
  const [cardLoading,   setCardLoading]   = useState(false);
  const [payoutKidId,   setPayoutKidId]   = useState(null);
  const webViewRef = useRef(null);

  useEffect(() => {
    loadTransactions?.();
  }, []);

  const paymentInfo = family?.stripeCardLast4
    ? { last4: family.stripeCardLast4, brand: family.stripeCardBrand || 'card' }
    : null;

  async function handleCardSaved(paymentMethodId, last4, brand) {
    setCardLoading(true);
    try {
      await setupPaymentMethod(paymentMethodId, last4, brand);
      setShowCardModal(false);
      Alert.alert('Card Saved! 💳', `Your ${brand} ending in ${last4} is ready to pay kids.`);
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not save card. Please try again.');
    } finally {
      setCardLoading(false);
    }
  }

  async function handleRecordPayout(kid, amountCents) {
    Alert.alert(
      `Pay out to ${kid.name}?`,
      `Record that you transferred ${formatCents(amountCents)} to ${kid.name} outside the app (e.g. bank transfer, cash). This will reduce their balance.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Mark as Paid`,
          onPress: async () => {
            try {
              await recordPayout(kid.id, amountCents);
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  }

  const kidsWithBalance = (family?.kids || []).map(kid => ({
    ...kid,
    balance: kid.balance_cents || 0,
  }));

  const styles = makeStyles(colors, shadows);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#059669', '#10B981']} style={styles.header}>
        <SafeAreaView>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerEmoji}>💳</Text>
          <Text style={styles.headerTitle}>{t('payments.title')}</Text>
          <Text style={styles.headerSub}>{t('payments.subtitle')}</Text>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Not-configured notice ──────────────────────────────────────── */}
        {!STRIPE_READY && (
          <View style={[styles.noticeCard, { borderColor: '#FCD34D', backgroundColor: '#FFFBEB' }]}>
            <Text style={styles.noticeTitle}>🔑 Stripe Setup Required</Text>
            <Text style={styles.noticeText}>
              Add <Text style={{ fontWeight: '700' }}>EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY</Text> to your .env file and deploy the Stripe Edge Functions to enable real payments.{'\n\n'}
              Until then you can still see kids' balances and record manual payouts.
            </Text>
          </View>
        )}

        {/* ── Payment Method ─────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>{t('payments.paymentMethod')}</Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          {paymentInfo ? (
            <View style={styles.cardRow}>
              <View style={[styles.cardIconBox, { backgroundColor: colors.primaryLight }]}>
                <Text style={{ fontSize: 26 }}>{getBrandIcon(paymentInfo.brand)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.text1 }]}>
                  {paymentInfo.brand?.charAt(0).toUpperCase()}{paymentInfo.brand?.slice(1)} •••• {paymentInfo.last4}
                </Text>
                <Text style={[styles.cardSub, { color: colors.text3 }]}>{t('payments.savedCard')}</Text>
              </View>
              <TouchableOpacity
                style={[styles.changeBtn, { borderColor: colors.border }]}
                onPress={() => setShowCardModal(true)}
                activeOpacity={0.8}
              >
                <Text style={[styles.changeBtnText, { color: colors.primary }]}>{t('payments.change')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text style={[styles.noCardText, { color: colors.text3 }]}>
                {t('payments.noCardText')}
              </Text>
              <TouchableOpacity
                style={[styles.addCardBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  if (!STRIPE_READY) {
                    Alert.alert('Stripe not configured', 'Add your Stripe publishable key to .env to enable card payments.');
                    return;
                  }
                  if (!WebView) {
                    Alert.alert('Missing dependency', 'Run: npx expo install react-native-webview');
                    return;
                  }
                  setShowCardModal(true);
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="card-outline" size={20} color="#fff" />
                <Text style={styles.addCardBtnText}>{t('payments.addCard')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Kids' Balances ─────────────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { marginTop: 28 }]}>{t('payments.kidsBalances')}</Text>
        {kidsWithBalance.length === 0 ? (
          <View style={[styles.card, { backgroundColor: colors.surface, alignItems: 'center', paddingVertical: 24 }]}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>👧</Text>
            <Text style={[{ color: colors.text3, fontSize: 15, fontWeight: '600' }]}>No kids added yet</Text>
          </View>
        ) : (
          kidsWithBalance.map(kid => (
            <View key={kid.id} style={[styles.kidBalanceCard, { backgroundColor: colors.surface }]}>
              <View style={[styles.kidAvatar, { backgroundColor: kid.color || colors.primary }]}>
                <Text style={{ fontSize: 22 }}>{kid.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.kidName, { color: colors.text1 }]}>{kid.name}</Text>
                <Text style={[styles.kidBalance, { color: '#059669' }]}>
                  {formatCents(kid.balance)} {t('payments.earned')}
                </Text>
              </View>
              {kid.balance > 0 && (
                <TouchableOpacity
                  style={[styles.payoutBtn, { backgroundColor: '#059669' }]}
                  onPress={() => handleRecordPayout(kid, kid.balance)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.payoutBtnText}>{t('payments.payOut')}</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}

        {/* ── Transaction History ────────────────────────────────────────── */}
        {(transactions || []).length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 28 }]}>{t('payments.history')}</Text>
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              {(transactions || []).slice(0, 20).map((tx, idx) => {
                const kid = family?.kids?.find(k => k.id === tx.kid_id);
                const isPayment = tx.type === 'payment';
                return (
                  <View key={tx.id} style={[styles.txRow, idx > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
                    <Text style={{ fontSize: 20 }}>{isPayment ? '💸' : '🏦'}</Text>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.txTitle, { color: colors.text1 }]}>
                        {isPayment ? t('payments.paidTo', { name: kid?.name || '?' }) : t('payments.payoutTo', { name: kid?.name || '?' })}
                      </Text>
                      <Text style={[styles.txDate, { color: colors.text3 }]}>
                        {new Date(tx.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={[styles.txAmount, { color: isPayment ? '#059669' : colors.warning }]}>
                      {isPayment ? '+' : '-'}{formatCents(tx.amount_cents)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Stripe Card Modal ──────────────────────────────────────────────── */}
      <Modal
        visible={showCardModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCardModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.bg }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text1 }]}>Add Payment Method</Text>
            <TouchableOpacity onPress={() => setShowCardModal(false)} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={24} color={colors.text1} />
            </TouchableOpacity>
          </View>

          {cardLoading ? (
            <View style={styles.loadingCenter}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[{ color: colors.text2, marginTop: 14, fontSize: 15, fontWeight: '600' }]}>
                Saving your card…
              </Text>
            </View>
          ) : WebView && STRIPE_READY ? (
            <WebView
              ref={webViewRef}
              source={{ html: buildCardHTML(STRIPE_PK) }}
              style={{ flex: 1, backgroundColor: colors.bg }}
              onMessage={event => {
                try {
                  const msg = JSON.parse(event.nativeEvent.data);
                  if (msg.type === 'success') {
                    handleCardSaved(msg.paymentMethodId, msg.last4, msg.brand);
                  }
                } catch {}
              }}
              javaScriptEnabled
              domStorageEnabled
              originWhitelist={['*']}
            />
          ) : (
            <View style={styles.loadingCenter}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>⚠️</Text>
              <Text style={[{ color: colors.text1, fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 8 }]}>
                {!WebView ? 'WebView not installed' : 'Stripe not configured'}
              </Text>
              <Text style={[{ color: colors.text3, fontSize: 14, textAlign: 'center', lineHeight: 22 }]}>
                {!WebView
                  ? 'Run: npx expo install react-native-webview'
                  : 'Add EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY to your .env file'}
              </Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(colors, shadows) {
  return StyleSheet.create({
    container:    { flex: 1, backgroundColor: colors.bg },
    header:       { paddingBottom: 32, paddingHorizontal: 24 },
    backBtn:      { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 100, paddingVertical: 8, paddingHorizontal: 16, marginTop: 12, marginBottom: 20 },
    backBtnText:  { color: '#fff', fontSize: 15, fontWeight: '700' },
    headerEmoji:  { fontSize: 40, marginBottom: 8 },
    headerTitle:  { fontSize: 30, fontWeight: '900', color: '#fff', letterSpacing: -0.5, marginBottom: 6 },
    headerSub:    { fontSize: 15, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },

    body: { padding: 20, gap: 12 },

    sectionLabel: { fontSize: 11, fontWeight: '700', color: colors.text3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },

    card: { borderRadius: 20, padding: 18, ...shadows.sm },

    noticeCard:   { borderRadius: 16, padding: 18, borderWidth: 1.5 },
    noticeTitle:  { fontSize: 16, fontWeight: '800', color: '#92400E', marginBottom: 8 },
    noticeText:   { fontSize: 14, color: '#78350F', lineHeight: 22 },

    cardRow:     { flexDirection: 'row', alignItems: 'center', gap: 14 },
    cardIconBox: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    cardTitle:   { fontSize: 16, fontWeight: '700' },
    cardSub:     { fontSize: 13, fontWeight: '500', marginTop: 2 },
    changeBtn:   { borderWidth: 1.5, borderRadius: 100, paddingHorizontal: 14, paddingVertical: 8 },
    changeBtnText: { fontSize: 14, fontWeight: '700' },

    noCardText:   { fontSize: 14, lineHeight: 22, marginBottom: 16 },
    addCardBtn:   { borderRadius: 100, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    addCardBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

    kidBalanceCard: { borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, ...shadows.sm },
    kidAvatar:  { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
    kidName:    { fontSize: 16, fontWeight: '700' },
    kidBalance: { fontSize: 15, fontWeight: '800', marginTop: 2 },
    payoutBtn:  { borderRadius: 100, paddingHorizontal: 14, paddingVertical: 10 },
    payoutBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

    txRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
    txTitle:  { fontSize: 14, fontWeight: '600' },
    txDate:   { fontSize: 12, fontWeight: '500', marginTop: 2 },
    txAmount: { fontSize: 16, fontWeight: '800' },

    modalContainer: { flex: 1 },
    modalHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 24 },
    modalTitle:     { fontSize: 20, fontWeight: '800' },
    modalCloseBtn:  { padding: 4 },
    loadingCenter:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  });
}
