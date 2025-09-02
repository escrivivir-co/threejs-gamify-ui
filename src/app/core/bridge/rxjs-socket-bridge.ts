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
import { io, Socket } from 'socket.io-client';

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

@Injectable({
  providedIn: 'root'
})
export class RxjsSocketBridge implements ChannelManager, RoomManager, ReconnectionHandler {
  private socket: Socket | null = null;
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
    console.log('RxjsSocketBridge initialized');
    
    // Set up message distribution pipeline
    this.setupMessagePipeline();
    
    // Set up reconnection handling
    this.setupReconnectionHandler();
  }

  /**
   * Initialize connection to Socket.io server
   */
  connect(config?: ConnectionConfig): void {
    const defaultConfig: ConnectionConfig = {
      url: `http://localhost:8000`,
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
    
    console.log('Connecting to Socket.io server:', finalConfig.url);
    
    try {
      // Create socket connection
      this.socket = io(finalConfig.url, finalConfig.options);
      
      // Set up event handlers
      this.setupSocketEventHandlers();
      
      // Emit bridge event
      this.bridgeEvents$.next({
        type: 'connection',
        data: { config: finalConfig },
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('Failed to create socket connection:', error);
      this.errorStream$.next(error as Error);
    }
  }

  /**
   * Disconnect from Socket.io server
   */
  disconnect(): void {
    console.log('Disconnecting from Socket.io server');
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
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
   * Set up Socket.io event handlers
   */
  private setupSocketEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('Socket.io connected');
      this.connectionStatus$.next('connected');
      this.reconnectionAttempts = 0;
      this.isReconnecting$.next(false);
      this.stopReconnection();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket.io disconnected:', reason);
      this.connectionStatus$.next('disconnected');
      
      if (reason !== 'io client disconnect') {
        this.startReconnection();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket.io connection error:', error);
      this.connectionStatus$.next('error');
      this.errorStream$.next(error);
      this.startReconnection();
    });

    // Message events
    this.socket.on('message', (data: SocketMessage) => {
      this.handleIncomingMessage(data);
    });

    // Channel-specific events
    Object.values(ChannelType).forEach(channel => {
      this.socket!.on(`${channel}_message`, (data: SocketMessage) => {
        data.channel = channel as ChannelType;
        this.handleIncomingMessage(data);
      });
    });

    // Room events
    this.socket.on('room_joined', (roomId: string) => {
      console.log('Joined room:', roomId);
      this.activeRooms.add(roomId);
    });

    this.socket.on('room_left', (roomId: string) => {
      console.log('Left room:', roomId);
      this.activeRooms.delete(roomId);
    });
  }

  /**
   * Handle incoming messages and route to appropriate channels
   */
  private handleIncomingMessage(message: SocketMessage): void {
    try {
      // Add timestamp if not present
      if (!message.timestamp) {
        message.timestamp = Date.now();
      }

      // Add unique ID if not present
      if (!message.id) {
        message.id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }

      console.log('Received message:', message);

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
      console.error('Error handling incoming message:', error);
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
      console.log('Processed health check:', msg);
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
    // Note: In a production app, you'd want to manage subscriptions more granularly
    console.log(`Unsubscribe request for channel: ${channel}`);
  }

  emit(channel: ChannelType, message: SocketMessage): void {
    if (!this.socket || !this.socket.connected) {
      console.warn('Cannot emit message: Socket not connected');
      return;
    }

    try {
      // Ensure message has required fields
      const enrichedMessage: SocketMessage = {
        ...message,
        id: message.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: message.timestamp || Date.now(),
        channel
      };

      // Emit to specific channel
      this.socket.emit(`${channel}_message`, enrichedMessage);
      
      console.log('Emitted message to channel:', channel, enrichedMessage);

    } catch (error) {
      console.error('Error emitting message:', error);
      this.errorStream$.next(error as Error);
    }
  }

  getActiveChannels(): ChannelType[] {
    return Object.values(ChannelType);
  }

  // RoomManager implementation
  async join(roomId: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.socket || !this.socket.connected) {
        console.warn('Cannot join room: Socket not connected');
        resolve(false);
        return;
      }

      this.socket.emit('join_room', roomId, (success: boolean) => {
        if (success) {
          this.activeRooms.add(roomId);
          console.log('Successfully joined room:', roomId);
        } else {
          console.warn('Failed to join room:', roomId);
        }
        resolve(success);
      });
    });
  }

  async leave(roomId: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.socket || !this.socket.connected) {
        console.warn('Cannot leave room: Socket not connected');
        resolve(false);
        return;
      }

      this.socket.emit('leave_room', roomId, (success: boolean) => {
        if (success) {
          this.activeRooms.delete(roomId);
          console.log('Successfully left room:', roomId);
        } else {
          console.warn('Failed to leave room:', roomId);
        }
        resolve(success);
      });
    });
  }

  getRooms(): Room[] {
    return Array.from(this.activeRooms).map(id => ({
      id,
      name: id,
      subscribers: 1 // Simplified - in a real app you'd track this
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

  isReconnecting(): boolean {
    return this.isReconnecting$.value;
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
    
    console.log(`Attempting reconnection in ${delay}ms (attempt ${this.reconnectionAttempts + 1})`);

    this.reconnectionTimer = setTimeout(() => {
      this.reconnectionAttempts++;
      
      if (this.socket) {
        this.socket.connect();
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
    console.log('Disposing RxjsSocketBridge');
    
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
