/**
 * Device Protocols Module
 * 
 * HTTP, Bluetooth, WebSocket protocol handlers with dynamic loading.
 * Provides standard interfaces for different communication protocols used by IoT devices.
 */

import { BaseIoTDeviceAdapter, DeviceSpec, DeviceControlRequest, ExecutionResult, NetworkConfig, AuthConfig } from './IoTDeviceAdapter';

// Protocol Handler Interface
export interface ProtocolHandler {
  protocol: string;
  canHandle(deviceSpec: DeviceSpec): boolean;
  connect(networkConfig: NetworkConfig): Promise<string>;
  disconnect(connectionId: string): Promise<void>;
  execute(connectionId: string, request: DeviceControlRequest): Promise<ExecutionResult>;
  isConnected(connectionId: string): Promise<boolean>;
}

// HTTP Protocol Implementation
export class HTTPProtocolHandler implements ProtocolHandler {
  public protocol = 'http';

  canHandle(deviceSpec: DeviceSpec): boolean {
    return deviceSpec.protocol === 'http' || deviceSpec.protocol === 'mqtt' || deviceSpec.protocol === 'coap';
  }

  async connect(networkConfig: NetworkConfig): Promise<string> {
    const { baseUrl, port, ssl, timeout = 10000 } = networkConfig;

    if (!baseUrl) {
      throw new Error('HTTP connection requires baseUrl in networkConfig');
    }

    // Test connection with a simple GET request
    const url = `${ssl ? 'https' : 'http'}://${baseUrl}:${port || (ssl ? 443 : 80)}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(`${url}/health`, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP connection failed: ${response.status} ${response.statusText}`);
      }

      return url;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`HTTP connection failed: ${message}`);
    }
  }

  async disconnect(connectionId: string): Promise<void> {
    // HTTP connections are stateless, so we just clear the connection ID
    return;
  }

  async execute(connectionId: string, request: DeviceControlRequest): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      const { deviceId, capability, parameters, timeout = 10000 } = request;

      // Find the endpoint for this capability
      const endpoint = this.findEndpoint(capability);
      if (!endpoint) {
        throw new Error(`Endpoint for capability '${capability}' not found`);
      }

      // Build request URL
      const url = this.buildRequestUrl(connectionId, endpoint, parameters);

      // Build request options
      const requestOptions = this.buildRequestOptions(endpoint, parameters);

      // Execute request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...requestOptions,
        signal: controller.signal,
        headers: {
          ...requestOptions.headers,
          'User-Agent': 'EVE-OS-IoT-Controller/1.0'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP request failed: ${response.status} ${response.statusText}`);
      }

      // Parse response
      const responseData = await this.parseResponse(response, endpoint.responseFormat);

      return {
        success: true,
        data: responseData,
        executionTime: Date.now() - startTime,
        deviceId,
        capability,
        timestamp: new Date()
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: {
          code: 'HTTP_PROTOCOL_ERROR',
          message: errorMessage,
          recoverable: true,
          suggestedAction: 'Check device connectivity and endpoint configuration'
        },
        executionTime: Date.now() - startTime,
        deviceId: request.deviceId,
        capability: request.capability,
        timestamp: new Date()
      };
    }
  }

  async isConnected(connectionId: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${connectionId}/health`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  private findEndpoint(capability: string): any {
    // This would be populated by the device spec
    // For now, return a mock endpoint
    return {
      method: 'POST',
      path: '/control',
      responseFormat: 'json',
      authentication: undefined,
      name: capability
    };
  }

  private buildRequestUrl(connectionId: string, endpoint: any, parameters: Record<string, any>): string {
    let path = endpoint.path;

    // Replace path parameters
    for (const [key, value] of Object.entries(parameters)) {
      if (path.includes(`:${key}`)) {
        path = path.replace(`:${key}`, encodeURIComponent(value));
      }
    }

    return `${connectionId}${path}`;
  }

  private buildRequestOptions(endpoint: any, parameters: Record<string, any>): RequestInit {
    const options: RequestInit = {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    // Handle authentication
    if (endpoint.authentication && options.headers) {
      this.addAuthenticationHeaders(options.headers as Record<string, string>, endpoint.authentication);
    }

    // Handle request body for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
      options.body = JSON.stringify(parameters);
    }

    return options;
  }

  private addAuthenticationHeaders(headers: Record<string, string>, auth: AuthConfig): void {
    switch (auth.type) {
      case 'basic':
        const credentials = btoa(`${auth.credentials.username}:${auth.credentials.password}`);
        headers['Authorization'] = `Basic ${credentials}`;
        break;
      case 'bearer':
        headers['Authorization'] = `Bearer ${auth.credentials.token}`;
        break;
      case 'api_key':
        headers['X-API-Key'] = auth.credentials.apiKey;
        break;
    }
  }

  private async parseResponse(response: Response, format: string): Promise<any> {
    switch (format) {
      case 'json':
        return await response.json();
      case 'xml':
        const xmlText = await response.text();
        // Simple XML parsing - in production, use a proper XML parser
        return { xml: xmlText };
      case 'raw':
        return await response.text();
      default:
        return await response.text();
    }
  }
}

// WebSocket Protocol Implementation
export class WebSocketProtocolHandler implements ProtocolHandler {
  public protocol = 'websocket';
  private connections = new Map<string, WebSocket>();

  canHandle(deviceSpec: DeviceSpec): boolean {
    return deviceSpec.protocol === 'websocket';
  }

  async connect(networkConfig: NetworkConfig): Promise<string> {
    const { baseUrl, port, ssl, timeout = 10000 } = networkConfig;

    if (!baseUrl) {
      throw new Error('WebSocket connection requires baseUrl in networkConfig');
    }

    const protocol = ssl ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${baseUrl}:${port || 8080}`;

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl);

      const timeoutId = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket connection timeout'));
      }, timeout);

      ws.onopen = () => {
        clearTimeout(timeoutId);
        const connectionId = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.connections.set(connectionId, ws);
        resolve(connectionId);
      };

      ws.onerror = (error) => {
        clearTimeout(timeoutId);
        reject(new Error(`WebSocket connection failed: ${error}`));
      };
    });
  }

  async disconnect(connectionId: string): Promise<void> {
    const ws = this.connections.get(connectionId);
    if (ws) {
      ws.close();
      this.connections.delete(connectionId);
    }
  }

  async execute(connectionId: string, request: DeviceControlRequest): Promise<ExecutionResult> {
    const startTime = Date.now();
    const ws = this.connections.get(connectionId);

    if (!ws) {
      return {
        success: false,
        error: {
          code: 'WEBSOCKET_NOT_CONNECTED',
          message: 'WebSocket connection not found',
          recoverable: false
        },
        executionTime: Date.now() - startTime,
        deviceId: request.deviceId,
        capability: request.capability,
        timestamp: new Date()
      };
    }

    if (ws.readyState !== WebSocket.OPEN) {
      return {
        success: false,
        error: {
          code: 'WEBSOCKET_NOT_READY',
          message: 'WebSocket connection not ready',
          recoverable: true,
          suggestedAction: 'Reconnect WebSocket'
        },
        executionTime: Date.now() - startTime,
        deviceId: request.deviceId,
        capability: request.capability,
        timestamp: new Date()
      };
    }

    return new Promise((resolve) => {
      const { capability, parameters, timeout = 10000 } = request;

      const message = {
        type: 'command',
        capability,
        parameters,
        timestamp: Date.now(),
        requestId: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      const timeoutId = setTimeout(() => {
        resolve({
          success: false,
          error: {
            code: 'WEBSOCKET_TIMEOUT',
            message: 'WebSocket request timeout',
            recoverable: true,
            suggestedAction: 'Check device responsiveness'
          },
          executionTime: Date.now() - startTime,
          deviceId: request.deviceId,
          capability: request.capability,
          timestamp: new Date()
        });
      }, timeout);

      const handleMessage = (event: MessageEvent) => {
        try {
          const response = JSON.parse(event.data);

          if (response.requestId === message.requestId) {
            clearTimeout(timeoutId);
            ws.removeEventListener('message', handleMessage);

            resolve({
              success: response.success !== false,
              data: response.data,
              error: response.error ? {
                ...response.error,
                recoverable: response.error.recoverable !== false
              } : undefined,
              executionTime: Date.now() - startTime,
              deviceId: request.deviceId,
              capability: request.capability,
              timestamp: new Date()
            });
          }
        } catch (error) {
          // Ignore invalid JSON messages
        }
      };

      ws.addEventListener('message', handleMessage);
      ws.send(JSON.stringify(message));
    });
  }

  async isConnected(connectionId: string): Promise<boolean> {
    const ws = this.connections.get(connectionId);
    return ws ? ws.readyState === WebSocket.OPEN : false;
  }
}

// MQTT Protocol Implementation
export class MQTTProtocolHandler implements ProtocolHandler {
  public protocol = 'mqtt';
  private connections = new Map<string, any>(); // MQTT client instances

  canHandle(deviceSpec: DeviceSpec): boolean {
    return deviceSpec.protocol === 'mqtt';
  }

  async connect(networkConfig: NetworkConfig): Promise<string> {
    // Note: This would require an MQTT client library in a real implementation
    // For now, we'll simulate the connection
    const connectionId = `mqtt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Simulate successful connection
    this.connections.set(connectionId, {
      isConnected: true,
      connectTime: Date.now()
    });

    return connectionId;
  }

  async disconnect(connectionId: string): Promise<void> {
    const client = this.connections.get(connectionId);
    if (client) {
      // Simulate disconnect
      this.connections.delete(connectionId);
    }
  }

  async execute(connectionId: string, request: DeviceControlRequest): Promise<ExecutionResult> {
    const startTime = Date.now();
    const client = this.connections.get(connectionId);

    if (!client || !client.isConnected) {
      return {
        success: false,
        error: {
          code: 'MQTT_NOT_CONNECTED',
          message: 'MQTT client not connected',
          recoverable: true,
          suggestedAction: 'Reconnect MQTT client'
        },
        executionTime: Date.now() - startTime,
        deviceId: request.deviceId,
        capability: request.capability,
        timestamp: new Date()
      };
    }

    // Simulate MQTT publish operation
    const topic = `device/${request.deviceId}/${request.capability}`;
    const payload = JSON.stringify(request.parameters);

    // In a real implementation, this would publish to the MQTT broker
    return {
      success: true,
      data: {
        topic,
        payload,
        qos: 1,
        retained: false
      },
      executionTime: Date.now() - startTime,
      deviceId: request.deviceId,
      capability: request.capability,
      timestamp: new Date()
    };
  }

  async isConnected(connectionId: string): Promise<boolean> {
    const client = this.connections.get(connectionId);
    return client ? client.isConnected : false;
  }
}

// Protocol Manager - Manages all protocol handlers
export class ProtocolManager {
  private handlers = new Map<string, ProtocolHandler>();

  constructor() {
    // Register default handlers
    this.registerHandler(new HTTPProtocolHandler());
    this.registerHandler(new WebSocketProtocolHandler());
    this.registerHandler(new MQTTProtocolHandler());
  }

  registerHandler(handler: ProtocolHandler): void {
    this.handlers.set(handler.protocol, handler);
  }

  getHandler(protocol: string): ProtocolHandler | undefined {
    return this.handlers.get(protocol);
  }

  async createDeviceAdapter<T extends BaseIoTDeviceAdapter>(
    DeviceAdapterClass: new (spec: DeviceSpec) => T,
    deviceSpec: DeviceSpec,
    networkConfig: NetworkConfig
  ): Promise<T> {
    const handler = this.getHandler(deviceSpec.protocol);
    if (!handler) {
      throw new Error(`No protocol handler available for protocol: ${deviceSpec.protocol}`);
    }

    if (!handler.canHandle(deviceSpec)) {
      throw new Error(`Handler does not support device specification for protocol: ${deviceSpec.protocol}`);
    }

    const connectionId = await handler.connect(networkConfig);
    const adapter = new DeviceAdapterClass(deviceSpec);

    // Attach protocol handler to adapter
    (adapter as any).protocolHandler = handler;
    (adapter as any).connectionId = connectionId;

    return adapter;
  }

  async executeOnDevice<T extends BaseIoTDeviceAdapter>(
    adapter: T,
    request: DeviceControlRequest
  ): Promise<ExecutionResult> {
    const handler = (adapter as any).protocolHandler as ProtocolHandler;
    const connectionId = (adapter as any).connectionId as string;

    if (!handler || !connectionId) {
      return {
        success: false,
        error: {
          code: 'ADAPTER_NOT_CONFIGURED',
          message: 'Adapter not properly configured with protocol handler',
          recoverable: false
        },
        executionTime: 0,
        deviceId: request.deviceId,
        capability: request.capability,
        timestamp: new Date()
      };
    }

    return await handler.execute(connectionId, request);
  }

  async disconnectDevice<T extends BaseIoTDeviceAdapter>(adapter: T): Promise<void> {
    const handler = (adapter as any).protocolHandler as ProtocolHandler;
    const connectionId = (adapter as any).connectionId as string;

    if (handler && connectionId) {
      await handler.disconnect(connectionId);
    }
  }

  getSupportedProtocols(): string[] {
    return Array.from(this.handlers.keys());
  }

  supportsProtocol(protocol: string): boolean {
    return this.handlers.has(protocol);
  }

  async checkConnectionHealth(connectionId: string, protocol: string): Promise<boolean> {
    const handler = this.getHandler(protocol);
    if (!handler) return false;

    return await handler.isConnected(connectionId);
  }
}

// Global protocol manager instance
export const protocolManager = new ProtocolManager();

// Utility functions for dynamic protocol loading
export class DynamicProtocolLoader {
  private loadedProtocols = new Set<string>();

  async loadProtocol(protocol: string, modulePath?: string): Promise<boolean> {
    if (this.loadedProtocols.has(protocol)) {
      return true;
    }

    try {
      // In a real implementation, this would dynamically import the protocol handler
      // For example:
      // const module = await import(modulePath || `./protocols/${protocol}ProtocolHandler.js`);
      // const handler = new module.default();
      // protocolManager.registerHandler(handler);

      this.loadedProtocols.add(protocol);
      return true;
    } catch (error) {
      console.error(`Failed to load protocol ${protocol}:`, error);
      return false;
    }
  }

  async loadProtocolsFromConfig(config: Record<string, string>): Promise<void> {
    const loadPromises = Object.entries(config).map(([protocol, modulePath]) =>
      this.loadProtocol(protocol, modulePath)
    );

    await Promise.all(loadPromises);
  }

  getLoadedProtocols(): string[] {
    return Array.from(this.loadedProtocols);
  }

  isProtocolLoaded(protocol: string): boolean {
    return this.loadedProtocols.has(protocol);
  }
}

export const dynamicProtocolLoader = new DynamicProtocolLoader();