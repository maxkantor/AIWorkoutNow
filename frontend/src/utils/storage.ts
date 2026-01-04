const DEVICE_ID_KEY = 'aiworkoutnow_device_id';
const WORKOUTS_KEY = 'aiworkoutnow_workouts';
const TOKENS_KEY = 'aiworkoutnow_tokens';
const FREE_TRIAL_KEY = 'aiworkoutnow_free_trial';

export function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = generateDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
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

