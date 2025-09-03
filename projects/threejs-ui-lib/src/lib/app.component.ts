import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { BotListComponent } from './features/bot-management/bot-list.component';
import { MessagePanelComponent } from './features/message-panel/message-panel.component';
import { ThreeSceneService } from './shared/three/three-scene.service';
import { RxjsSocketBridge } from './core/bridge/rxjs-socket-bridge';
import { AlephScriptService } from './core/services/alephscript.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    BotListComponent,
    MessagePanelComponent
  ],
  template: `
    <div class="app-container">
      <!-- Loading overlay -->
      <div class="loading-overlay" *ngIf="isLoading">
        <div class="spinner"></div>
        <p>Initializing 3D Scene & Socket Connection...</p>
      </div>

      <!-- Three.js Canvas Container -->
      <div class="canvas-container" #canvasContainer></div>
      
      <!-- UI Overlay -->
      <div class="ui-overlay">
        <!-- Top Header -->
        <div class="header-panel ui-panel">
          <h1>ThreeGamificationUI</h1>
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
        
        <!-- Bottom Panel - Enhanced Controls -->
        <div class="bottom-panel ui-panel">
          <div class="controls-section">
            <button class="btn primary" (click)="toggleDemo()">
              {{ isDemoRunning ? 'Stop Demo' : 'Start Demo' }}
            </button>
            <button class="btn secondary" (click)="resetScene()">Reset Scene</button>
            <button class="btn" (click)="toggleFullscreen()">Fullscreen</button>
            <button class="btn" (click)="captureScreenshot()">Screenshot</button>
          </div>
          <div class="performance-section">
            <span class="performance-info">FPS: {{ currentFPS }}</span>
            <span class="performance-info">Objects: {{ sceneObjects }}</span>
            <span class="performance-info">Memory: {{ memoryUsage }}MB</span>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="footer-panel ui-panel">
          <div class="footer-content">
            <div class="footer-left">
              <span class="app-version">ThreeJS UI Library v{{ version }}</span>
              <span class="separator">|</span>
              <span class="engine-info">Three.js {{ threeVersion }}</span>
            </div>
            <div class="footer-center">
              <span class="status-text">{{ statusMessage }}</span>
            </div>
            <div class="footer-right">
              <button class="btn-icon" (click)="toggleSettings()" title="Settings">
                ⚙️
              </button>
              <button class="btn-icon" (click)="toggleHelp()" title="Help">
                ❓
              </button>
              <button class="btn-icon" (click)="toggleDebug()" title="Debug" [class.active]="debugMode">
                🐛
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('canvasContainer', { static: true }) canvasContainer!: ElementRef;
  
  private destroy$ = new Subject<void>();
  
  // Component state
  isLoading = true;
  connectionStatus = 'disconnected';
  isDemoRunning = false;
  currentFPS = 0;
  sceneObjects = 0;
  memoryUsage = 0;
  version = '1.0.0';
  threeVersion = '0.170.0';
  statusMessage = 'Initializing...';
  debugMode = false;

  constructor(
    private threeSceneService: ThreeSceneService,
    private alephScriptService: AlephScriptService,
    private rxjsSocketBridge: RxjsSocketBridge
  ) {}

  ngOnInit() {
    console.log('%c��� ThreeGamificationUI - AlephScript Integration v1.0 initializing...', 'color: #ff0099; font-weight: bold; font-size: 14px');
    
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
      this.statusMessage = 'Ready';
      
      // Start performance monitoring
      this.startPerformanceMonitoring();
      
      // Hide initial loading indicator
      const loadingElement = document.getElementById('loading');
      if (loadingElement) {
        loadingElement.style.display = 'none';
      }
      
      console.log('Three.js scene initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize Three.js scene:', error);
      this.isLoading = false;
    }
  }

  toggleDemo() {
    if (this.isDemoRunning) {
      console.log('Stopping demo...');
      // TODO: Stop demo client
      this.isDemoRunning = false;
    } else {
      console.log('Starting demo...');
      // TODO: Start demo client
      this.isDemoRunning = true;
    }
  }

  resetScene() {
    console.log('Resetting scene...');
    this.threeSceneService.reset();
  }

  ngOnDestroy() {
    console.log('App component destroying...');
    
    // Clean up subscriptions
    this.destroy$.next();
    this.destroy$.complete();
    
    // Clean up services
    this.threeSceneService.dispose();
    this.alephScriptService.disconnect();
  }
}
