import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { BotListComponent } from './features/bot-management/bot-list.component';
import { MessagePanelComponent } from './features/message-panel/message-panel.component';
import { ThreeSceneService } from './shared/three/three-scene.service';
import { RxjsSocketBridge } from './core/bridge/rxjs-socket-bridge';
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
    MessagePanelComponent
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
          <span class="performance-info">FPS: {{ currentFPS }}</span>
        </div>
      </div>
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
    private alephScriptService: AlephScriptService,
    private rxjsSocketBridge: RxjsSocketBridge
  ) {}

  ngOnInit() {
    console.log('%c🎮 ThreeJSUI Library - AlephScript Integration v2.0 initializing...', 'color: #ff0099; font-weight: bold; font-size: 14px');
    
    if (!this.config) {
      throw new Error('ThreeJSUIComponent requires config input');
    }
    
    // Subscribe to connection status
    this.alephScriptService.connectionStatus
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.connectionStatus = status;
        console.log('Connection status:', status);
      });

    // Initialize AlephScript connection
    this.alephScriptService.connect();
  }

  ngAfterViewInit() {
    // Initialize Three.js scene after view is ready
    setTimeout(() => {
      this.initializeThreeScene();
    }, 100);
  }

  private async initializeThreeScene() {
    try {
      console.log('Initializing Three.js scene...');
      
      // Initialize Three.js scene
      await this.threeSceneService.initialize(this.canvasContainer.nativeElement);
      
      // Start render loop
      this.threeSceneService.startRenderLoop();
      
      // Subscribe to FPS updates
      this.threeSceneService.fps
        .pipe(takeUntil(this.destroy$))
        .subscribe(fps => {
          this.currentFPS = Math.round(fps);
        });

      // Mark as loaded
      this.isLoading = false;
      
      console.log('Three.js scene initialized successfully');
      
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
