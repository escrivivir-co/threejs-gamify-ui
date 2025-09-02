import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject, Observable, timer, NEVER } from 'rxjs';
import {
  filter,
  map,
  takeUntil,
  retry,
  retryWhen,
  delay,
  mergeMap,
  scan,
  throttleTime,
  debounceTime,
  share,
  shareReplay
} from 'rxjs/operators';

import {
  ChannelType,
  MessageType,
  SocketMessage,
  BaseMessage,
  BridgeEvent,
  ConnectionConfig,
  ChannelManager,
  RoomManager,
  ReconnectionHandler,
  Room
} from './interfaces';

// Declare global AlephScript client
declare global {
  interface Window {
    createAlephScriptClient: any;
  }
}

@Injectable({
  providedIn: 'root'
})
export class RxjsSocketBridge implements ChannelManager, RoomManager, ReconnectionHandler {
  private alephClient: any = null;
  private destroy$ = new Subject<void>();

  // Core subjects for reactive streams
  private connectionStatus$ = new BehaviorSubject<string>('disconnected');
  private messageStream$ = new Subject<SocketMessage>();
  private errorStream$ = new Subject<Error>();
  private bridgeEvents$ = new Subject<BridgeEvent>();

  // Channel-specific streams
  private sysChannel$ = new Subject<SocketMessage>();
  private appChannel$ = new Subject<SocketMessage>();
  private uiChannel$ = new Subject<SocketMessage>();

  // State management
  private activeRooms = new Set<string>();
  private reconnectionAttempts = 0;
  private maxReconnectionAttempts = 5;
  private isReconnecting$ = new BehaviorSubject<boolean>(false);
  private reconnectionTimer: any = null;

  // Public observables
  public readonly connectionStatus = this.connectionStatus$.asObservable();
  public readonly messages = this.messageStream$.asObservable().pipe(shareReplay(1));
  public readonly errors = this.errorStream$.asObservable();
  public readonly events = this.bridgeEvents$.asObservable();
  public readonly isReconnecting = this.isReconnecting$.asObservable();

  // Channel-specific observables
  public readonly sysMessages = this.sysChannel$.asObservable().pipe(shareReplay(1));
  public readonly appMessages = this.appChannel$.asObservable().pipe(shareReplay(1));
  public readonly uiMessages = this.uiChannel$.asObservable().pipe(shareReplay(1));

  constructor() {
    console.log('🔗 RxjsSocketBridge initialized with AlephScript');

    // Set up message distribution pipeline
    this.setupMessagePipeline();

    // Set up reconnection handling
    this.setupReconnectionHandler();

    // Load AlephScript client
    this.loadAlephScriptClient();
  }

  /**
   * Load AlephScript client library
   */
  private async loadAlephScriptClient(): Promise<void> {
    try {
      // Check if already loaded
      if (window.createAlephScriptClient) {
        console.log('✅ AlephScript client already available');
        return;
      }

      // Dynamically load the script
      const script = document.createElement('script');
      script.src = '/assets/alephscript-client.js';
      script.async = true;
      
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });

      console.log('✅ AlephScript client loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load AlephScript client:', error);
      this.errorStream$.next(error as Error);
    }
  }

  /**
   * Initialize connection to AlephScript server
   */
  connect(config?: ConnectionConfig): void {
    const defaultConfig: ConnectionConfig = {
      url: `ws://localhost:9090`,  // ✅ Puerto correcto para AlephScript
      options: {
        autoConnect: true,
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectionAttempts,
        reconnectionDelay: 1000,
        maxReconnectionDelay: 5000,
        reconnectionDelayMax: 5000,
        randomizationFactor: 0.5
      }
    };

    const finalConfig = config || defaultConfig;

    console.log('🚀 Connecting to AlephScript server:', finalConfig.url);

    try {
      // Wait for AlephScript client to be available
      this.waitForAlephScript().then(() => {
        // Create AlephScript client
        this.alephClient = window.createAlephScriptClient(
          'threejs',           // uiType
          'threejs-visual',    // clientId
          finalConfig.url      // serverUrl
        );

        // Set up event handlers
        this.setupAlephScriptEventHandlers();

        // Connect
        this.alephClient.connect();

        // Emit bridge event
        this.bridgeEvents$.next({
          type: 'connection',
          data: { config: finalConfig },
          timestamp: Date.now()
        });

      }).catch(error => {
        console.error('❌ Failed to initialize AlephScript client:', error);
        this.errorStream$.next(error);
      });

    } catch (error) {
      console.error('❌ Failed to create AlephScript connection:', error);
      this.errorStream$.next(error as Error);
    }
  }

  /**
   * Wait for AlephScript client to be available
   */
  private async waitForAlephScript(): Promise<void> {
    let attempts = 0;
    const maxAttempts = 50;

    while (!window.createAlephScriptClient && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (!window.createAlephScriptClient) {
      throw new Error('AlephScript client not available after waiting');
    }
  }

  /**
   * Set up AlephScript event handlers
   */
  private setupAlephScriptEventHandlers(): void {
    if (!this.alephClient) return;

    // Connection events
    this.alephClient.on('connected', () => {
      console.log('✅ AlephScript connected');
      this.connectionStatus$.next('connected');
      this.reconnectionAttempts = 0;
      this.isReconnecting$.next(false);
      this.stopReconnection();
    });

    this.alephClient.on('disconnected', () => {
      console.log('❌ AlephScript disconnected');
      this.connectionStatus$.next('disconnected');
      this.startReconnection();
    });

    this.alephClient.on('error', (error: any) => {
      console.error('❌ AlephScript error:', error);
      this.connectionStatus$.next('error');
      this.errorStream$.next(error);
      this.startReconnection();
    });

    // Game state events
    this.alephClient.on('gameStateUpdate', (data: any) => {
      const message: SocketMessage = this.convertToSocketMessage(data, ChannelType.APP, MessageType.SYSTEM_EVENT);
      this.handleIncomingMessage(message);
    });

    // Agent events
    this.alephClient.on('agentSelected', (data: any) => {
      const message: SocketMessage = this.convertToSocketMessage(data, ChannelType.APP, MessageType.BOT_COMMAND);
      this.handleIncomingMessage(message);
    });

    // Postulation events
    this.alephClient.on('postulationsUpdate', (data: any) => {
      const message: SocketMessage = this.convertToSocketMessage(data, ChannelType.UI, MessageType.SYSTEM_EVENT);
      this.handleIncomingMessage(message);
    });

    // X value events
    this.alephClient.on('xValueUpdate', (data: any) => {
      const message: SocketMessage = this.convertToSocketMessage(data, ChannelType.SYS, MessageType.SYSTEM_EVENT);
      this.handleIncomingMessage(message);
    });

    // Console output events
    this.alephClient.on('consoleOutput', (data: any) => {
      const message: SocketMessage = this.convertToSocketMessage(data, ChannelType.SYS, MessageType.SYSTEM_EVENT);
      this.handleIncomingMessage(message);
    });

    // Heartbeat events
    this.alephClient.on('heartbeat', (data: any) => {
      const message: SocketMessage = this.convertToSocketMessage(data, ChannelType.SYS, MessageType.HEALTH_CHECK);
      this.handleIncomingMessage(message);
    });
  }

  /**
   * Convert AlephScript data to SocketMessage format
   */
  private convertToSocketMessage(data: any, channel: ChannelType, type: MessageType): SocketMessage {
    return {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      channel,
      type,
      action: data.action || 'update',
      data: data,
      source: 'alephscript'
    } as SocketMessage;
  }

  /**
   * Disconnect from AlephScript server
   */
  disconnect(): void {
    console.log('🔌 Disconnecting from AlephScript server');

    if (this.alephClient) {
      this.alephClient.disconnect();
      this.alephClient = null;
    }

    this.connectionStatus$.next('disconnected');
    this.activeRooms.clear();
    this.stopReconnection();

    this.bridgeEvents$.next({
      type: 'disconnection',
      timestamp: Date.now()
    });
  }

  /**
   * Handle incoming messages and route to appropriate channels
   */
  private handleIncomingMessage(message: SocketMessage): void {
    try {
      console.log('📨 Received message:', message);

      // Emit to main stream
      this.messageStream$.next(message);

      // Route to channel-specific streams
      switch (message.channel) {
        case ChannelType.SYS:
          this.sysChannel$.next(message);
          break;
        case ChannelType.APP:
          this.appChannel$.next(message);
          break;
        case ChannelType.UI:
          this.uiChannel$.next(message);
          break;
      }

      // Emit bridge event
      this.bridgeEvents$.next({
        type: 'message',
        data: message,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('❌ Error handling incoming message:', error);
      this.errorStream$.next(error as Error);
    }
  }

  /**
   * Set up message distribution pipeline with RxJS operators
   */
  private setupMessagePipeline(): void {
    // Throttled message processing to prevent flooding
    const throttledMessages$ = this.messageStream$.pipe(
      throttleTime(50), // Max 20 messages per second
      takeUntil(this.destroy$)
    );

    // Debounced high-frequency events
    const debouncedEvents$ = this.messageStream$.pipe(
      filter(msg => msg.type === MessageType.HEALTH_CHECK),
      debounceTime(1000), // Debounce health checks
      takeUntil(this.destroy$)
    );

    // Subscribe to processed streams
    throttledMessages$.subscribe(msg => {
      // Additional processing if needed
    });

    debouncedEvents$.subscribe(msg => {
      console.log('💓 Processed health check:', msg);
    });
  }

  /**
   * Set up automatic reconnection handling
   */
  private setupReconnectionHandler(): void {
    this.connectionStatus$.pipe(
      filter(status => status === 'disconnected' || status === 'error'),
      debounceTime(1000),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      if (!this.isReconnecting$.value && this.reconnectionAttempts < this.maxReconnectionAttempts) {
        this.startReconnection();
      }
    });
  }

  // ChannelManager implementation
  subscribe(channel: ChannelType, callback: (message: SocketMessage) => void): void {
    const stream$ = this.getChannelStream(channel);
    stream$.pipe(takeUntil(this.destroy$)).subscribe(callback);
  }

  unsubscribe(channel: ChannelType, callback?: (message: SocketMessage) => void): void {
    console.log(`🔕 Unsubscribe request for channel: ${channel}`);
  }

  emit(channel: ChannelType, message: SocketMessage): void {
    if (!this.alephClient || !this.alephClient.isConnected()) {
      console.warn('⚠️ Cannot emit message: AlephScript not connected');
      return;
    }

    try {
      // Convert message to AlephScript format and send
      switch (message.type) {
        case MessageType.USER_ACTION:
          this.alephClient.sendUserInput((message as any).action || 'action');
          break;
        case MessageType.BOT_COMMAND:
          this.alephClient.selectAgent((message as any).botId || 'agent');
          break;
        default:
          // Generic send
          this.alephClient.sendMessage(message);
      }

      console.log('📤 Emitted message via AlephScript:', channel, message);

    } catch (error) {
      console.error('❌ Error emitting message:', error);
      this.errorStream$.next(error as Error);
    }
  }

  getActiveChannels(): ChannelType[] {
    return Object.values(ChannelType);
  }

  // RoomManager implementation
  async join(roomId: string): Promise<boolean> {
    try {
      if (!this.alephClient || !this.alephClient.isConnected()) {
        console.warn('⚠️ Cannot join room: AlephScript not connected');
        return false;
      }

      // AlephScript handles rooms automatically, so we just track it
      this.activeRooms.add(roomId);
      console.log('🏠 Joined room:', roomId);
      return true;

    } catch (error) {
      console.error('❌ Error joining room:', error);
      return false;
    }
  }

  async leave(roomId: string): Promise<boolean> {
    try {
      this.activeRooms.delete(roomId);
      console.log('🚪 Left room:', roomId);
      return true;

    } catch (error) {
      console.error('❌ Error leaving room:', error);
      return false;
    }
  }

  getRooms(): Room[] {
    return Array.from(this.activeRooms).map(id => ({
      id,
      name: id,
      subscribers: 1 // Simplified
    }));
  }

  isInRoom(roomId: string): boolean {
    return this.activeRooms.has(roomId);
  }

  // ReconnectionHandler implementation
  start(): void {
    this.startReconnection();
  }

  stop(): void {
    this.stopReconnection();
  }

  getAttempts(): number {
    return this.reconnectionAttempts;
  }

  // Private helper methods
  private getChannelStream(channel: ChannelType): Observable<SocketMessage> {
    switch (channel) {
      case ChannelType.SYS:
        return this.sysMessages;
      case ChannelType.APP:
        return this.appMessages;
      case ChannelType.UI:
        return this.uiMessages;
      default:
        return this.messages.pipe(filter(msg => msg.channel === channel));
    }
  }

  private startReconnection(): void {
    if (this.isReconnecting$.value || this.reconnectionAttempts >= this.maxReconnectionAttempts) {
      return;
    }

    this.isReconnecting$.next(true);
    this.connectionStatus$.next('connecting');

    // Exponential backoff
    const delay = Math.min(1000 * Math.pow(2, this.reconnectionAttempts), 30000);

    console.log(`🔄 Attempting reconnection in ${delay}ms (attempt ${this.reconnectionAttempts + 1})`);

    this.reconnectionTimer = setTimeout(() => {
      this.reconnectionAttempts++;

      if (this.alephClient) {
        this.alephClient.connect();
      }

      // If this attempt fails, the error handler will trigger another attempt
      setTimeout(() => {
        if (this.connectionStatus$.value !== 'connected') {
          this.isReconnecting$.next(false);
        }
      }, 5000);

    }, delay);
  }

  private stopReconnection(): void {
    if (this.reconnectionTimer) {
      clearTimeout(this.reconnectionTimer);
      this.reconnectionTimer = null;
    }
    this.isReconnecting$.next(false);
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    console.log('🧹 Disposing RxjsSocketBridge');

    this.destroy$.next();
    this.destroy$.complete();

    this.disconnect();

    // Complete all subjects
    this.connectionStatus$.complete();
    this.messageStream$.complete();
    this.errorStream$.complete();
    this.bridgeEvents$.complete();
    this.sysChannel$.complete();
    this.appChannel$.complete();
    this.uiChannel$.complete();
    this.isReconnecting$.complete();
  }
}