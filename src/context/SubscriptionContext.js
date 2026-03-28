/**
 * SubscriptionContext — Kindo freemium model with real In-App Purchase
 *
 * Free tier:   1 kid, basic quest tracking
 * Premium:     unlimited kids + cash rewards + priority support ($4.99/mo)
 *
 * Uses react-native-iap for Apple StoreKit (iOS) and Google Play Billing (Android).
 *
 * ─── SETUP (before submitting to App Stores) ──────────────────────────────────
 * 1. iOS — App Store Connect:
 *    a. Create an Auto-Renewable Subscription group called "Kindo Premium"
 *    b. Add a product with ID: "kindo_premium_monthly"
 *    c. Set price to $4.99/month
 *    d. Add a subscription group display name and a localization
 *    e. Submit for review (Apple reviews IAP separately from the app)
 *
 * 2. Android — Google Play Console:
 *    a. Go to Monetize → Subscriptions → Create subscription
 *    b. Product ID: "kindo_premium_monthly"
 *    c. Set price to $4.99/month
 *    d. Activate the subscription
 *
 * 3. Update PRODUCT_ID below if you use a different ID.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert } from 'react-native';

const SUB_KEY = '@kindo_subscription';

// ── Product ID (must match exactly what you create in App Store Connect / Google Play)
const PRODUCT_ID = 'kindo_premium_monthly';

// ── Plan definitions
export const PLANS = {
  free: {
    id:          'free',
    name:        'Free',
    maxKids:     1,
    cashRewards: false,
    price:       '$0',
    description: 'Track 1 kid\'s quests',
  },
  premium: {
    id:          'premium',
    name:        'Premium',
    maxKids:     Infinity,
    cashRewards: true,
    price:       '$4.99/mo',
    description: 'Unlimited kids + real money rewards',
  },
};

// ── Lazy-load react-native-iap so the app doesn't crash if it's not installed yet
let IAP = null;
try { IAP = require('react-native-iap'); } catch { /* not installed */ }

const SubscriptionContext = createContext(null);

export function SubscriptionProvider({ children }) {
  const [plan,       setPlan]       = useState('free');
  const [isLoaded,   setIsLoaded]   = useState(false);
  const [iapReady,   setIapReady]   = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [products,   setProducts]   = useState([]);   // store product info (price string, etc.)
  const purchaseListener  = useRef(null);
  const errorListener     = useRef(null);

  useEffect(() => {
    initSubscription();
    return () => {
      // Clean up IAP connection and listeners on unmount
      purchaseListener.current?.remove?.();
      errorListener.current?.remove?.();
      IAP?.endConnection?.();
    };
  }, []);

  async function initSubscription() {
    // 1. Load cached plan immediately so UI isn't blocked
    try {
      const raw = await AsyncStorage.getItem(SUB_KEY);
      if (raw) {
        const stored = JSON.parse(raw);
        if (stored?.plan && PLANS[stored.plan]) setPlan(stored.plan);
      }
    } catch { /* corrupt entry — stay on free */ }

    // 2. Connect to the App Store / Play Store
    if (!IAP) {
      setIsLoaded(true);
      return; // react-native-iap not installed yet — dev mode only
    }

    try {
      await IAP.initConnection();
      setIapReady(true);

      // 3. Listen for incoming purchases (handles async purchase completions)
      purchaseListener.current = IAP.purchaseUpdatedListener(async (purchase) => {
        if (purchase?.transactionReceipt || purchase?.purchaseToken) {
          await handleSuccessfulPurchase(purchase);
        }
      });

      errorListener.current = IAP.purchaseErrorListener((error) => {
        if (error?.code !== 'E_USER_CANCELLED') {
          if (__DEV__) console.warn('IAP purchase error:', error);
        }
        setPurchasing(false);
      });

      // 4. Fetch product info from store (price string, description, etc.)
      try {
        const subs = await IAP.getSubscriptions({ skus: [PRODUCT_ID] });
        setProducts(subs || []);
      } catch { /* product not yet created in store — ignore */ }

      // 5. Silently restore any existing subscription
      await syncWithStore(false);
    } catch (e) {
      if (__DEV__) console.warn('IAP init failed (normal in simulator):', e);
    } finally {
      setIsLoaded(true);
    }
  }

  /** Check the store for active subscriptions and sync local plan state. */
  async function syncWithStore(showFeedback = true) {
    if (!IAP || !iapReady) return false;
    try {
      const purchases = await IAP.getAvailablePurchases();
      const hasPremium = purchases?.some(p => p.productId === PRODUCT_ID);
      if (hasPremium) {
        await persistPlan('premium');
        return true;
      } else {
        // No active subscription found — downgrade if currently premium
        await persistPlan('free');
        return false;
      }
    } catch (e) {
      if (__DEV__) console.warn('IAP sync failed:', e);
      return false;
    }
  }

  /** Called by the purchase listener when a transaction comes in. */
  async function handleSuccessfulPurchase(purchase) {
    try {
      // Acknowledge the purchase (required — otherwise it refunds after 3 days on Android)
      await IAP.finishTransaction({ purchase, isConsumable: false });
      await persistPlan('premium');
    } catch (e) {
      if (__DEV__) console.warn('Failed to finish transaction:', e);
    } finally {
      setPurchasing(false);
    }
  }

  async function persistPlan(newPlan) {
    await AsyncStorage.setItem(SUB_KEY, JSON.stringify({ plan: newPlan }));
    setPlan(newPlan);
  }

  /** Trigger the native purchase sheet. */
  async function purchasePremium() {
    if (!IAP) {
      // Dev fallback: immediately upgrade (simulator / before IAP is set up in stores)
      Alert.alert(
        'Dev mode',
        'IAP not connected to store. Upgrading locally for testing.',
        [{ text: 'OK', onPress: () => persistPlan('premium') }]
      );
      return;
    }
    if (!iapReady) throw new Error('Store is not ready. Please try again in a moment.');
    if (products.length === 0) throw new Error('Subscription product not found in the store. Please check your App Store Connect / Google Play setup.');

    setPurchasing(true);
    try {
      if (Platform.OS === 'android') {
        await IAP.requestSubscription({ sku: PRODUCT_ID });
      } else {
        await IAP.requestSubscription({ sku: PRODUCT_ID });
      }
      // Result comes via purchaseUpdatedListener — don't await here
    } catch (e) {
      setPurchasing(false);
      if (e?.code !== 'E_USER_CANCELLED') throw e;
    }
  }

  /** Restore purchases — called from Settings "Restore Purchases" button. */
  async function restorePurchases() {
    if (!IAP || !iapReady) return false;
    const found = await syncWithStore(true);
    return found;
  }

  async function downgradeToFree() {
    await persistPlan('free');
  }

  const isPremium   = plan === 'premium';
  const currentPlan = PLANS[plan];

  // The live price string from the store (e.g. "$4.99/month"), or fallback
  const premiumPriceString = products[0]?.localizedPrice
    ? `${products[0].localizedPrice}/mo`
    : PLANS.premium.price;

  function canAddKid(currentKidCount) {
    return currentKidCount < currentPlan.maxKids;
  }

  return (
    <SubscriptionContext.Provider
      value={{
        plan,
        isPremium,
        currentPlan,
        isLoaded,
        iapReady,
        purchasing,
        premiumPriceString,
        canAddKid,
        purchasePremium,
        restorePurchases,
        downgradeToFree,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
