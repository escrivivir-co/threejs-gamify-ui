import { Component, OnInit, OnDestroy, Input, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ThreeJSScenePureComponent, ThreeJSSceneConfig } from './threejs-scene-pure.component';
import { ThreeJSControlsComponent, ThreeJSControlsState, ThreeJSControlsEvents } from './threejs-controls.component';
import { ThreeJSHeaderComponent, ThreeJSHeaderState } from './threejs-header.component';
import { ThreeJSSidebarLeftComponent } from './threejs-sidebar-left.component';
import { ThreeJSSidebarRightComponent } from './threejs-sidebar-right.component';
import { ModalManagerComponent } from '../shared/components/modal-manager.component';

import { AlephScriptService } from '../core/services/alephscript.service';
import { ModalService } from '../shared/services/modal.service';
import { DemoMessageSimulator } from '../shared/simulation/demo-message-simulator';

export interface ThreeJSLayoutConfig {
  gameTitle: string;
  sceneConfig: ThreeJSSceneConfig;
  showHeader?: boolean;
  showLeftSidebar?: boolean;
  showRightSidebar?: boolean;
  showControls?: boolean;
  controlsPosition?: 'bottom' | 'top' | 'floating';
}

@Component({
  selector: 'tjs-threejs-layout',
  standalone: true,
  imports: [
    CommonModule,
    ThreeJSScenePureComponent,
    ThreeJSControlsComponent,
    ThreeJSHeaderComponent,
    ThreeJSSidebarLeftComponent,
    ThreeJSSidebarRightComponent,
    ModalManagerComponent
  ],
  template: `
    <div class="threejs-layout-container" [class]="layoutClass">
      <!-- Header -->
      <div class="layout-header" *ngIf="config.showHeader !== false">
        <tjs-threejs-header [state]="headerState"></tjs-threejs-header>
      </div>

      <!-- Main content area -->
      <div class="layout-main">
        <!-- Left sidebar -->
        <div class="layout-sidebar layout-sidebar-left" 
             *ngIf="config.showLeftSidebar !== false">
          <tjs-threejs-sidebar-left 
            (toggleBotManagement)="handleToggleBotManagement()">
          </tjs-threejs-sidebar-left>
        </div>

        <!-- Scene area -->
        <div class="layout-scene">
          <!-- Controls at top if configured -->
          <div class="layout-controls layout-controls-top" 
               *ngIf="config.showControls !== false && config.controlsPosition === 'top'">
            <tjs-threejs-controls 
              [state]="controlsState" 
              [events]="controlsEvents">
            </tjs-threejs-controls>
          </div>

          <!-- Pure Three.js scene -->
          <div class="scene-wrapper">
            <tjs-threejs-scene-pure
              #sceneComponent
              [config]="config.sceneConfig"
              (sceneReady)="handleSceneReady()"
              (connectionStatusChange)="handleConnectionStatusChange($event)"
              (sceneError)="handleSceneError($event)"
              (fpsUpdate)="handleFpsUpdate($event)"
              (particleCountUpdate)="handleParticleCountUpdate($event)"
              (animationCountUpdate)="handleAnimationCountUpdate($event)">
            </tjs-threejs-scene-pure>
          </div>

          <!-- Controls at bottom if configured -->
          <div class="layout-controls layout-controls-bottom" 
               *ngIf="config.showControls !== false && (config.controlsPosition === 'bottom' || !config.controlsPosition)">
            <tjs-threejs-controls 
              [state]="controlsState" 
              [events]="controlsEvents">
            </tjs-threejs-controls>
          </div>
        </div>

        <!-- Right sidebar -->
        <div class="layout-sidebar layout-sidebar-right" 
             *ngIf="config.showRightSidebar !== false">
          <tjs-threejs-sidebar-right 
            (toggleMessagePanel)="handleToggleMessagePanel()">
          </tjs-threejs-sidebar-right>
        </div>
      </div>

      <!-- Floating controls if configured -->
      <div class="layout-controls layout-controls-floating" 
           *ngIf="config.showControls !== false && config.controlsPosition === 'floating'">
        <tjs-threejs-controls 
          [state]="controlsState" 
          [events]="controlsEvents">
        </tjs-threejs-controls>
      </div>

      <!-- Modal manager -->
      <app-modal-manager></app-modal-manager>
    </div>
  `,
  styleUrls: ['./threejs-layout.component.css']
})
export class ThreeJSLayoutComponent implements OnInit, OnDestroy {
  @ViewChild('sceneComponent') sceneComponent!: ThreeJSScenePureComponent;
  @Input() config!: ThreeJSLayoutConfig;

  private destroy$ = new Subject<void>();

  // State objects
  public headerState: ThreeJSHeaderState = {
    gameTitle: '',
    connectionStatus: 'disconnected'
  };

  public controlsState: ThreeJSControlsState = {
    isDemoRunning: false,
    demoPhase: 'idle',
    demoSpeed: 'normal', // Changed from number to string
    demoChannel: 'app',
    demoMessagesCount: 0,
    isWireframeMode: false,
    currentFPS: 0,
    particleCount: 0,
    animationCount: 0,
    connectionStatus: 'disconnected',
    isLoading: false,
    isOfflineMode: false
  };

  // Event emitters for controls
  public controlsEvents: { [K in keyof ThreeJSControlsEvents]: any } = {
    toggleDemo: { emit: () => this.handleToggleDemo() },
    phaseChange: { emit: (phase: string) => this.handlePhaseChange(phase) },
    speedChange: { emit: (speed: string) => this.handleSpeedChange(speed) }, // Changed from number to string
    channelChange: { emit: (channel: string) => this.handleChannelChange(channel) },
    singleMessage: { emit: () => this.handleSingleMessage() },
    burst: { emit: () => this.handleBurst() },
    resetDemo: { emit: () => this.handleResetDemo() },
    toggleWireframe: { emit: () => this.handleToggleWireframe() },
    resetCamera: { emit: () => this.handleResetCamera() },
    takeScreenshot: { emit: () => this.handleTakeScreenshot() },
    resetScene: { emit: () => this.handleResetScene() },
    connect: { emit: () => this.handleConnect() },
    disconnect: { emit: () => this.handleDisconnect() },
    toggleOffline: { emit: () => this.handleToggleOffline() },
    openAlephScript: { emit: () => this.handleOpenAlephScript() },
    openSettings: { emit: () => this.handleOpenSettings() },
    openHelp: { emit: () => this.handleOpenHelp() },
    openAdvanced: { emit: () => this.handleOpenAdvanced() }
  };

  public get layoutClass(): string {
    const classes = ['layout'];
    if (this.config.showLeftSidebar !== false) classes.push('with-left-sidebar');
    if (this.config.showRightSidebar !== false) classes.push('with-right-sidebar');
    if (this.config.showHeader !== false) classes.push('with-header');
    if (this.config.showControls !== false) classes.push('with-controls');
    return classes.join(' ');
  }

  constructor(
    private alephScriptService: AlephScriptService,
    private modalService: ModalService,
    private demoSimulator: DemoMessageSimulator,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    if (!this.config) {
      throw new Error('ThreeJSLayoutComponent requires config input');
    }

    // Initialize header state
    this.headerState.gameTitle = this.config.gameTitle;

    // Subscribe to connection status
    this.alephScriptService.getConnectionStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe((status: string) => {
        this.headerState.connectionStatus = status;
        this.controlsState.connectionStatus = status;
        this.cdr.detectChanges();
      });

    // Subscribe to demo simulator status
    this.demoSimulator.status$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.controlsState.isDemoRunning = status.isRunning;
        this.cdr.detectChanges();
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Scene event handlers
  handleSceneReady() {
    console.log('🎬 Scene ready in layout');
  }

  handleConnectionStatusChange(status: string) {
    this.headerState.connectionStatus = status;
    this.controlsState.connectionStatus = status;
    this.cdr.detectChanges();
  }

  handleSceneError(error: Error) {
    console.error('❌ Scene error in layout:', error);
  }

  handleFpsUpdate(fps: number) {
    this.controlsState.currentFPS = fps;
  }

  handleParticleCountUpdate(count: number) {
    this.controlsState.particleCount = count;
  }

  handleAnimationCountUpdate(count: number) {
    this.controlsState.animationCount = count;
  }

  // Control event handlers
  handleToggleDemo() {
    if (this.sceneComponent) {
      if (this.controlsState.isDemoRunning) {
        this.sceneComponent.stopDemo();
      } else {
        this.sceneComponent.startDemo();
      }
    }
  }

  handlePhaseChange(phase: string) {
    if (this.sceneComponent) {
      this.sceneComponent.setDemoPhase(phase);
      this.controlsState.demoPhase = phase;
    }
  }

  handleSpeedChange(speed: string) {
    if (this.sceneComponent) {
      this.sceneComponent.setDemoSpeed(speed);
      this.controlsState.demoSpeed = speed;
    }
  }

  handleChannelChange(channel: string) {
    if (this.sceneComponent) {
      this.sceneComponent.setDemoChannel(channel);
      this.controlsState.demoChannel = channel;
    }
  }

  handleSingleMessage() {
    if (this.sceneComponent) {
      this.sceneComponent.sendSingleDemoMessage();
      this.controlsState.demoMessagesCount++;
    }
  }

  handleBurst() {
    if (this.sceneComponent) {
      this.sceneComponent.sendDemoBurst();
      this.controlsState.demoMessagesCount += 5;
    }
  }

  handleResetDemo() {
    if (this.sceneComponent) {
      this.sceneComponent.resetDemoSimulator();
      this.controlsState.demoMessagesCount = 0;
      this.controlsState.isDemoRunning = false;
    }
  }

  handleToggleWireframe() {
    if (this.sceneComponent) {
      this.sceneComponent.toggleWireframe();
      this.controlsState.isWireframeMode = !this.controlsState.isWireframeMode;
    }
  }

  handleResetCamera() {
    if (this.sceneComponent) {
      this.sceneComponent.resetCamera();
    }
  }

  handleTakeScreenshot() {
    if (this.sceneComponent) {
      this.sceneComponent.takeScreenshot();
    }
  }

  handleResetScene() {
    if (this.sceneComponent) {
      this.sceneComponent.resetScene();
    }
  }

  handleConnect() {
    this.controlsState.isLoading = true;
    if (this.sceneComponent) {
      this.sceneComponent.connectToAlephScript();
    } else {
      this.alephScriptService.connect();
    }
  }

  handleDisconnect() {
    if (this.sceneComponent) {
      this.sceneComponent.disconnectFromAlephScript();
    } else {
      this.alephScriptService.disconnect();
    }
  }

  handleToggleOffline() {
    this.controlsState.isOfflineMode = this.alephScriptService.isFallbackMode();
    if (this.controlsState.isOfflineMode) {
      this.handleConnect();
    } else {
      // Enable offline mode
      this.alephScriptService.enableOfflineMode();
    }
  }

  // Modal handlers
  handleOpenAlephScript() {
    this.modalService.open({
      id: 'alephscript-test',
      title: '⚡ AlephScript Connection',
      position: { x: 200, y: 200 },
      size: { width: 450, height: 400 },
      draggable: true,
      resizable: true,
      closable: true,
      minimizable: true
    });
  }

  handleOpenSettings() {
    this.modalService.open({
      id: 'settings',
      title: '⚙️ Settings',
      position: { x: 300, y: 150 },
      size: { width: 400, height: 500 },
      draggable: true,
      resizable: true,
      closable: true,
      minimizable: true
    });
  }

  handleOpenHelp() {
    this.modalService.open({
      id: 'help',
      title: '📖 Help & Controls',
      position: { x: 150, y: 100 },
      size: { width: 500, height: 600 },
      draggable: true,
      resizable: true,
      closable: true,
      minimizable: true
    });
  }

  handleOpenAdvanced() {
    this.modalService.open({
      id: 'demo-controls',
      title: '🎛️ Advanced Demo Controls',
      position: { x: 100, y: 150 },
      size: { width: 500, height: 600 },
      draggable: true,
      resizable: true,
      closable: true,
      minimizable: true
    });
  }

  // Sidebar handlers
  handleToggleBotManagement() {
    this.modalService.open({
      id: 'bot-management',
      title: '🤖 Bot Management',
      position: { x: 50, y: 120 },
      size: { width: 350, height: 500 },
      draggable: true,
      resizable: true,
      closable: true,
      minimizable: true
    });
  }

  handleToggleMessagePanel() {
    this.modalService.open({
      id: 'message-panel',
      title: '💬 Message Stream',
      position: { x: window.innerWidth - 400, y: 120 },
      size: { width: 380, height: 500 },
      draggable: true,
      resizable: true,
      closable: true,
      minimizable: true
    });
  }
}
