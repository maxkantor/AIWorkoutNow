const DEVICE_ID_KEY = 'aiworkoutnow_device_id';
const DEVICE_ID_COOKIE = 'aiworkoutnow_device_id';
const WORKOUTS_KEY = 'aiworkoutnow_workouts';
const TOKENS_KEY = 'aiworkoutnow_tokens';
const FREE_TRIAL_KEY = 'aiworkoutnow_free_trial';

// Cookie utilities for device ID persistence (fallback when localStorage is cleared)
function setCookie(name: string, value: string, days: number = 365): void {
  try {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
  } catch (e) {
    // Cookie setting failed (e.g., in some privacy modes) - silently fail
    console.warn('[storage] Failed to set cookie:', e);
  }
}

function getCookie(name: string): string | null {
  try {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
  } catch (e) {
    // Cookie reading failed - silently fail
    console.warn('[storage] Failed to read cookie:', e);
  }
  return null;
}

export function getDeviceId(): string {
  // Try localStorage first (preferred)
  let deviceId: string | null = null;
  try {
    deviceId = localStorage.getItem(DEVICE_ID_KEY);
  } catch (e) {
    console.warn('[storage] localStorage access failed, trying cookie:', e);
  }

  // Fallback to cookie if localStorage is empty or unavailable
  if (!deviceId) {
    deviceId = getCookie(DEVICE_ID_COOKIE);
    // If found in cookie but not in localStorage, sync it to localStorage
    if (deviceId) {
      try {
        localStorage.setItem(DEVICE_ID_KEY, deviceId);
      } catch (e) {
        console.warn('[storage] Failed to sync cookie to localStorage:', e);
      }
    }
  }

  // Generate new device ID if neither localStorage nor cookie has it
  if (!deviceId) {
    deviceId = generateDeviceId();
    // Save to both localStorage and cookie for redundancy
    try {
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    } catch (e) {
      console.warn('[storage] Failed to save to localStorage:', e);
    }
    setCookie(DEVICE_ID_COOKIE, deviceId, 365); // 1 year expiration
  } else {
    // Ensure cookie is also set (in case it was missing)
    setCookie(DEVICE_ID_COOKIE, deviceId, 365);
  }

  return deviceId;
}

export function setDeviceId(deviceId: string) {
  if (!deviceId) return;
  
  // Save to both localStorage and cookie for redundancy
  try {
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  } catch (e) {
    console.warn('[storage] Failed to save to localStorage:', e);
  }
  setCookie(DEVICE_ID_COOKIE, deviceId, 365); // 1 year expiration
}

function generateDeviceId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `device_${timestamp}_${random}`;
}

export function saveWorkout(deviceId: string, workout: any) {
  const workouts = getStoredWorkouts(deviceId);
  const workoutWithId = {
    ...workout,
    workoutId: workout.workoutId || `workout_${Date.now()}`,
    createdAt: workout.createdAt || new Date().toISOString(),
  };
  workouts.push(workoutWithId);
  localStorage.setItem(`${WORKOUTS_KEY}_${deviceId}`, JSON.stringify(workouts));
  return workoutWithId;
}

export function getStoredWorkouts(deviceId: string): any[] {
  const stored = localStorage.getItem(`${WORKOUTS_KEY}_${deviceId}`);
  return stored ? JSON.parse(stored) : [];
}

export function getTokenBalance(deviceId: string): number | null {
  const stored = localStorage.getItem(`${TOKENS_KEY}_${deviceId}`);
  if (!stored) return null;
  const data = JSON.parse(stored);
  // Check if tokens expired
  if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
    localStorage.removeItem(`${TOKENS_KEY}_${deviceId}`);
    return null;
  }
  return data.tokensRemaining || 0;
}

export function setTokenBalance(deviceId: string, tokens: number, expiresAt?: string) {
  const data = {
    tokensRemaining: tokens,
    expiresAt: expiresAt || null,
  };
  localStorage.setItem(`${TOKENS_KEY}_${deviceId}`, JSON.stringify(data));
}

export function getFreeTrialStatus(deviceId: string): { used: boolean; expiresAt: string | null } {
  const stored = localStorage.getItem(`${FREE_TRIAL_KEY}_${deviceId}`);
  if (!stored) {
    return { used: false, expiresAt: null };
  }
  const data = JSON.parse(stored);
  if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
    localStorage.removeItem(`${FREE_TRIAL_KEY}_${deviceId}`);
    return { used: false, expiresAt: null };
  }
  return { used: data.used || false, expiresAt: data.expiresAt || null };
}

export function setFreeTrialUsed(deviceId: string, expiresAt: string) {
  const data = {
    used: true,
    expiresAt,
  };
  localStorage.setItem(`${FREE_TRIAL_KEY}_${deviceId}`, JSON.stringify(data));
}


