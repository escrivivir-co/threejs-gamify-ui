import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, Subject, map } from 'rxjs';
import { AlephScriptService as CoreAlephScriptService, AlephMessage } from '@alephscript/angular';

export interface AlephScriptConfig {
  serverUrl: string;
  timeout?: number;
  debug?: boolean;
  fallbackMode?: boolean;
  uiType?: string;
  uiId?: string;
}

export interface AlephScriptMessage {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  source?: string;
  target?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AlephScriptService {
  private fallbackModeEnabled = false;
  private fallbackConnectionStatus$ = new BehaviorSubject<string>('disconnected');
  private fallbackMessages$ = new Subject<AlephScriptMessage>();
  private fallbackEvents$ = new Subject<any>();

  // Default configuration
  private config: AlephScriptConfig = {
    serverUrl: 'ws://localhost:3000',
    timeout: 10000,
    debug: true,
    fallbackMode: true
  };

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private coreAlephScript: CoreAlephScriptService
  ) {
    console.log('🔗 AlephScriptService initialized - Using new @alephscript/angular implementation');
    console.log('🔌 Status inicial - isConnected:', this.connected());
  }

  /**
   * Get connection status as observable
   */
  getConnectionStatus(): Observable<string> {
    if (this.fallbackModeEnabled) {
      return this.fallbackConnectionStatus$.asObservable();
    }
    return this.coreAlephScript.connectionStatus;
  }

  /**
   * Get messages as observable
   */
  getMessages(): Observable<AlephScriptMessage> {
    if (this.fallbackModeEnabled) {
      return this.fallbackMessages$.asObservable();
    }
    
    // Transform AlephMessage to AlephScriptMessage for backward compatibility
    return this.coreAlephScript.messages.pipe(
      map((msg: AlephMessage) => ({
        id: msg.id,
        type: msg.type,
        data: msg.data,
        timestamp: msg.timestamp || Date.now(),
        source: msg.source,
        target: msg.target
      }))
    );
  }

  /**
   * Get events as observable
   */
  getEvents(): Observable<any> {
    if (this.fallbackModeEnabled) {
      return this.fallbackEvents$.asObservable();
    }
    return this.coreAlephScript.systemMessages;
  }

  /**
   * Configure the service
   */
  configure(config: Partial<AlephScriptConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('⚙️ AlephScript configurado:', this.config);
    
    if (!this.fallbackModeEnabled) {
      // No need for separate configure call - the core service handles configuration internally
    }
  }

  /**
   * Check if connected
   */
  connected(): boolean {
    if (this.fallbackModeEnabled) {
      return this.fallbackConnectionStatus$.value === 'connected';
    }
    return this.coreAlephScript.isConnected();
  }

  /**
   * Check if socket is connected
   */
  isSocketConnected(): boolean {
    return this.connected() && !this.fallbackModeEnabled;
  }

  /**
   * Check if in fallback mode
   */
  isFallbackMode(): boolean {
    return this.fallbackModeEnabled;
  }

  /**
   * Connect to server
   */
  connect(): void {
    if (this.fallbackModeEnabled) {
      console.log('🔄 Attempting reconnection from fallback mode...');
      this.fallbackModeEnabled = false;
      this.fallbackConnectionStatus$.next('connecting');
    }

    if (!isPlatformBrowser(this.platformId)) {
      console.log('🚫 Not in browser environment, enabling fallback mode');
      this.enableOfflineMode();
      return;
    }

    try {
      // Simply call connect on the core service
      this.coreAlephScript.connect();
      
    } catch (error) {
      console.error('❌ Connection failed:', error);
      this.handleConnectionError();
    }
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    console.log('🔌 Disconnecting from AlephScript server...');
    
    if (!this.fallbackModeEnabled) {
      this.coreAlephScript.disconnect();
    }
    
    if (this.fallbackModeEnabled) {
      this.fallbackConnectionStatus$.next('disconnected');
    }
  }

  /**
   * Enable offline mode
   */
  enableOfflineMode(): void {
    console.log('📴 Enabling offline mode...');
    this.fallbackModeEnabled = true;
    this.fallbackConnectionStatus$.next('offline');
  }

  /**
   * Send message
   */
  sendMessage(type: string, data: any): void {
    if (this.fallbackModeEnabled) {
      console.log('📴 Offline mode - message not sent:', { type, data });
      return;
    }

    try {
      // Use the core service's sendMessage directly
      this.coreAlephScript.sendMessage(type, data);
      console.log('📤 Message sent:', { type, data });
      
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      this.handleConnectionError();
    }
  }

  /**
   * Handle connection errors
   */
  private handleConnectionError(): void {
    console.log('⚠️ Connection error detected');
    
    if (this.config.fallbackMode) {
      console.log('🔄 Enabling fallback mode due to connection error');
      this.enableOfflineMode();
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
