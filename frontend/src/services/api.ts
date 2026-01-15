function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, '');
}

function getApiBaseUrl() {
  const envUrlRaw = ((import.meta as any).env?.VITE_API_URL as string | undefined)?.trim();
  const defaultApi = 'https://vs86hpajvb.execute-api.us-east-1.amazonaws.com';

  // If env var is missing, use default API Gateway URL.
  if (!envUrlRaw) return defaultApi;

  // Guardrail: if someone mistakenly sets VITE_API_URL to the frontend origin,
  // it will 404 on /user-access-status and /generate-workout. Fall back to API Gateway.
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    if (envUrlRaw === origin || envUrlRaw.startsWith(origin + '/')) {
      return defaultApi;
    }
  }

  return normalizeBaseUrl(envUrlRaw);
}

const API_BASE_URL = getApiBaseUrl();

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

export async function submitContact(name: string, email: string, subject: string, message: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, subject, message }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Failed to submit contact form' }));
      throw new Error(errorData.message || 'Failed to submit contact form');
    }
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Connection failed. Please check your internet connection and try again.');
    }
    throw error;
  }
}

export async function adminLogin(email: string, password: string): Promise<string> {
  try {
    console.log(`[API] Attempting admin login for: ${email}`);
    console.log(`[API] API Base URL: ${API_BASE_URL}`);
    
    const response = await fetch(`${API_BASE_URL}/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    console.log(`[API] Admin login response status: ${response.status}`);
    console.log(`[API] Admin login response ok: ${response.ok}`);

    if (!response.ok) {
      let errorMessage = 'Login failed';
      let errorDetails: any = null;
      
      try {
        const error = await response.json();
        errorMessage = error.message || error.error || 'Login failed';
        errorDetails = error;
        console.error('[API] Admin login error response:', error);
      } catch (e) {
        console.error('[API] Failed to parse error response:', e);
        const text = await response.text();
        console.error('[API] Raw error response:', text);
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      
      console.error(`[API] Admin login failed: ${errorMessage}`, errorDetails);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('[API] Admin login success, token received');
    
    if (!data.token) {
      console.error('[API] No token in response:', data);
      throw new Error('No token received from server');
    }
    
    return data.token;
  } catch (error: any) {
    console.error('[API] Admin login exception:', error);
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error(`Connection failed. Please check your internet connection and API URL. (${API_BASE_URL}/admin/login)`);
    }
    throw error;
  }
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
  remainingWorkouts?: number;
  totalWorkouts?: number;
  canGenerateWorkout: boolean;
}

export async function getPricingPlans(): Promise<PricingPlan[]> {
  try {
    console.log(`[API] Fetching pricing plans from: ${API_BASE_URL}/pricing-plans`);
    const response = await fetch(`${API_BASE_URL}/pricing-plans`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`[API] Pricing plans response status: ${response.status}`);

    if (!response.ok) {
      let errorMessage = 'Failed to fetch pricing plans';
      try {
        const raw = await response.text();
        try {
          const errorData = JSON.parse(raw);
          errorMessage = errorData.message || errorData.error || errorMessage;
          console.error('[API] Pricing plans error response:', errorData);
        } catch {
          console.error('[API] Pricing plans raw error response:', raw);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
      } catch (e) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log(`[API] Successfully fetched ${data.length} pricing plans`);
    return data;
  } catch (error: any) {
    console.error('[API] Pricing plans fetch exception:', error);
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error(`Connection failed. Please check your internet connection and API URL (${API_BASE_URL}).`);
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

export async function getUserAccessStatus(deviceId: string, cacheBust?: boolean): Promise<UserAccessStatus> {
  try {
    // Add cache busting timestamp to prevent browser/CDN caching
    const timestamp = cacheBust ? `&_t=${Date.now()}` : '';
    const response = await fetch(`${API_BASE_URL}/user-access-status?deviceId=${deviceId}${timestamp}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
      cache: 'no-store',
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

export async function verifyPayment(sessionId: string, deviceId: string): Promise<{ verified: boolean; alreadyProcessed?: boolean; tokensGranted?: number }> {
  try {
    const response = await fetch(`${API_BASE_URL}/verify-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId, deviceId }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[API] Failed to verify payment. Status: ${response.status}, Body: ${errorBody}`);
      throw new Error(`Failed to verify payment: ${response.status} ${response.statusText}`);
    }

    return response.json();
  } catch (error: any) {
    console.error('[API] Payment verification exception:', error);
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

// CRM Types (admin contract)
export interface AdminCustomerSummary {
  deviceId: string;
  email?: string;
  name?: string;
  isDeactivated: boolean;
  statusLabel: 'Free' | 'Paid' | 'Deactivated' | string;
  remainingTokens: number;
  totalWorkouts: number;
  generatedWorkouts: number;
  remainingWorkouts: number;
  purchasesCount: number;
  totalSpentCents: number;
  totalSpentFormatted: string;
  lastActivityIso?: string;
}

export interface AdminCustomerDetails extends AdminCustomerSummary {
  freeWorkoutsUsed: number;
  freeWorkoutsRemaining: number;
  purchases: AdminPurchaseDto[];
  usageEvents: AdminUsageEventDto[];
}

export interface AdminPurchaseDto {
  purchaseId: string;
  planId: string;
  planName: string;
  amountCents: number;
  amountFormatted: string;
  status: string;
  purchasedAtIso: string;
}

export interface AdminUsageEventDto {
  activityType: string;
  description: string;
  timestampIso: string;
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
export async function getAllCustomers(token: string): Promise<AdminCustomerSummary[]> {
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

export async function getCustomer(token: string, deviceId: string): Promise<AdminCustomerDetails> {
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

export async function resetUserTokens(token: string, deviceId: string, newTokenCount: number, previousTokenCount?: number, reason?: string): Promise<void> {
  const url = `${API_BASE_URL}/admin/customers/${deviceId}/reset-tokens`;
  console.log('[API] Resetting tokens for device:', deviceId);
  console.log('[API] URL:', url);
  console.log('[API] Payload:', { newTokenCount, previousTokenCount, reason });
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ 
      newTokenCount, 
      previousTokenCount: previousTokenCount ?? 0,
      reason 
    }),
  });

  console.log('[API] Reset response status:', response.status);
  console.log('[API] Reset response ok:', response.ok);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[API] Reset error response:', errorText);
    throw new Error(errorText || `Failed to reset user tokens: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  console.log('[API] Reset success:', result);
}

export async function getCustomersByEmail(token: string, email: string): Promise<{ email: string; deviceIds: string[]; customers: AdminCustomerSummary[] }> {
  const response = await fetch(`${API_BASE_URL}/admin/customers/by-email/${encodeURIComponent(email)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get customers by email');
  }

  return response.json();
}

export async function resetTokensByEmail(token: string, email: string, newTokenCount: number, reason?: string): Promise<{ message: string; email: string; results: any[] }> {
  const response = await fetch(`${API_BASE_URL}/admin/customers/by-email/${encodeURIComponent(email)}/reset-tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ 
      newTokenCount, 
      previousTokenCount: 0, // Will be calculated on backend
      reason 
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to reset tokens by email');
  }

  return response.json();
}

export async function deleteCustomer(token: string, deviceId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/admin/customers/${deviceId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to delete customer');
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

export interface PurchasesResponse {
  purchases: StripePurchase[];
  totalRevenue?: number;
  totalPurchases?: number;
  completedCount?: number;
}

export async function getAllPurchases(token: string): Promise<PurchasesResponse> {
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

  const data = await response.json();

  // Backward-compat: API used to return an array. Normalize to object.
  if (Array.isArray(data)) {
    const completed = data.filter((p: any) => (p.status || p.paymentStatus || '').toLowerCase() === 'completed');
    const totalRevenue = completed.reduce((sum: number, p: any) => {
      const amt = p.amount ?? p.amountTotal ?? 0;
      return sum + Number(amt || 0);
    }, 0);
    return {
      purchases: data,
      totalRevenue,
      totalPurchases: data.length,
      completedCount: completed.length,
    };
  }

  return {
    purchases: data.purchases ?? [],
    totalRevenue: data.totalRevenue ?? 0,
    totalPurchases: data.totalPurchases ?? (data.purchases?.length ?? 0),
    completedCount: data.completedCount ?? 0,
  };
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

// Email Verification API Functions
export async function sendVerificationCode(email: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/email-verification/send-code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to send verification code' }));
    throw new Error(error.message || 'Failed to send verification code');
  }
}

export async function verifyAndRestoreCredits(email: string, code: string, deviceId: string): Promise<{
  message: string;
  tokensRemaining: number;
  hasUnlimited: boolean;
  expiresAt?: string;
  freeWorkoutsRemaining?: number;
  freeWorkoutsUsed?: number;
}> {
  const response = await fetch(`${API_BASE_URL}/api/email-verification/verify-and-restore`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, code, deviceId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to verify code' }));
    throw new Error(error.message || 'Failed to verify code');
  }

  return response.json();
}

export interface AnalyticsData {
  startDate: string;
  endDate: string;
  period: string;
  timeSeries: Array<{
    date: string;
    workoutsGenerated: number;
    tokenPurchases: number;
    contactSubmissions: number;
    uniqueUsers: number;
    revenue: number;
  }>;
  events: {
    totalWorkoutsGenerated: number;
    totalTokenPurchases: number;
    totalContactSubmissions: number;
    totalTokenResets: number;
    eventsByType: Record<string, number>;
  };
  users: {
    totalUsers: number;
    newUsers: number;
    returningUsers: number;
    freeUsers: number;
    paidUsers: number;
    averageWorkoutsPerUser: number;
    averageRevenuePerUser: number;
  };
  revenue: {
    totalRevenue: number;
    averageOrderValue: number;
    totalTransactions: number;
    revenueByPlan: Record<string, number>;
  };
  conversion: {
    freeToPaidConversionRate: number;
    freeUsersConverted: number;
    freeUsersNotConverted: number;
    averageTimeToConvert: number;
  };
}

export async function getAnalytics(token: string, startDate: Date, endDate: Date, period: string): Promise<AnalyticsData> {
  const params = new URLSearchParams({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    period: period
  });

  const response = await fetch(`${API_BASE_URL}/admin/analytics?${params}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch analytics' }));
    throw new Error(error.message || 'Failed to fetch analytics');
  }

  return response.json();
}

export async function checkEmailLinked(email: string): Promise<{ hasLinkedDevices: boolean; linkedDeviceCount: number }> {
  const response = await fetch(`${API_BASE_URL}/api/email-verification/check-email?email=${encodeURIComponent(email)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to check email');
  }

  return response.json();
}