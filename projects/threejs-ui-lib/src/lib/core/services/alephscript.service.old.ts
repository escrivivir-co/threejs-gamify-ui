import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

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
  private socket: any = null;
  private isConnected = false;
  private fallbackModeEnabled = false;
  private connectionAttempts = 0;
  private maxConnectionAttempts = 3;
  private connectionTimeout: any = null;

  // Observables
  private connectionStatus$ = new BehaviorSubject<string>('disconnected');
  private messages$ = new Subject<AlephScriptMessage>();
  private eventSubject$ = new Subject<any>();

  // Default configuration
  private config: AlephScriptConfig = {
    serverUrl: 'ws://localhost:3000',
    timeout: 10000,
    debug: true,
    fallbackMode: true
  };

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    console.log('🔗 AlephScriptService initialized - Native implementation');
    console.log('🔌 Status inicial - isConnected:', this.isConnected);
    
    if (isPlatformBrowser(this.platformId)) {
      console.log('🌐 Ejecutando en browser - intentando auto-conexión');
      this.startConnectionWithTimeout();
    } else {
      console.log('🖥️ Ejecutando en servidor - saltando conexión');
    }
  }

  /**
   * Get connection status observable
   */
  getConnectionStatus(): Observable<string> {
    return this.connectionStatus$.asObservable();
  }

  /**
   * Get messages observable
   */
  getMessages(): Observable<AlephScriptMessage> {
    return this.messages$.asObservable();
  }

  /**
   * Get events observable
   */
  getEvents(): Observable<any> {
    return this.eventSubject$.asObservable();
  }

  /**
   * Configure the service
   */
  configure(config: Partial<AlephScriptConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('⚙️ AlephScript configurado:', this.config);
  }

  /**
   * Check if connected
   */
  connected(): boolean {
    return this.isConnected;
  }

  /**
   * Check if socket is connected
   */
  isSocketConnected(): boolean {
    return this.isConnected && !this.fallbackModeEnabled;
  }

  /**
   * Check if in fallback mode
   */
  isFallbackMode(): boolean {
    return this.fallbackModeEnabled;
  }

  /**
   * Connect to AlephScript server
   */
  async connect(config?: AlephScriptConfig): Promise<void> {
    if (config) {
      this.configure(config);
    }

    console.log('📡 Intentando conectar a:', this.config.serverUrl);
    this.connectionStatus$.next('connecting');

    if (!isPlatformBrowser(this.platformId)) {
      console.warn('⚠️ No es entorno browser, activando fallback mode');
      this.enableFallbackMode();
      return;
    }

    try {
      // Dynamically import socket.io-client
      const { io } = await import('socket.io-client');
      
      this.socket = io(this.config.serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: this.config.timeout,
        forceNew: true
      });

      this.setupEventHandlers();

    } catch (error) {
      console.error('❌ Error al conectar:', error);
      this.handleConnectionError();
    }
  }

  /**
   * Reconnect to server
   */
  reconnect(): void {
    console.log('🔄 Reconnecting...');
    this.disconnect();
    this.connect();
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    console.log('🔌 Desconectando...');
    
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnected = false;
    this.fallbackModeEnabled = false;
    this.connectionAttempts = 0;
    this.connectionStatus$.next('disconnected');
  }

  /**
   * Enable offline/fallback mode
   */
  enableOfflineMode(): void {
    this.enableFallbackMode();
  }

  /**
   * Send message to server
   */
  sendMessage(type: string, data: any): void {
    if (this.isConnected && this.socket) {
      const message = {
        id: this.generateId(),
        type,
        data,
        timestamp: Date.now()
      };
      
      console.log('📤 Enviando mensaje:', message);
      this.socket.emit('aleph_message', message);
    } else {
      console.warn('⚠️ No conectado - mensaje no enviado:', { type, data });
    }
  }

  /**
   * Send user action
   */
  sendUserAction(action: string, data: any): void {
    this.sendMessage('user_action', { action, ...data });
  }

  /**
   * Subscribe to events (compatibility method)
   */
  on(eventType: string, callback: (data: any) => void): void {
    if (eventType === 'message') {
      this.messages$.subscribe(callback);
    } else {
      this.eventSubject$.subscribe((event) => {
        if (event.type === eventType) {
          callback(event.data);
        }
      });
    }
  }

  /**
   * Start connection with timeout
   */
  private startConnectionWithTimeout(): void {
    console.log('⏱️ Iniciando conexión con timeout de', this.config.timeout, 'ms');
    
    this.connectionTimeout = setTimeout(() => {
      console.log('⏰ Timeout alcanzado, activando fallback mode');
      if (!this.isConnected && this.config.fallbackMode) {
        this.enableFallbackMode();
      }
    }, this.config.timeout);

    this.connect().catch((error) => {
      console.error('❌ Error en conexión inicial:', error);
      this.handleConnectionError();
    });
  }

  /**
   * Setup socket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Conectado a AlephScript server');
      this.isConnected = true;
      this.fallbackModeEnabled = false;
      this.connectionAttempts = 0;
      
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }
      
      this.connectionStatus$.next('connected');
      this.eventSubject$.next({ type: 'connected', data: {} });
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Desconectado de AlephScript server');
      this.isConnected = false;
      this.connectionStatus$.next('disconnected');
      this.eventSubject$.next({ type: 'disconnected', data: {} });
    });

    this.socket.on('connect_error', (error: any) => {
      console.error('❌ Error de conexión:', error.message);
      this.handleConnectionError();
    });

    // Handle incoming messages
    this.socket.on('aleph_message', (data: any) => {
      const message: AlephScriptMessage = {
        id: data.id || this.generateId(),
        type: data.type || 'generic',
        data: data.data || data,
        timestamp: Date.now(),
        source: data.source,
        target: data.target
      };
      
      this.messages$.next(message);
      this.eventSubject$.next({ type: 'message', data: message });
      
      if (this.config.debug) {
        console.log('📨 Mensaje recibido:', message);
      }
    });

    // Handle bot-specific events
    this.socket.on('bot_status', (data: any) => this.handleBotEvent('bot_status', data));
    this.socket.on('bot_response', (data: any) => this.handleBotEvent('bot_response', data));
    this.socket.on('system_event', (data: any) => this.handleBotEvent('system_event', data));
  }

  /**
   * Handle bot events
   */
  private handleBotEvent(type: string, data: any): void {
    const message: AlephScriptMessage = {
      id: this.generateId(),
      type,
      data,
      timestamp: Date.now()
    };
    
    this.messages$.next(message);
    this.eventSubject$.next({ type, data: message });
    
    if (this.config.debug) {
      console.log(`🤖 Bot ${type}:`, data);
    }
  }

  /**
   * Handle connection errors
   */
  private handleConnectionError(): void {
    this.connectionAttempts++;
    console.warn(`⚠️ Intento de conexión ${this.connectionAttempts}/${this.maxConnectionAttempts} falló`);
    
    if (this.connectionAttempts >= this.maxConnectionAttempts) {
      console.log('❌ Máximo de intentos alcanzado, activando fallback mode');
      this.enableFallbackMode();
    } else {
      this.connectionStatus$.next('error');
      this.eventSubject$.next({ 
        type: 'connection_error', 
        data: { attempts: this.connectionAttempts } 
      });
    }
  }

  /**
   * Enable fallback mode
   */
  private enableFallbackMode(): void {
    console.log('⚠️ Activando modo offline/fallback');
    this.fallbackModeEnabled = true;
    this.isConnected = false;
    
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.connectionStatus$.next('offline');
    this.eventSubject$.next({ type: 'fallback_mode', data: {} });
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  /**
   * Cleanup on destroy
   */
  ngOnDestroy(): void {
    this.disconnect();
    this.connectionStatus$.complete();
    this.messages$.complete();
    this.eventSubject$.complete();
  }
}
