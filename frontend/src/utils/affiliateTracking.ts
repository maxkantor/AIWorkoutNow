/**
 * GA4 affiliate click tracking.
 * Fires "affiliate_click" event when user clicks an affiliate link.
 */

export interface AffiliateClickPayload {
  provider: 'amazon';
  itemTitle: string;
  category: string;
  placement: 'post_workout';
  workoutType: string;
  equipmentAvailable: string;
}

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

export function trackAffiliateClickGA4(payload: AffiliateClickPayload): void {
  if (typeof window === 'undefined' || !window.gtag) return;
  try {
    window.gtag('event', 'affiliate_click', payload);
  } catch {
    // Silently ignore tracking errors
  }
}
