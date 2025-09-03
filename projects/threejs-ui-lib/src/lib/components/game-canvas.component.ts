import { Component, OnInit, OnDestroy } from '@angular/core';
import { AlephScriptService } from '../core/services/alephscript.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-game-canvas',
  template: `
    <div class="game-container">
      <div class="connection-status" [class.connected]="isConnected">
        {{ connectionStatus }}
      </div>
      <div class="debug-info">
        <h3>AlephScript Debug Info</h3>
        <p>Status: {{ connectionStatus }}</p>
        <p>Connected: {{ isConnected }}</p>
        <button (click)="testConnection()" [disabled]="!isConnected">Test Connection</button>
        <button (click)="disconnect()">Disconnect</button>
        <button (click)="reconnect()">Reconnect</button>
      </div>
      <canvas #gameCanvas></canvas>
    </div>
  `,
  styles: [`
    .game-container {
      position: relative;
      width: 100%;
      height: 100vh;
      background: #000;
    }
    .connection-status {
      position: absolute;
      top: 10px;
      right: 10px;
      padding: 5px 10px;
      background: #f44336;
      color: white;
      border-radius: 4px;
      font-size: 12px;
      z-index: 1000;
    }
    .connection-status.connected {
      background: #4caf50;
    }
    .debug-info {
      position: absolute;
      top: 10px;
      left: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 15px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 1000;
    }
    .debug-info h3 {
      margin: 0 0 10px 0;
      font-size: 14px;
    }
    .debug-info p {
      margin: 5px 0;
    }
    .debug-info button {
      margin: 5px 5px 0 0;
      padding: 5px 10px;
      background: #2196f3;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 11px;
    }
    .debug-info button:disabled {
      background: #666;
      cursor: not-allowed;
    }
    canvas {
      width: 100%;
      height: 100%;
    }
  `]
})
export class GameCanvasComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  connectionStatus = 'Initializing...';
  isConnected = false;
  
  constructor(private alephScript: AlephScriptService) {}
  
  ngOnInit(): void {
    // Subscribe to connection status
    this.alephScript.getConnectionStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.connectionStatus = this.formatStatus(status);
        this.isConnected = status === 'connected';
        
        if (this.isConnected) {
          this.setupGameEventListeners();
        }
      });
    
    // Connect to AlephScript
    this.connectToAlephScript();
  }
  
  private async connectToAlephScript(): Promise<void> {
    try {
      await this.alephScript.connect({
        clientId: 'angular-game-canvas',
        serverUrl: 'http://localhost:3000',
        debug: true
      });
      
      console.log('✅ Game canvas connected to AlephScript');
      
      // Send initial event
      this.alephScript.emit('ui:ready', {
        component: 'game-canvas',
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('Failed to connect to AlephScript:', error);
    }
  }
  
  private setupGameEventListeners(): void {
    // Listen to game events
    this.alephScript.on('game:state', (data) => {
      console.log('Game state update:', data);
      // Update canvas based on game state
    });
    
    this.alephScript.on('player:move', (data) => {
      console.log('Player move:', data);
      // Update player position
    });
  }
  
  testConnection(): void {
    if (this.isConnected) {
      this.alephScript.emit('test:ping', {
        message: 'Test message from Angular',
        timestamp: Date.now()
      });
      console.log('📤 Sent test ping');
    }
  }
  
  disconnect(): void {
    this.alephScript.disconnect();
  }
  
  async reconnect(): Promise<void> {
    try {
      await this.alephScript.connect();
    } catch (error) {
      console.error('Reconnection failed:', error);
    }
  }
  
  private formatStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'initializing': 'Initializing AlephScript...',
      'connected': 'Connected to Server',
      'disconnected': 'Disconnected',
      'error': 'Connection Error',
      'unavailable': 'Not Available'
    };
    return statusMap[status] || status;
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.alephScript.disconnect();
  }
}
