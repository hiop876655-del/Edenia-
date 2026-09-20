import { db } from './db';
import { LicenseState } from '../types';

export interface RemainingTimeFormatted {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  formattedArabic: string;
  isExpired: boolean;
}

class LicenseManager {
  private lastSavedAnchor: number = 0;

  constructor() {
    try {
      this.lastSavedAnchor = Number(localStorage.getItem('idenia_hisba_time_anchor_v1') || 0);
    } catch {
      this.lastSavedAnchor = 0;
    }
  }

  // Format countdown string in Arabic
  public calculateRemaining(license: LicenseState | null): RemainingTimeFormatted {
    if (!license || !license.isValid) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        formattedArabic: 'انتهى الاشتراك',
        isExpired: true
      };
    }

    const now = Date.now();

    // Tamper Protection check:
    if (this.lastSavedAnchor > 0 && now < (this.lastSavedAnchor - 300000)) {
      console.warn('Clock tamper detected: System time rolled backwards.');
    }

    // Update time anchor
    if (now > this.lastSavedAnchor) {
      this.lastSavedAnchor = now;
      try { localStorage.setItem('idenia_hisba_time_anchor_v1', String(now)); } catch {}
    }

    const diffMs = license.expiresAt - now;

    if (diffMs <= 0) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        formattedArabic: 'انتهى الاشتراك',
        isExpired: true
      };
    }

    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days} يوم`);
    parts.push(`${hours} ساعة`);
    parts.push(`${minutes} دقيقة`);
    parts.push(`${seconds} ثانية`);

    return {
      days,
      hours,
      minutes,
      seconds,
      formattedArabic: `فاضل: ${parts.join(' - ')}`,
      isExpired: false
    };
  }

  public getRemainingDays(license: LicenseState | null): number {
    if (!license || !license.isValid) return 0;
    const diffMs = license.expiresAt - Date.now();
    if (diffMs <= 0) return 0;
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  public periodicCheck(): { isValid: boolean; reason?: 'expired' | 'tampered' | 'ok' } {
    const license = db.getLicense();
    if (!license || !license.isValid) {
      return { isValid: false, reason: 'expired' };
    }

    const now = Date.now();
    if (now >= license.expiresAt) {
      return { isValid: false, reason: 'expired' };
    }

    if (this.lastSavedAnchor > 0 && now < (this.lastSavedAnchor - 300000)) {
      return { isValid: false, reason: 'tampered' };
    }

    if (now > this.lastSavedAnchor) {
      this.lastSavedAnchor = now;
      localStorage.setItem('idenia_hisba_time_anchor_v1', String(now));
    }

    return { isValid: true, reason: 'ok' };
  }

  // Format code display with grouping (e.g. XXXX-XXXX-XXXX-XXXX)
  public formatCodeInput(value: string): string {
    const clean = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 16);
    const parts = clean.match(/.{1,4}/g);
    return parts ? parts.join('-') : clean;
  }
}

export const licenseManager = new LicenseManager();
