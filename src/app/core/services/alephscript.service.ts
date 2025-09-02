import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AlephScriptService {
  private alephClient: any = null;
  private connectionStatus$ = new BehaviorSubject<string>('disconnected');

  constructor() {
    console.log('��� AlephScriptService initialized');
  }

  async connect(): Promise<void> {
    try {
      console.log('��� Connecting to AlephScript...');
      
      // Load AlephScript dynamically
      await this.loadAlephScript();
      
      // Create client
      this.alephClient = (window as any).createAlephScriptClient(
        'threejs',
        'threejs-visual', 
        'ws://localhost:8090'
      );

      // Setup event handlers
      this.setupEventHandlers();

      // Connect
      this.alephClient.connect();
      
    } catch (error) {
      console.error('❌ AlephScript connection failed:', error);
      this.connectionStatus$.next('error');
    }
  }

  private async loadAlephScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).createAlephScriptClient) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = '/assets/alephscript-client.js';
      script.onload = () => resolve();
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  private setupEventHandlers(): void {
    this.alephClient.on('connected', () => {
      console.log("%c✅ [SUCCESS] AlephScript connected to orchestrator - Custom Integration Active!", "color: #00ff00; font-weight: bold; background: #004400; padding: 2px");
      this.connectionStatus$.next('connected');
    });

    this.alephClient.on('disconnected', () => {
      console.log('❌ AlephScript disconnected');
      this.connectionStatus$.next('disconnected');
    });

    this.alephClient.on('error', (error: any) => {
      console.error('❌ AlephScript error:', error);
      this.connectionStatus$.next('error');
    });
  }

  get connectionStatus(): Observable<string> {
    return this.connectionStatus$.asObservable();
  }

  disconnect(): void {
    if (this.alephClient) {
      this.alephClient.disconnect();
    }
  }

  // ===== COMMUNICATION METHODS =====

  sendUserInput(input: string): void {
    if (!this.alephClient) return;
    console.log('📤 Sending user input:', input);
    this.alephClient.sendUserInput(input);
  }

  selectAgent(agentId: string): void {
    if (!this.alephClient) return;
    console.log('🎯 Selecting agent:', agentId);
    this.alephClient.selectAgent(agentId);
  }

  requestBotConfiguration(): void {
    if (!this.alephClient) return;
    console.log('🔧 Requesting bot configuration');
    this.alephClient.sendMessage({ action: 'request_bot_configuration' });
  }

  sendHeartbeat(): void {
    if (!this.alephClient) return;
    this.alephClient.sendMessage({ action: 'heartbeat' });
  }
}
