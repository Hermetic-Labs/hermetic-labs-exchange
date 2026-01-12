/**
 * Azure Functions API Client
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://hermetic-labs-api-cthme4a9gcgdfwfc.eastus-01.azurewebsites.net';

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  userId: string;
  email: string;
}

export interface LibraryItem {
  packageSlug: string;
  packageTitle: string;
  purchasedAt: string;
}

export interface DownloadResponse {
  downloadUrl: string;
  expiresIn: number;
}

export interface VerifyPurchaseResponse {
  packageSlug: string;
  downloadUrl: string;
  expiresIn: number;
}

export const azureApi = {
  // Health check
  async health() {
    return apiRequest<{ status: string; timestamp: string; version: string }>('/api/health');
  },

  // Authentication
  async register(data: RegisterRequest) {
    return apiRequest<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async login(data: LoginRequest) {
    return apiRequest<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Library
  async getLibrary(token: string) {
    return apiRequest<LibraryItem[]>('/api/library', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // Download
  async getDownloadUrl(packageSlug: string, token: string) {
    return apiRequest<DownloadResponse>(`/api/download/${packageSlug}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // Verify purchase from Stripe session
  async verifyPurchase(sessionId: string) {
    return apiRequest<VerifyPurchaseResponse>(`/api/verify-purchase?session_id=${sessionId}`);
  },

  // Seller onboarding
  async sellerOnboard(token: string) {
    return apiRequest<{ onboardingUrl: string }>('/api/seller/onboard', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  async getSellerStatus(token: string) {
    return apiRequest<{
      isSeller: boolean;
      verified: boolean;
      displayName?: string;
      packageCount?: number;
    }>('/api/seller/status', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },
};
