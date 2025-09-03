import { Injectable, Inject, PLATFORM_ID } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import { BehaviorSubject, Observable } from "rxjs";

interface AlephScriptConfig {
  clientId?: string;
  serverUrl?: string;
  debug?: boolean;
  autoConnect?: boolean;
}

@Injectable({
  providedIn: "root",
})
export class AlephScriptService {
  private alephClient: any = null;
  private connectionStatus$ = new BehaviorSubject<string>("initializing");
  private scriptsLoaded = false;
  private initPromise: Promise<void> | null = null;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    console.log("🔗 AlephScriptService initialized");
    // Auto-initialize in browser context
    if (isPlatformBrowser(this.platformId)) {
      this.initialize();
    }
  }

  /**
   * Initialize AlephScript by loading required scripts
   */
  private async initialize(): Promise<void> {
    // Prevent multiple initializations
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.loadScriptsAndConnect();
    return this.initPromise;
  }

  /**
   * Load Socket.IO and AlephScript client scripts dynamically
   */
  private async loadScriptsAndConnect(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      console.warn("AlephScriptService: Not in browser context");
      this.connectionStatus$.next("unavailable");
      return;
    }

    try {
      // Check if scripts are already loaded (e.g., via HTML in provideTemplate mode)
      const socketIOAlreadyLoaded = typeof (window as any).io !== "undefined";
      const alephScriptAlreadyLoaded =
        typeof (window as any).createAlephScriptClient !== "undefined";

      // Step 1: Load Socket.IO from CDN (only if not already loaded)
      if (!socketIOAlreadyLoaded) {
        await this.loadScript(
          "socket.io",
          "https://cdn.socket.io/4.7.5/socket.io.min.js",
          () => {
            return typeof (window as any).io !== "undefined";
          }
        );
      } else {
        console.log("✅ socket.io already loaded");
      }

      // Step 2: Load AlephScript Client from server assets (only if not already loaded)
      if (!alephScriptAlreadyLoaded) {
        await this.loadScript(
          "alephscript",
          "/assets/alephscript-client.js",
          () => {
            return (
              typeof (window as any).createAlephScriptClient !== "undefined"
            );
          }
        );
      } else {
        console.log("✅ alephscript already loaded");
      }

      this.scriptsLoaded = true;
      console.log("✅ All scripts loaded successfully");

      // Step 3: Create AlephScript client
      await this.createClient();
    } catch (error) {
      console.error("Failed to initialize AlephScript:", error);
      this.connectionStatus$.next("error");
      throw error;
    }
  }

  /**
   * Generic script loader with verification
   */
  private loadScript(
    name: string,
    src: string,
    verifyFn: () => boolean
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (verifyFn()) {
        console.log(`✅ ${name} already loaded`);
        resolve();
        return;
      }

      // Create and inject script tag
      const script = document.createElement("script");
      script.src = src;
      script.async = true;

      script.onload = () => {
        // Verify script loaded correctly
        setTimeout(() => {
          if (verifyFn()) {
            console.log(`✅ ${name} loaded successfully`);
            resolve();
          } else {
            reject(new Error(`${name} loaded but verification failed`));
          }
        }, 100);
      };

      script.onerror = () => {
        reject(new Error(`Failed to load ${name} from ${src}`));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Create AlephScript client instance
   */
  private async createClient(config?: AlephScriptConfig): Promise<void> {
    const createFn = (window as any).createAlephScriptClient;

    if (!createFn) {
      throw new Error("createAlephScriptClient function not available");
    }

    // Default configuration
    const defaultConfig = {
      clientId: "angular-threejs-ui",
      instanceId: `angular-${Date.now()}`,
      serverUrl: "http://localhost:3000",
      debug: true,
    };

    const finalConfig = { ...defaultConfig, ...config };

    try {
      this.alephClient = createFn(
        finalConfig.clientId,
        finalConfig.instanceId,
        finalConfig.serverUrl,
        finalConfig.debug
      );

      // Setup event listeners
      this.setupEventListeners();

      // Wait for connection
      await this.waitForConnection();

      this.connectionStatus$.next("connected");
      console.log("✅ AlephScript client connected successfully");
    } catch (error) {
      console.error("Failed to create AlephScript client:", error);
      this.connectionStatus$.next("error");
      throw error;
    }
  }

  /**
   * Setup AlephScript event listeners
   */
  private setupEventListeners(): void {
    if (!this.alephClient) return;

    this.alephClient.on("connected", () => {
      console.log("🔌 AlephScript connected");
      this.connectionStatus$.next("connected");
    });

    this.alephClient.on("disconnected", () => {
      console.log("🔌 AlephScript disconnected");
      this.connectionStatus$.next("disconnected");
    });

    this.alephClient.on("error", (error: any) => {
      console.error("AlephScript error:", error);
      this.connectionStatus$.next("error");
    });
  }

  /**
   * Wait for connection to be established
   */
  private waitForConnection(timeout: number = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkConnection = () => {
        if (
          this.alephClient?.connected ||
          this.alephClient?.socket?.connected
        ) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error("Connection timeout"));
        } else {
          setTimeout(checkConnection, 100);
        }
      };

      checkConnection();
    });
  }

  /**
   * Public API: Connect to AlephScript
   */
  async connect(config?: AlephScriptConfig): Promise<void> {
    if (this.connectionStatus$.value === "connected") {
      console.log("Already connected");
      return;
    }

    if (!this.scriptsLoaded) {
      await this.initialize();
    } else if (this.alephClient) {
      // Reconnect existing client
      this.alephClient.connect();
      await this.waitForConnection();
    } else {
      // Create new client with config
      await this.createClient(config);
    }
  }

  /**
   * Public API: Disconnect from AlephScript
   */
  disconnect(): void {
    if (this.alephClient) {
      this.alephClient.disconnect();
      this.connectionStatus$.next("disconnected");
    }
  }

  /**
   * Public API: Send event through AlephScript
   */
  emit(event: string, data: any): void {
    if (this.alephClient && this.isConnected()) {
      this.alephClient.emit(event, data);
    } else {
      console.warn(`Cannot emit ${event}: Not connected`);
    }
  }

  /**
   * Public API: Listen to events
   */
  on(event: string, callback: (data: any) => void): void {
    if (this.alephClient) {
      this.alephClient.on(event, callback);
    }
  }

  /**
   * Public API: Get connection status as Observable
   */
  getConnectionStatus(): Observable<string> {
    return this.connectionStatus$.asObservable();
  }

  /**
   * Public API: Check if connected
   */
  isConnected(): boolean {
    return this.connectionStatus$.value === "connected";
  }

  /**
   * Public API: Get raw client (use with caution)
   */
  getClient(): any {
    return this.alephClient;
  }

  // ===== LEGACY COMPATIBILITY METHODS =====

  get connectionStatus(): Observable<string> {
    return this.getConnectionStatus();
  }

  sendUserInput(input: string): void {
    if (!this.alephClient) return;
    console.log("📤 Sending user input:", input);
    this.alephClient.sendUserInput(input);
  }

  selectAgent(agentId: string): void {
    if (!this.alephClient) return;
    console.log("🎯 Selecting agent:", agentId);
    this.alephClient.selectAgent(agentId);
  }

  requestBotConfiguration(): void {
    if (!this.alephClient) return;
    console.log("🔧 Requesting bot configuration");
    this.alephClient.sendMessage({ action: "request_bot_configuration" });
  }

  sendHeartbeat(): void {
    if (!this.alephClient) return;
    this.alephClient.sendMessage({ action: "heartbeat" });
  }
}
