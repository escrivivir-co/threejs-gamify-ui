import { Injectable, Inject, PLATFORM_ID } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import { BehaviorSubject, Observable, Subject, map } from "rxjs";
import {
  AlephScriptService as CoreAlephScriptService,
  AlephMessage,
  AlephClientConfig,
} from "@alephscript/angular";

@Injectable({
  providedIn: "root",
})
export class AlephScriptService {
  private fallbackModeEnabled = false;
  private fallbackConnectionStatus$ = new BehaviorSubject<string>(
    "disconnected"
  );
  private fallbackMessages$ = new Subject<AlephMessage>();
  private fallbackEvents$ = new Subject<any>();

  // Default configuration
  private config: AlephClientConfig = {
    url: "ws://localhost:3000",
    timeout: 10000,
    debug: true,
    name: "BASTION_BOT_THREEJS_SRV",
  };

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    public coreAlephScript: CoreAlephScriptService
  ) {
    console.log(
      "🔗 AlephScriptService initialized - Using new @alephscript/angular implementation"
    );
    console.log("🔌 Status inicial - isConnected:", this.connected());
    
    // 🔍 DEBUG: Inspect available properties
    console.log("🔍 [DEBUG] CoreAlephScript properties:", Object.keys(this.coreAlephScript));
    console.log("🔍 [DEBUG] CoreAlephScript messages:", this.coreAlephScript.messages);
    console.log("🔍 [DEBUG] CoreAlephScript systemMessages:", this.coreAlephScript.systemMessages);
    
    // 🔍 DEBUG: Test subscriptions to see what's available
    this.debugSubscriptions();
  }

  private debugSubscriptions() {
    console.log("🔍 [DEBUG] Setting up debug subscriptions...");
    
    // Test messages observable
    this.coreAlephScript.messages.subscribe(
      (msg: any) => console.log("🔥 [DEBUG] Message received:", msg),
      (err: any) => console.error("❌ [DEBUG] Message error:", err)
    );
    
    // Test systemMessages observable
    this.coreAlephScript.systemMessages.subscribe(
      (event: any) => console.log("🔥 [DEBUG] SystemMessage received:", event),
      (err: any) => console.error("❌ [DEBUG] SystemMessage error:", err)
    );
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
  getMessages(): Observable<AlephMessage> {
    if (this.fallbackModeEnabled) {
      return this.fallbackMessages$.asObservable();
    }

    // Transform AlephMessage to AlephScriptMessage for backward compatibility
    return this.coreAlephScript.messages.pipe(
      map((msg: AlephMessage) => {
        console.log('📨 [ALEPH-SERVICE] Processing message:', msg);
        return {
          id: msg.id,
          type: msg.type,
          data: msg.data,
          timestamp: msg.timestamp || Date.now(),
          source: msg.source,
          target: msg.target,
        };
      })
    );
  }

  /**
   * Get events as observable
   */
  getEvents(): Observable<any> {
    if (this.fallbackModeEnabled) {
      return this.fallbackEvents$.asObservable();
    }
    
    console.log('🎯 [ALEPH-SERVICE] Setting up events observable...');
    console.log('🎯 [ALEPH-SERVICE] Available observables:', {
      messages: !!this.coreAlephScript.messages,
      systemMessages: !!this.coreAlephScript.systemMessages,
      connectionStatus: !!this.coreAlephScript.connectionStatus
    });
    
    return this.coreAlephScript.systemMessages.pipe(
      map((event: any) => {
        console.log('🔥 [ALEPH-SERVICE] Processing system event:', event);
        return event;
      })
    );
  }

  /**
   * Get room events directly - alternative approach
   */
  getRoomEvents(): Observable<any> {
    console.log('🏠 [ALEPH-SERVICE] Setting up room events observable...');
    
    // Try to access the underlying socket client
    const socketClient = (this.coreAlephScript as any).socketClient;
    console.log('🔍 [ALEPH-SERVICE] Socket client:', socketClient);
    
    if (socketClient && socketClient.events$) {
      console.log('✅ [ALEPH-SERVICE] Found socket events$');
      return socketClient.events$.pipe(
        map((event: any) => {
          console.log('🏠 [ALEPH-SERVICE] Processing room event:', event);
          return event;
        })
      );
    } else {
      console.warn('⚠️ [ALEPH-SERVICE] No socket events$ found');
      return new Subject<any>().asObservable();
    }
  }

  /**
   * Configure the service
   */
  configure(config: Partial<AlephClientConfig>): void {
    this.config = { ...this.config, ...config };
    console.log("⚙️ AlephScript configurado:", this.config);

    if (!this.fallbackModeEnabled) {
      // No need for separate configure call - the core service handles configuration internally
    }
  }

  /**
   * Check if connected
   */
  connected(): boolean {
    if (this.fallbackModeEnabled) {
      return this.fallbackConnectionStatus$.value === "connected";
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
    // Check if already connected
    if (this.connected() && !this.fallbackModeEnabled) {
      console.log("⚠️ Already connected to AlephScript server");
      return;
    }

    if (this.fallbackModeEnabled) {
      console.log("🔄 Attempting reconnection from fallback mode...");
      this.fallbackModeEnabled = false;
      this.fallbackConnectionStatus$.next("connecting");
    }

    if (!isPlatformBrowser(this.platformId)) {
      console.log("🚫 Not in browser environment, enabling fallback mode");
      this.enableOfflineMode();
      return;
    }

    try {
      // Simply call connect on the core service
      this.coreAlephScript.connect();
    } catch (error) {
      console.error("❌ Connection failed:", error);
      this.handleConnectionError();
    }
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    console.log("🔌 Disconnecting from AlephScript server...");

    if (!this.fallbackModeEnabled) {
      this.coreAlephScript.disconnect();
    }

    if (this.fallbackModeEnabled) {
      this.fallbackConnectionStatus$.next("disconnected");
    }
  }

  /**
   * Enable offline mode
   */
  enableOfflineMode(): void {
    console.log("📴 Enabling offline mode...");
    this.fallbackModeEnabled = true;
    this.fallbackConnectionStatus$.next("offline");
  }

  /**
   * Send message
   */
  sendMessage(type: string, data: any): void {
    if (this.fallbackModeEnabled) {
      console.log("📴 Offline mode - message not sent:", { type, data });
      return;
    }

    try {
      // Use the core service's sendMessage directly
      this.coreAlephScript.sendMessage(type, data);
      console.log("📤 Message sent:", { type, data });
    } catch (error) {
      console.error("❌ Failed to send message:", error);
      this.handleConnectionError();
    }
  }

  /**
   * Handle connection errors
   */
  private handleConnectionError(): void {
    console.log("⚠️ Connection error detected");

    console.log("🔄 Enabling fallback mode due to connection error");
    this.enableOfflineMode();
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
