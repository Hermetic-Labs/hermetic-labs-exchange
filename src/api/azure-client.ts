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

// Control Surface Types
export interface FileInfo {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
}

export interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: TreeNode[];
}

export interface LintError {
  file: string;
  line: number;
  column: number;
  message: string;
  ruleId: string;
  severity: 'error' | 'warning';
}

export interface LintResult {
  errors: LintError[];
  errorCount: number;
  warningCount: number;
  fixableCount: number;
}

export interface TscError {
  file: string;
  line: number;
  column: number;
  message: string;
  code: number;
}

export interface TscResult {
  errors: TscError[];
  errorCount: number;
}

export interface DiagnosticsSummary {
  lint: { errorCount: number; warningCount: number };
  tsc: { errorCount: number };
  build: { success: boolean; lastRun?: string };
}

export interface StructureOverview {
  folders: Array<{ name: string; path: string; fileCount: number; totalSize: number }>;
  totalFiles: number;
  totalSize: number;
}

export interface PackageInfo {
  name: string;
  path: string;
  version?: string;
  hasManifest: boolean;
}

export interface ModuleInfo {
  name: string;
  path: string;
  installed: boolean;
}

export interface ServiceInfo {
  name: string;
  path: string;
  type: string;
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

  // ==========================================================================
  // Control Surface API (Dev Tools)
  // ==========================================================================

  // File Operations
  async readFile(path: string) {
    return apiRequest<{ success: boolean; data?: string; error?: string }>(
      `/api/files/read?path=${encodeURIComponent(path)}`
    );
  },

  async writeFile(path: string, content: string) {
    return apiRequest<{ success: boolean; error?: string }>('/api/files/write', {
      method: 'POST',
      body: JSON.stringify({ path, content }),
    });
  },

  async listFiles(path: string) {
    return apiRequest<{ success: boolean; data?: FileInfo[]; error?: string }>(
      `/api/files/list?path=${encodeURIComponent(path)}`
    );
  },

  async getFileTree(path: string, depth = 3) {
    return apiRequest<{ success: boolean; data?: TreeNode; error?: string }>(
      `/api/files/tree?path=${encodeURIComponent(path)}&depth=${depth}`
    );
  },

  // Diagnostics
  async runLint(path?: string) {
    const url = path
      ? `/api/diagnostics/lint?path=${encodeURIComponent(path)}`
      : '/api/diagnostics/lint';
    return apiRequest<{ success: boolean; data?: LintResult; error?: string }>(url);
  },

  async runTsc(path?: string) {
    const url = path
      ? `/api/diagnostics/tsc?path=${encodeURIComponent(path)}`
      : '/api/diagnostics/tsc';
    return apiRequest<{ success: boolean; data?: TscResult; error?: string }>(url);
  },

  async getDiagnosticsSummary() {
    return apiRequest<{ success: boolean; data?: DiagnosticsSummary; error?: string }>(
      '/api/diagnostics/summary'
    );
  },

  // Structure
  async getStructureOverview() {
    return apiRequest<{ success: boolean; data?: StructureOverview; error?: string }>(
      '/api/structure/overview'
    );
  },

  async getPackagesInfo() {
    return apiRequest<{ success: boolean; data?: PackageInfo[]; error?: string }>(
      '/api/structure/packages'
    );
  },

  async getModulesInfo() {
    return apiRequest<{ success: boolean; data?: ModuleInfo[]; error?: string }>(
      '/api/structure/modules'
    );
  },

  async getServicesInfo() {
    return apiRequest<{ success: boolean; data?: ServiceInfo[]; error?: string }>(
      '/api/structure/services'
    );
  },
};
