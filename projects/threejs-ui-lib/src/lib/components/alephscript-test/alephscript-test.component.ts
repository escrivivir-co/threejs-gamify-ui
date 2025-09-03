import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlephScriptService } from '../../core/services/alephscript.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-alephscript-test',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="alephscript-status">
      <h3>🔗 AlephScript Connection Status</h3>
      <div class="status-indicator" [class]="statusClass">
        {{ connectionStatus }}
      </div>
      <div class="controls" *ngIf="isConnected">
        <button (click)="sendTestMessage()">📤 Send Test Message</button>
        <button (click)="requestConfiguration()">🔧 Request Configuration</button>
      </div>
      <div class="debug-info" *ngIf="isConnected">
        <h4>Debug Info:</h4>
        <pre>{{ debugInfo | json }}</pre>
      </div>
    </div>
  `,
  styles: [`
    .alephscript-status {
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      padding: 15px;
      border-radius: 8px;
      border: 2px solid #333;
      min-width: 300px;
      z-index: 1000;
    }
    
    .status-indicator {
      padding: 8px 16px;
      border-radius: 4px;
      margin: 10px 0;
      font-weight: bold;
      text-align: center;
    }
    
    .status-indicator.connected {
      background: #4caf50;
      color: white;
    }
    
    .status-indicator.connecting {
      background: #ff9800;
      color: white;
    }
    
    .status-indicator.error {
      background: #f44336;
      color: white;
    }
    
    .status-indicator.disconnected {
      background: #757575;
      color: white;
    }
    
    .controls {
      display: flex;
      gap: 10px;
      margin: 10px 0;
    }
    
    .controls button {
      padding: 8px 12px;
      border: none;
      border-radius: 4px;
      background: #2196f3;
      color: white;
      cursor: pointer;
      font-size: 12px;
    }
    
    .controls button:hover {
      background: #1976d2;
    }
    
    .debug-info {
      margin-top: 15px;
      font-size: 11px;
    }
    
    .debug-info h4 {
      margin-bottom: 5px;
      color: #ccc;
    }
    
    .debug-info pre {
      background: #222;
      padding: 8px;
      border-radius: 4px;
      max-height: 150px;
      overflow-y: auto;
      color: #90caf9;
    }
  `]
})
export class AlephScriptTestComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  connectionStatus = 'Initializing...';
  statusClass = 'connecting';
  isConnected = false;
  debugInfo: any = {};
  
  constructor(private alephScript: AlephScriptService) {}
  
  ngOnInit(): void {
    // Subscribe to connection status
    this.alephScript.getConnectionStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe((status: string) => {
        this.connectionStatus = this.formatStatus(status);
        this.statusClass = this.getStatusClass(status);
        this.isConnected = status === 'connected';
        
        this.debugInfo = {
          status: status,
          timestamp: new Date().toISOString(),
          clientAvailable: this.alephScript.isSocketConnected(),
          scriptsLoaded: this.alephScript.isSocketConnected()
        };
        
        if (this.isConnected) {
          this.setupEventListeners();
        }
      });
    
    // Configure AlephScript
    this.alephScript.configure({
      serverUrl: 'http://localhost:3000',
      uiType: 'test-component',
      uiId: 'angular-test',
      debug: true
    });
  }
  
  private setupEventListeners(): void {
    this.alephScript.on('message', (data: any) => {
      console.log('📨 Received message in test component:', data);
      this.debugInfo.lastMessage = {
        data: data,
        timestamp: new Date().toISOString()
      };
    });
    
    this.alephScript.on('ui:notification', (data: any) => {
      console.log('🔔 UI Notification:', data);
      this.debugInfo.lastNotification = data;
    });
  }
  
  sendTestMessage(): void {
    const testMessage = {
      type: 'test_message',
      message: 'Hello from Angular AlephScript Test Component!',
      timestamp: Date.now(),
      component: 'AlephScriptTestComponent'
    };
    
    this.alephScript.sendUserAction('ui:test', testMessage);
    console.log('📤 Sent test message:', testMessage);
    
    this.debugInfo.lastSentMessage = testMessage;
  }
  
  requestConfiguration(): void {
    this.alephScript.sendMessage('bot_config_request', {
      requester: 'test-component',
      timestamp: Date.now()
    });
    console.log('🔧 Requested bot configuration');
    
    this.debugInfo.configurationRequested = new Date().toISOString();
  }
  
  private formatStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'initializing': 'Initializing AlephScript...',
      'connected': '✅ Connected to Server',
      'disconnected': '❌ Disconnected',
      'error': '⚠️ Connection Error',
      'unavailable': '🚫 Not Available'
    };
    return statusMap[status] || status;
  }
  
  private getStatusClass(status: string): string {
    const classMap: { [key: string]: string } = {
      'initializing': 'connecting',
      'connected': 'connected',
      'disconnected': 'disconnected',
      'error': 'error',
      'unavailable': 'error'
    };
    return classMap[status] || 'disconnected';
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.alephScript.disconnect();
  }
}
