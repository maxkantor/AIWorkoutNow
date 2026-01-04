const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'https://api.aiworkoutnow.com';

export interface WorkoutPreferences {
  fitnessLevel: string;
  workoutType: string;
  duration: number;
  equipment: string;
  injuries: string[];
  goals: string[];
}

export interface WorkoutResponse {
  workoutId: string;
  title: string;
  description?: string;
  type: string;
  exercises: Array<{
    name: string;
    sets?: number;
    reps?: number;
    duration?: string;
    instructions?: string;
    rest?: string;
  }>;
  tips?: string[];
  createdAt: string;
  tokensRemaining?: number;
}

export async function generateWorkout(
  preferences: WorkoutPreferences,
  deviceId: string,
  isFreeUser: boolean
): Promise<WorkoutResponse> {
  const response = await fetch(`${API_BASE_URL}/generate-workout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...preferences,
      deviceId,
      isFreeUser,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to generate workout' }));
    throw new Error(error.message || 'Failed to generate workout');
  }

  return response.json();
}

export async function checkTokenBalance(deviceId: string): Promise<number> {
  const response = await fetch(`${API_BASE_URL}/token-balance?deviceId=${deviceId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to check token balance');
  }

  const data = await response.json();
  return data.tokensRemaining || 0;
}

export async function submitContact(email: string, message: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/contact`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, message }),
  });

  if (!response.ok) {
    throw new Error('Failed to submit contact form');
  }
}

export async function adminLogin(email: string, password: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/admin/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Login failed' }));
    throw new Error(error.message || 'Login failed');
  }

  const data = await response.json();
  return data.token;
}

export async function getAdminStats(token: string) {
  const response = await fetch(`${API_BASE_URL}/admin/stats`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch admin stats');
  }

  return response.json();
}

