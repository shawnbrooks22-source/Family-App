/**
 * SubscriptionContext — Kindo freemium model
 *
 * Free tier:   1 kid, basic quest tracking
 * Premium:     unlimited kids + cash rewards + priority support
 *
 * Uses AsyncStorage to persist subscription state locally.
 * When a real IAP backend (RevenueCat, Stripe, etc.) is wired up,
 * replace the `purchasePremium` stub with a real purchase flow.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUB_KEY = '@kindo_subscription';

const SubscriptionContext = createContext(null);

// Plan definitions
export const PLANS = {
  free: {
    id:          'free',
    name:        'Free',
    maxKids:     1,
    cashRewards: false,
    price:       '$0',
  },
  premium: {
    id:          'premium',
    name:        'Premium',
    maxKids:     Infinity,
    cashRewards: true,
    price:       '$4.99/mo',
  },
};

export function SubscriptionProvider({ children }) {
  const [plan,     setPlan]     = useState('free');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(SUB_KEY)
      .then(raw => {
        if (raw) {
          try {
            const stored = JSON.parse(raw);
            if (stored?.plan && PLANS[stored.plan]) setPlan(stored.plan);
          } catch { /* corrupt entry — stay on free */ }
        }
      })
      .catch(() => {})
      .finally(() => setIsLoaded(true));
  }, []);

  async function purchasePremium() {
    // TODO: replace with real IAP (RevenueCat / Stripe) purchase flow.
    // For now, immediately upgrade (useful for testing / demo builds).
    await AsyncStorage.setItem(SUB_KEY, JSON.stringify({ plan: 'premium' }));
    setPlan('premium');
  }

  async function restorePurchases() {
    // TODO: call RevenueCat/StoreKit restore here.
    // Returns true if a premium entitlement was found.
    return false;
  }

  async function downgradeToFree() {
    await AsyncStorage.setItem(SUB_KEY, JSON.stringify({ plan: 'free' }));
    setPlan('free');
  }

  const isPremium   = plan === 'premium';
  const currentPlan = PLANS[plan];

  // Feature gate helpers
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
