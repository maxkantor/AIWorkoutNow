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

// CRM Types
export interface CustomerSummary {
  deviceId: string;
  isPaidUser: boolean;
  tokensRemaining: number;
  totalWorkouts: number;
  totalPurchases: number;
  totalSpent: number;
  lastActivity?: string;
  freeWorkoutsUsed: number;
  email?: string;
  name?: string;
  firstSeen?: string;
}

export interface CustomerActivity {
  activityId: string;
  deviceId: string;
  timestamp: string;
  activityType: string;
  description: string;
  workoutId?: string;
  contactMessageId?: string;
  details?: Record<string, any>;
}

export interface ContactMessage {
  messageId: string;
  email: string;
  message: string;
  createdAt: string;
  status?: string;
  replies?: ContactReply[];
}

export interface ContactReply {
  replyId: string;
  messageId: string;
  adminEmail: string;
  replyMessage: string;
  repliedAt: string;
  createdAt?: string;
  sent?: boolean;
  replyText?: string;
}

export interface StripePurchase {
  purchaseId: string;
  deviceId: string;
  planId: string;
  planName: string;
  amountTotal: number;
  currency: string;
  paymentStatus: string;
  createdAt: string;
  expiresAt?: string;
  status?: string;
  amount?: number;
  customerName?: string;
  customerEmail?: string;
  packType?: string;
  tokensPurchased?: number;
  stripePaymentIntentId?: string;
}

// CRM API Functions
export async function getAllCustomers(token: string): Promise<CustomerSummary[]> {
  const response = await fetch(`${API_BASE_URL}/admin/customers`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch customers');
  }

  return response.json();
}

export async function getCustomer(token: string, deviceId: string): Promise<CustomerSummary> {
  const response = await fetch(`${API_BASE_URL}/admin/customers/${deviceId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch customer');
  }

  return response.json();
}

export async function getCustomerActivities(token: string, deviceId: string, limit?: number): Promise<CustomerActivity[]> {
  const url = limit 
    ? `${API_BASE_URL}/admin/customers/${deviceId}/activities?limit=${limit}`
    : `${API_BASE_URL}/admin/customers/${deviceId}/activities`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch customer activities');
  }

  return response.json();
}

export async function resetUserTokens(token: string, deviceId: string, newTokenCount: number, oldTokenCount?: number, reason?: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/admin/customers/${deviceId}/reset-tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ newTokenCount, reason }),
  });

  if (!response.ok) {
    throw new Error('Failed to reset user tokens');
  }
}

export async function getAllContacts(token: string): Promise<ContactMessage[]> {
  const response = await fetch(`${API_BASE_URL}/admin/contacts`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch contacts');
  }

  return response.json();
}

export async function getContact(token: string, messageId: string): Promise<{ message: ContactMessage; replies: ContactReply[] }> {
  const response = await fetch(`${API_BASE_URL}/admin/contacts/${messageId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch contact message');
  }

  return response.json();
}

export async function replyToContact(token: string, messageId: string, replyMessage: string, adminEmail?: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/admin/contacts/${messageId}/reply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ replyMessage, adminEmail: adminEmail || 'admin@aiworkoutnow.com' }),
  });

  if (!response.ok) {
    throw new Error('Failed to reply to contact');
  }
}

export async function getAllPurchases(token: string): Promise<StripePurchase[]> {
  const response = await fetch(`${API_BASE_URL}/admin/purchases`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch purchases');
  }

  return response.json();
}

export async function getAllActivities(token: string, limit?: number): Promise<CustomerActivity[]> {
  const url = limit 
    ? `${API_BASE_URL}/admin/activities?limit=${limit}`
    : `${API_BASE_URL}/admin/activities`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch activities');
  }

  return response.json();
}