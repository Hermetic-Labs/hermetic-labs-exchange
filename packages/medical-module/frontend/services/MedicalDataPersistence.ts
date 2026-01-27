/**
 * EVE OS Medical Data Persistence Service
 *
 * Local-first data storage with hospital server sync.
 * Ensures no data loss even if hospital server is unavailable.
 *
 * Architecture:
 * 1. All data saved to IndexedDB first (device storage)
 * 2. Queued for sync to hospital server
 * 3. Retries on failure with exponential backoff
 * 4. Full audit trail for HIPAA compliance
 *
 * Single point of failure protection:
 * - Data persists on device even if server is unplugged
 * - Automatic sync when connection restored
 * - Conflict resolution with server-wins strategy
 */

import { EventEmitter } from '../../../_shared/EventEmitter';

// Data types for medical records
export type MedicalRecordType =
  | 'vitals'
  | 'alert'
  | 'medication'
  | 'procedure'
  | 'note'
  | 'device_reading'
  | 'fall_detection'
  | 'triage'
  | 'audit_log';

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict';

export interface MedicalRecord {
  id: string;
  type: MedicalRecordType;
  patientId?: string;
  deviceId?: string;
  stationId?: string;
  data: Record<string, unknown>;
  timestamp: string;
  createdBy: string;
  syncStatus: SyncStatus;
  syncAttempts: number;
  lastSyncAttempt?: string;
  serverTimestamp?: string;
  checksum: string;
}

export interface AuditEntry {
  id: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'sync' | 'export';
  recordId: string;
  recordType: MedicalRecordType;
  userId: string;
  stationId: string;
  timestamp: string;
  details: string;
  ipAddress?: string;
  success: boolean;
  errorMessage?: string;
}

export interface SyncQueueItem {
  id: string;
  recordId: string;
  operation: 'create' | 'update' | 'delete';
  priority: 'critical' | 'high' | 'normal' | 'low';
  attempts: number;
  maxAttempts: number;
  nextRetry: string;
  createdAt: string;
}

interface PersistenceEvents {
  'record:saved': (record: MedicalRecord) => void;
  'record:synced': (record: MedicalRecord) => void;
  'record:sync-failed': (record: MedicalRecord, error: Error) => void;
  'sync:started': () => void;
  'sync:completed': (stats: { synced: number; failed: number }) => void;
  'connection:online': () => void;
  'connection:offline': () => void;
  'audit:logged': (entry: AuditEntry) => void;
}

// IndexedDB configuration
const DB_NAME = 'eve_medical_data';
const DB_VERSION = 1;
const STORES = {
  records: 'medical_records',
  syncQueue: 'sync_queue',
  auditLog: 'audit_log',
  settings: 'settings'
};

class MedicalDataPersistenceService extends EventEmitter<PersistenceEvents> {
  private static instance: MedicalDataPersistenceService;
  private db: IDBDatabase | null = null;
  private isInitialized = false;
  private isOnline = navigator.onLine;
  private syncInterval: NodeJS.Timeout | null = null;
  private hospitalServerUrl: string = '';
  private stationId: string = '';
  private currentUserId: string = '';

  // Sync configuration
  private readonly SYNC_INTERVAL_MS = 30000; // 30 seconds
  private readonly MAX_RETRY_ATTEMPTS = 5;
  private readonly RETRY_BACKOFF_BASE = 2000; // 2 seconds base

  private constructor() {
    super();
    this.setupConnectionListeners();
  }

  public static getInstance(): MedicalDataPersistenceService {
    if (!MedicalDataPersistenceService.instance) {
      MedicalDataPersistenceService.instance = new MedicalDataPersistenceService();
    }
    return MedicalDataPersistenceService.instance;
  }

  /**
   * Initialize the persistence service
   */
  public async initialize(config: {
    hospitalServerUrl: string;
    stationId: string;
    userId: string;
  }): Promise<void> {
    if (this.isInitialized) return;

    this.hospitalServerUrl = config.hospitalServerUrl;
    this.stationId = config.stationId;
    this.currentUserId = config.userId;

    try {
      await this.openDatabase();
      this.startSyncProcess();
      this.isInitialized = true;

      await this.logAudit('create', 'system', 'audit_log',
        `Persistence service initialized for station ${this.stationId}`);
    } catch (error) {
      console.error('Failed to initialize persistence:', error);
      throw error;
    }
  }

  /**
   * Save a medical record (local-first, then queue for sync)
   */
  public async saveRecord(
    type: MedicalRecordType,
    data: Record<string, unknown>,
    options: {
      patientId?: string;
      deviceId?: string;
      priority?: 'critical' | 'high' | 'normal' | 'low';
    } = {}
  ): Promise<MedicalRecord> {
    const record: MedicalRecord = {
      id: this.generateId(),
      type,
      patientId: options.patientId,
      deviceId: options.deviceId,
      stationId: this.stationId,
      data,
      timestamp: new Date().toISOString(),
      createdBy: this.currentUserId,
      syncStatus: 'pending',
      syncAttempts: 0,
      checksum: this.calculateChecksum(data)
    };

    // 1. Save locally first (this is the critical path)
    await this.saveToLocal(record);

    // 2. Queue for server sync
    await this.queueForSync(record.id, 'create', options.priority || 'normal');

    // 3. Log the operation
    await this.logAudit('create', record.id, type,
      `Created ${type} record${options.patientId ? ` for patient ${options.patientId}` : ''}`);

    // 4. Emit event
    this.emit('record:saved', record);

    // 5. Try immediate sync if online and critical
    if (this.isOnline && options.priority === 'critical') {
      this.syncRecord(record.id).catch(err => {
        console.warn('Immediate sync failed, will retry:', err.message);
      });
    }

    return record;
  }

  /**
   * Get a record by ID
   */
  public async getRecord(id: string): Promise<MedicalRecord | null> {
    const record = await this.getFromLocal<MedicalRecord>(STORES.records, id);

    if (record) {
      await this.logAudit('read', id, record.type, `Read ${record.type} record`);
    }

    return record;
  }

  /**
   * Query records by type and optional filters
   */
  public async queryRecords(
    type: MedicalRecordType,
    filters?: {
      patientId?: string;
      deviceId?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
    }
  ): Promise<MedicalRecord[]> {
    const allRecords = await this.getAllFromLocal<MedicalRecord>(STORES.records);

    let filtered = allRecords.filter(r => r.type === type);

    if (filters?.patientId) {
      filtered = filtered.filter(r => r.patientId === filters.patientId);
    }
    if (filters?.deviceId) {
      filtered = filtered.filter(r => r.deviceId === filters.deviceId);
    }
    if (filters?.startDate) {
      filtered = filtered.filter(r => r.timestamp >= filters.startDate!);
    }
    if (filters?.endDate) {
      filtered = filtered.filter(r => r.timestamp <= filters.endDate!);
    }

    // Sort by timestamp descending
    filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    if (filters?.limit) {
      filtered = filtered.slice(0, filters.limit);
    }

    return filtered;
  }

  /**
   * Update an existing record
   */
  public async updateRecord(
    id: string,
    updates: Partial<MedicalRecord['data']>,
    priority: 'critical' | 'high' | 'normal' | 'low' = 'normal'
  ): Promise<MedicalRecord | null> {
    const existing = await this.getFromLocal<MedicalRecord>(STORES.records, id);
    if (!existing) return null;

    const updated: MedicalRecord = {
      ...existing,
      data: { ...existing.data, ...updates },
      syncStatus: 'pending',
      checksum: this.calculateChecksum({ ...existing.data, ...updates })
    };

    await this.saveToLocal(updated);
    await this.queueForSync(id, 'update', priority);
    await this.logAudit('update', id, existing.type, `Updated ${existing.type} record`);

    this.emit('record:saved', updated);
    return updated;
  }

  /**
   * Get pending sync count
   */
  public async getPendingSyncCount(): Promise<number> {
    const queue = await this.getAllFromLocal<SyncQueueItem>(STORES.syncQueue);
    return queue.length;
  }

  /**
   * Get sync status summary
   */
  public async getSyncStatus(): Promise<{
    pending: number;
    failed: number;
    lastSync: string | null;
    isOnline: boolean;
  }> {
    const queue = await this.getAllFromLocal<SyncQueueItem>(STORES.syncQueue);
    const settings = await this.getFromLocal<{ lastSync: string }>(STORES.settings, 'syncInfo');

    return {
      pending: queue.filter(q => q.attempts < q.maxAttempts).length,
      failed: queue.filter(q => q.attempts >= q.maxAttempts).length,
      lastSync: settings?.lastSync || null,
      isOnline: this.isOnline
    };
  }

  /**
   * Force sync all pending records
   */
  public async forceSync(): Promise<{ synced: number; failed: number }> {
    return this.processSyncQueue();
  }

  /**
   * Get audit log entries
   */
  public async getAuditLog(options?: {
    recordId?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<AuditEntry[]> {
    let entries = await this.getAllFromLocal<AuditEntry>(STORES.auditLog);

    if (options?.recordId) {
      entries = entries.filter(e => e.recordId === options.recordId);
    }
    if (options?.userId) {
      entries = entries.filter(e => e.userId === options.userId);
    }
    if (options?.startDate) {
      entries = entries.filter(e => e.timestamp >= options.startDate!);
    }
    if (options?.endDate) {
      entries = entries.filter(e => e.timestamp <= options.endDate!);
    }

    entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    if (options?.limit) {
      entries = entries.slice(0, options.limit);
    }

    return entries;
  }

  /**
   * Export data for backup or transfer
   */
  public async exportData(type?: MedicalRecordType): Promise<{
    records: MedicalRecord[];
    auditLog: AuditEntry[];
    exportedAt: string;
    stationId: string;
  }> {
    let records = await this.getAllFromLocal<MedicalRecord>(STORES.records);
    if (type) {
      records = records.filter(r => r.type === type);
    }

    const auditLog = await this.getAllFromLocal<AuditEntry>(STORES.auditLog);

    await this.logAudit('export', 'bulk', 'audit_log',
      `Exported ${records.length} records${type ? ` of type ${type}` : ' (all types)'}`);

    return {
      records,
      auditLog,
      exportedAt: new Date().toISOString(),
      stationId: this.stationId
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private setupConnectionListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.emit('connection:online');
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.emit('connection:offline');
    });
  }

  private async openDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Medical records store
        if (!db.objectStoreNames.contains(STORES.records)) {
          const recordStore = db.createObjectStore(STORES.records, { keyPath: 'id' });
          recordStore.createIndex('type', 'type', { unique: false });
          recordStore.createIndex('patientId', 'patientId', { unique: false });
          recordStore.createIndex('syncStatus', 'syncStatus', { unique: false });
          recordStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Sync queue store
        if (!db.objectStoreNames.contains(STORES.syncQueue)) {
          const queueStore = db.createObjectStore(STORES.syncQueue, { keyPath: 'id' });
          queueStore.createIndex('priority', 'priority', { unique: false });
          queueStore.createIndex('nextRetry', 'nextRetry', { unique: false });
        }

        // Audit log store
        if (!db.objectStoreNames.contains(STORES.auditLog)) {
          const auditStore = db.createObjectStore(STORES.auditLog, { keyPath: 'id' });
          auditStore.createIndex('recordId', 'recordId', { unique: false });
          auditStore.createIndex('userId', 'userId', { unique: false });
          auditStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Settings store
        if (!db.objectStoreNames.contains(STORES.settings)) {
          db.createObjectStore(STORES.settings, { keyPath: 'key' });
        }
      };
    });
  }

  private async saveToLocal(record: MedicalRecord): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORES.records], 'readwrite');
      const store = transaction.objectStore(STORES.records);
      const request = store.put(record);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  private async getFromLocal<T>(storeName: string, key: string): Promise<T | null> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  private async getAllFromLocal<T>(storeName: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  private async deleteFromLocal(storeName: string, key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  private async queueForSync(
    recordId: string,
    operation: 'create' | 'update' | 'delete',
    priority: 'critical' | 'high' | 'normal' | 'low'
  ): Promise<void> {
    const queueItem: SyncQueueItem = {
      id: this.generateId(),
      recordId,
      operation,
      priority,
      attempts: 0,
      maxAttempts: this.MAX_RETRY_ATTEMPTS,
      nextRetry: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORES.syncQueue], 'readwrite');
      const store = transaction.objectStore(STORES.syncQueue);
      const request = store.put(queueItem);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  private startSyncProcess(): void {
    // Process queue immediately if online
    if (this.isOnline) {
      this.processSyncQueue();
    }

    // Set up periodic sync
    this.syncInterval = setInterval(() => {
      if (this.isOnline) {
        this.processSyncQueue();
      }
    }, this.SYNC_INTERVAL_MS);
  }

  private async processSyncQueue(): Promise<{ synced: number; failed: number }> {
    if (!this.isOnline || !this.hospitalServerUrl) {
      return { synced: 0, failed: 0 };
    }

    this.emit('sync:started');

    const queue = await this.getAllFromLocal<SyncQueueItem>(STORES.syncQueue);
    const now = new Date().toISOString();

    // Filter items ready for retry
    const ready = queue.filter(item =>
      item.nextRetry <= now && item.attempts < item.maxAttempts
    );

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
    ready.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    let synced = 0;
    let failed = 0;

    for (const item of ready) {
      try {
        await this.syncRecord(item.recordId);
        await this.deleteFromLocal(STORES.syncQueue, item.id);
        synced++;
      } catch (error) {
        failed++;

        // Update retry info with exponential backoff
        const nextAttempt = item.attempts + 1;
        const backoffMs = this.RETRY_BACKOFF_BASE * Math.pow(2, nextAttempt);
        const nextRetry = new Date(Date.now() + backoffMs).toISOString();

        const updatedItem: SyncQueueItem = {
          ...item,
          attempts: nextAttempt,
          nextRetry
        };

        if (!this.db) continue;

        const transaction = this.db.transaction([STORES.syncQueue], 'readwrite');
        const store = transaction.objectStore(STORES.syncQueue);
        store.put(updatedItem);
      }
    }

    // Update last sync time
    await this.saveSettings('syncInfo', { lastSync: now });

    this.emit('sync:completed', { synced, failed });

    return { synced, failed };
  }

  private async syncRecord(recordId: string): Promise<void> {
    const record = await this.getFromLocal<MedicalRecord>(STORES.records, recordId);
    if (!record) {
      throw new Error(`Record ${recordId} not found`);
    }

    // Update status to syncing
    record.syncStatus = 'syncing';
    await this.saveToLocal(record);

    try {
      const response = await fetch(`${this.hospitalServerUrl}/api/medical/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Station-ID': this.stationId,
          'X-Checksum': record.checksum
        },
        body: JSON.stringify(record)
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const serverResponse = await response.json();

      // Update record with server timestamp
      record.syncStatus = 'synced';
      record.serverTimestamp = serverResponse.timestamp || new Date().toISOString();
      record.syncAttempts++;
      record.lastSyncAttempt = new Date().toISOString();

      await this.saveToLocal(record);
      await this.logAudit('sync', recordId, record.type, 'Record synced to hospital server');

      this.emit('record:synced', record);

    } catch (error) {
      record.syncStatus = 'failed';
      record.syncAttempts++;
      record.lastSyncAttempt = new Date().toISOString();

      await this.saveToLocal(record);

      const err = error instanceof Error ? error : new Error(String(error));
      this.emit('record:sync-failed', record, err);

      throw error;
    }
  }

  private async logAudit(
    action: AuditEntry['action'],
    recordId: string,
    recordType: MedicalRecordType,
    details: string,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    const entry: AuditEntry = {
      id: this.generateId(),
      action,
      recordId,
      recordType,
      userId: this.currentUserId,
      stationId: this.stationId,
      timestamp: new Date().toISOString(),
      details,
      success,
      errorMessage
    };

    if (!this.db) return;

    const transaction = this.db.transaction([STORES.auditLog], 'readwrite');
    const store = transaction.objectStore(STORES.auditLog);
    store.put(entry);

    this.emit('audit:logged', entry);
  }

  private async saveSettings(key: string, value: unknown): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction([STORES.settings], 'readwrite');
    const store = transaction.objectStore(STORES.settings);
    store.put({ key, ...value as object });
  }

  private generateId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private calculateChecksum(data: Record<string, unknown>): string {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Cleanup - call when shutting down
   */
  public destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    if (this.db) {
      this.db.close();
    }
    this.isInitialized = false;
  }
}

// Export class and singleton instance
export { MedicalDataPersistenceService as MedicalDataPersistence };
export const medicalDataPersistence = MedicalDataPersistenceService.getInstance();
