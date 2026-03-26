import { Platform, useWindowDimensions } from 'react-native';

/**
 * Returns device-type helpers so every screen can adapt its layout.
 *
 * isTablet  – true on iPad (iOS) or any Android/web screen ≥ 768 dp wide
 * isPhone   – convenience inverse of isTablet
 * width / height – live dimensions (update on rotation)
 * hp(pct)   – percentage of screen height  (e.g. hp(5) = 5% of height)
 * wp(pct)   – percentage of screen width
 * fs(phone, tablet) – pick the right font size for the current device
 * pad       – standard horizontal page padding scaled to the screen
 * contentWidth – max usable content width (capped on tablets so text
 *               doesn't span the full 12.9" width)
 */
export default function useDevice() {
  const { width, height } = useWindowDimensions();

  // Platform.isPad covers all iPads on iOS.
  // For Android tablets / large phones we fall back to a 768dp threshold.
  const isTablet = Platform.isPad === true || width >= 768;
  const isPhone  = !isTablet;

  const hp = (pct) => (height * pct) / 100;
  const wp = (pct) => (width  * pct) / 100;

  // Font size helper: pass phone size, tablet size (optional – defaults to phone+4)
  const fs = (phoneSize, tabletSize) =>
    isTablet ? (tabletSize ?? phoneSize + 4) : phoneSize;

  // Standard horizontal padding
  const pad = isTablet ? 48 : 24;

  // Max readable content width – on a 12.9" iPad 680px looks intentional;
  // on a phone it's just the full width.
  const contentWidth = isTablet ? Math.min(width - pad * 2, 680) : width - pad * 2;

  // Modal width – centred on tablet, full-width on phone
  const modalWidth = isTablet ? Math.min(520, width * 0.72) : '100%';

  return {
    isTablet,
    isPhone,
    width,
    height,
    hp,
    wp,
    fs,
    pad,
    contentWidth,
    modalWidth,
  };
}
