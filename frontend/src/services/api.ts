const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'https://api.aiworkoutnow.com';

export interface WorkoutPreferences {
  fitnessLevel: string;
  workoutType: string;
  duration: number;
  equipment: string;
  injuries: string[];
  goals: string[];
}

export interface ProductRecommendation {
  asin: string;
  title: string;
  description?: string;
  imageUrl?: string;
  price?: string;
  affiliateLink: string;
  category: string;
  reason?: string;
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
  productRecommendations?: ProductRecommendation[];
  createdAt: string;
  tokensRemaining?: number;
}

export async function generateWorkout(
  preferences: WorkoutPreferences,
  deviceId: string,
  isFreeUser: boolean
): Promise<WorkoutResponse> {
  try {
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
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Connection failed. Please check your internet connection and try again.');
    }
    throw error;
  }
}

export async function checkTokenBalance(deviceId: string): Promise<number> {
  try {
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
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Connection failed. Please check your internet connection.');
    }
    throw error;
  }
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

export async function trackAffiliateClick(
  deviceId: string,
  asin: string,
  workoutId: string,
  linkText?: string
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/track-affiliate-click`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      deviceId,
      asin,
      workoutId,
      linkText,
    }),
  });

  if (!response.ok) {
    // Don't throw error - tracking failures shouldn't break the UI
    console.error('Failed to track affiliate click');
  }
}

// Pricing Plans API
export interface PricingPlan {
  planId: string;
  name: string;
  price: number;
  currency: string;
  tokenCount?: number;
  isUnlimited: boolean;
  unlimitedDays?: number;
  displayOrder: number;
  isRecommended: boolean;
  badgeText?: string;
  microCopy?: string;
  isActive: boolean;
  stripePriceId: string;
}

export interface UserAccessStatus {
  hasFreeAccess: boolean;
  freeWorkoutsRemaining: number;
  hasUnlimitedAccess: boolean;
  unlimitedExpiresAt?: string;
  hasTokenAccess: boolean;
  tokensRemaining: number;
  canGenerateWorkout: boolean;
}

export async function getPricingPlans(): Promise<PricingPlan[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/pricing-plans`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch pricing plans');
    }

    return response.json();
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Connection failed. Please check your internet connection.');
    }
    throw error;
  }
}

export async function getFreeWorkoutsRemaining(deviceId: string): Promise<{ remaining: number; totalUsed: number }> {
  try {
    const response = await fetch(`${API_BASE_URL}/free-workouts-remaining?deviceId=${deviceId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get free workouts');
    }

    return response.json();
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Connection failed. Please check your internet connection.');
    }
    throw error;
  }
}

export async function getUserAccessStatus(deviceId: string): Promise<UserAccessStatus> {
  try {
    const response = await fetch(`${API_BASE_URL}/user-access-status?deviceId=${deviceId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get access status');
    }

    return response.json();
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Connection failed. Please check your internet connection.');
    }
    throw error;
  }
}

export async function createCheckoutSession(deviceId: string, planId: string): Promise<{ sessionId: string; url: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ deviceId, planId }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to create checkout session' }));
      throw new Error(error.message || 'Failed to create checkout session');
    }

    return response.json();
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Connection failed. Please check your internet connection and try again.');
    }
    throw error;
  }
}