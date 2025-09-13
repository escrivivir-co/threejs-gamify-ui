import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, Input, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { BotListComponent } from './features/bot-management/bot-list.component';
import { MessagePanelComponent } from './features/message-panel/message-panel.component';
import { AlephScriptTestComponent } from './components/alephscript-test/alephscript-test.component';
import { ThreeSceneService } from './shared/three/three-scene.service';
import { AlephScriptService } from './core/services/alephscript.service';

export interface ThreeJSUIConfig {
  gameTitle: string;
  serverUrl: string;
  alephScriptUrl: string;
  debugMode?: boolean;
}

@Component({
  selector: 'tjs-threejs-ui',
  standalone: true,
  imports: [
    CommonModule,
    BotListComponent,
    MessagePanelComponent,
    AlephScriptTestComponent
  ],
  template: `
    <div class="threejs-ui-container">
      <!-- Loading overlay -->
      <div class="loading-overlay" *ngIf="isLoading">
        <div class="spinner"></div>
        <p>Initializing 3D Scene & AlephScript Connection...</p>
      </div>

      <!-- Three.js Canvas Container -->
      <div class="canvas-container" #canvasContainer></div>
      
      <!-- UI Overlay -->
      <div class="ui-overlay">
        <!-- Top Header -->
        <div class="header-panel ui-panel">
          <h1>{{ config.gameTitle }}</h1>
          <div class="connection-status">
            <span class="status-indicator" [class]="connectionStatus"></span>
            AlephScript: {{ connectionStatus.toUpperCase() }}
          </div>
        </div>
        
        <!-- Left Panel - Bot Management -->
        <div class="left-panel">
          <app-bot-list></app-bot-list>
        </div>
        
        <!-- Right Panel - Message Stream -->
        <div class="right-panel">
          <app-message-panel></app-message-panel>
        </div>
        
        <!-- Bottom Panel - Controls -->
        <div class="bottom-panel ui-panel">
          <button class="btn" (click)="toggleDemo()">
            {{ isDemoRunning ? 'Stop Demo' : 'Start Demo' }}
          </button>
          <button class="btn" (click)="resetScene()">Reset Scene</button>
          
          <!-- Connection Controls -->
          <div class="connection-controls">
            <button class="btn btn-primary" 
                    *ngIf="connectionStatus === 'disconnected' || connectionStatus === 'error'"
                    (click)="connectToAlephScript()">
              {{ isLoading ? 'Connecting...' : 'Connect' }}
            </button>
            
            <button class="btn btn-danger" 
                    *ngIf="connectionStatus === 'connected'"
                    (click)="disconnectFromAlephScript()">
              Disconnect
            </button>
            
            <button class="btn btn-warning" 
                    (click)="toggleOfflineMode()">
              {{ alephScriptService.isFallbackMode() ? 'Try Reconnect' : 'Offline Mode' }}
            </button>
          </div>
          
          <span class="performance-info">FPS: {{ currentFPS }}</span>
        </div>
      </div>
      
      <!-- AlephScript Test Component -->
      <app-alephscript-test></app-alephscript-test>
    </div>
  `,
  styleUrls: ['./app.component.css']
})
export class ThreeJSUIComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('canvasContainer', { static: true }) canvasContainer!: ElementRef;
  @Input() config!: ThreeJSUIConfig;
  
  private destroy$ = new Subject<void>();
  
  // Component state
  isLoading = true;
  connectionStatus = 'disconnected';
  isDemoRunning = false;
  currentFPS = 0;

  constructor(
    private threeSceneService: ThreeSceneService,
    public alephScriptService: AlephScriptService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    console.log('🎮 ThreeJSUI Library - AlephScript Integration v2.0 initializing...');
    
    if (!this.config) {
      throw new Error('ThreeJSUIComponent requires config input');
    }
    
    // Subscribe to connection status with delay to avoid change detection issues
    this.alephScriptService.getConnectionStatus()
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe((status: string) => {
        this.connectionStatus = status;
        
        // Update loading state based on connection status
        if (status === 'offline' || status === 'connected') {
          this.isLoading = false;
        }
        
        // Handle fallback mode
        if (status === 'error' && this.alephScriptService.isFallbackMode()) {
          this.isLoading = false;
        }
        
        // Use setTimeout to defer change detection to next tick
        setTimeout(() => {
          this.cdr.detectChanges();
        }, 0);
      });

    // AlephScript auto-connects, no need to call connect()
  }

  ngAfterViewInit() {
    // Initialize Three.js scene after view is ready
    setTimeout(() => {
      this.initializeThreeScene();
    }, 100);
  }

  private async initializeThreeScene() {
    try {
      console.log('🌟 Initializing Three.js scene...');
      console.log('🔄 Loading spinner antes de Three.js init:', this.isLoading);
      
      // Initialize Three.js scene
      await this.threeSceneService.initialize(this.canvasContainer.nativeElement);
      
      // Start render loop
      this.threeSceneService.startRenderLoop();
      
      console.log('✅ Three.js scene initialized successfully');
      
      // Subscribe to FPS updates
      this.threeSceneService.fps
        .pipe(takeUntil(this.destroy$))
        .subscribe(fps => {
          this.currentFPS = Math.round(fps);
        });

      // Mark as loaded
      this.isLoading = false;
      
    } catch (error) {
      console.error('Failed to initialize Three.js scene:', error);
      this.isLoading = false;
    }
  }

  toggleDemo() {
    if (this.isDemoRunning) {
      console.log('Stopping demo...');
      this.isDemoRunning = false;
    } else {
      console.log('Starting demo...');
      this.isDemoRunning = true;
    }
  }

  resetScene() {
    console.log('Resetting scene...');
    this.threeSceneService.reset();
  }

  // Métodos de conexión
  connectToAlephScript(): void {
    console.log('🔌 Intentando conectar a AlephScript...');
    console.log('🔄 Loading spinner antes de connect:', this.isLoading);
    
    if (!this.alephScriptService.isSocketConnected()) {
      console.log('📡 Iniciando conexión - activando loading spinner');
      this.isLoading = true;
      this.alephScriptService.connect();
    } else {
      console.log('✅ AlephScript ya está conectado');
    }
  }

  disconnectFromAlephScript(): void {
    console.log('🔌 Desconectando de AlephScript...');
    this.alephScriptService.disconnect();
    this.connectionStatus = 'disconnected';
  }

  toggleOfflineMode(): void {
    console.log('🔄 Alternando modo offline...');
    console.log('🔄 Loading spinner antes de toggle offline:', this.isLoading);
    
    if (this.alephScriptService.isFallbackMode()) {
      // Intentar reconectar desde modo offline
      console.log('📡 Intentando reconectar desde modo offline - activando loading spinner');
      this.isLoading = true;
      this.alephScriptService.connect();
    } else {
      // Activar modo offline
      console.log('⚠️ Activando modo offline');
      this.alephScriptService.enableOfflineMode();
    }
  }

  ngOnDestroy() {
    console.log('ThreeJSUI component destroying...');
    
    // Clean up subscriptions
    this.destroy$.next();
    this.destroy$.complete();
    
    // Clean up services
    this.threeSceneService.dispose();
    this.alephScriptService.disconnect();
  }
}
