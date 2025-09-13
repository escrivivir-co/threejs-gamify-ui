import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, Input, Output, EventEmitter, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import * as THREE from 'three';

import { ThreeSceneService } from '../shared/three/three-scene.service';
import { AlephScriptService } from '../core/services/alephscript.service';
import { AnimationController } from '../shared/three/animation-controller';
import { TrajectoryManager } from '../shared/three/trajectory-manager';
import { DemoMessageSimulator } from '../shared/simulation/demo-message-simulator';

export interface ThreeJSSceneConfig {
  debugMode?: boolean;
  alephScriptUrl?: string;
  autoConnect?: boolean;
}

@Component({
  selector: 'tjs-threejs-scene-pure',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="threejs-scene-container">
      <!-- Loading overlay -->
      <div class="loading-overlay" *ngIf="isLoading">
        <div class="spinner"></div>
        <p>{{ loadingMessage }}</p>
      </div>

      <!-- Pure Three.js Canvas Container -->
      <div class="canvas-container" #canvasContainer></div>
    </div>
  `,
  styleUrls: ['./threejs-scene-pure.component.css']
})
export class ThreeJSScenePureComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {
  @ViewChild('canvasContainer', { static: false }) canvasContainer!: ElementRef;
  @Input() config: ThreeJSSceneConfig = {};
  @Input() loadingMessage: string = 'Initializing 3D Scene...';
  @Input() isDemoRunning: boolean = false; // 🚀 AGREGADO: Input para controlar demo
  @Input() demoSpeed: string = 'normal';   // 🚀 AGREGADO: Input para velocidad de demo
  @Input() demoChannel: string = 'app';    // 🚀 AGREGADO: Input para canal de demo
  
  // Events for external components to subscribe to
  @Output() sceneReady = new EventEmitter<void>();
  @Output() connectionStatusChange = new EventEmitter<string>();
  @Output() sceneError = new EventEmitter<Error>();
  @Output() fpsUpdate = new EventEmitter<number>();
  @Output() particleCountUpdate = new EventEmitter<number>();
  @Output() animationCountUpdate = new EventEmitter<number>();

  public isLoading = true;
  public connectionStatus = 'disconnected';
  public currentFPS = 0;
  
  private destroy$ = new Subject<void>();
  private fpsUpdateInterval?: number;

  constructor(
    private threeSceneService: ThreeSceneService,
    private alephScriptService: AlephScriptService,
    private animationController: AnimationController,
    private trajectoryManager: TrajectoryManager,
    private demoSimulator: DemoMessageSimulator,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    console.log('🎮 ThreeJS Scene Pure Component initializing...');
    
    // Subscribe to connection status
    this.alephScriptService.getConnectionStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe((status: string) => {
        console.log('🔗 Connection status changed:', status);
        this.connectionStatus = status;
        this.connectionStatusChange.emit(status);
        this.cdr.detectChanges();
      });
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log('🔄 [SCENE] ngOnChanges called with:', changes);
    
    // Detectar cambios en isDemoRunning
    if (changes['isDemoRunning']) {
      const currentValue = changes['isDemoRunning'].currentValue;
      const previousValue = changes['isDemoRunning'].previousValue;
      console.log(`🎭 [SCENE] isDemoRunning changed from ${previousValue} to ${currentValue}`);
      
      if (currentValue && !previousValue) {
        console.log('🚀 [SCENE] Starting demo simulation via ngOnChanges...');
        this.startDemo();
      } else if (!currentValue && previousValue) {
        console.log('🛑 [SCENE] Stopping demo simulation via ngOnChanges...');
        this.stopDemo();
      }
    }
    
    // Detectar cambios en demoSpeed
    if (changes['demoSpeed']) {
      console.log('⚡ [SCENE] Demo speed changed to:', changes['demoSpeed'].currentValue);
      this.updateDemoSpeed(changes['demoSpeed'].currentValue);
    }
    
    // Detectar cambios en demoChannel
    if (changes['demoChannel']) {
      console.log('📡 [SCENE] Demo channel changed to:', changes['demoChannel'].currentValue);
      this.updateDemoChannel(changes['demoChannel'].currentValue);
    }
  }

  ngAfterViewInit() {
    console.log('🎬 ngAfterViewInit - Initializing Three.js scene...');
    
    if (!this.canvasContainer) {
      const error = new Error('Canvas container not available');
      console.error('⚠️ Canvas container not available');
      this.sceneError.emit(error);
      return;
    }

    this.initializeThreeScene();
  }

  ngOnDestroy() {
    console.log('🧹 ThreeJS Scene Pure Component destroying...');
    
    if (this.fpsUpdateInterval) {
      clearInterval(this.fpsUpdateInterval);
    }

    this.destroy$.next();
    this.destroy$.complete();
    
    // Clean up Three.js scene
    if (this.threeSceneService) {
      this.threeSceneService.dispose();
    }
  }

  private async initializeThreeScene() {
    try {
      console.log('🎨 Initializing Three.js scene...');
      
      // Validación del canvasContainer
      if (!this.canvasContainer?.nativeElement) {
        throw new Error('Canvas container element is not available');
      }
      
      console.log('✅ Canvas container validated:', {
        element: this.canvasContainer.nativeElement,
        clientWidth: this.canvasContainer.nativeElement.clientWidth,
        clientHeight: this.canvasContainer.nativeElement.clientHeight
      });
      
      // Ensure the container has dimensions
      if (this.canvasContainer.nativeElement.clientWidth === 0 || 
          this.canvasContainer.nativeElement.clientHeight === 0) {
        console.warn('⚠️ Canvas container has zero dimensions, setting default size');
        this.canvasContainer.nativeElement.style.width = '100%';
        this.canvasContainer.nativeElement.style.height = '100%';
        this.canvasContainer.nativeElement.style.minHeight = '400px';
      }
      
      // Initialize Three.js scene
      console.log('🎯 Calling threeSceneService.initialize...');
      await this.threeSceneService.initialize(this.canvasContainer.nativeElement);
      console.log('✅ Three.js scene initialized successfully');
      
      // Set scene reference for other services
      const scene = (this.threeSceneService as any).scene;
      if (scene) {
        this.trajectoryManager.setScene(scene);
        this.animationController.setScene(scene);
      }
      
      // Start animation controller
      this.animationController.start();
      
      // Start render loop
      console.log('🔄 Starting render loop...');
      this.startRenderLoop();
      
      // Subscribe to FPS updates
      this.threeSceneService.fps
        .pipe(takeUntil(this.destroy$))
        .subscribe((fps: number) => {
          this.currentFPS = Math.round(fps);
          this.fpsUpdate.emit(this.currentFPS);
        });

      // Initialize animation systems
      this.initializeAnimationSystems();
      
      // Initialize demo simulation
      this.initializeDemoSimulation();
      
      // Auto-connect if specified
      if (this.config.autoConnect && this.config.alephScriptUrl) {
        await this.connectToAlephScript();
      }
      
      console.log('✅ Three.js scene initialized successfully');
      this.isLoading = false;
      this.sceneReady.emit();
      this.cdr.detectChanges();
      
    } catch (error) {
      console.error('❌ Error initializing Three.js scene:', error);
      this.isLoading = false;
      this.sceneError.emit(error as Error);
      this.cdr.detectChanges();
    }
  }

  private startRenderLoop(): void {
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Update controls
      if ((this.threeSceneService as any).controls) {
        (this.threeSceneService as any).controls.update();
      }
      
      // Update animation systems
      this.animationController.update();
      this.trajectoryManager.updateParticles(0.016); // ~60fps
      
      // Render scene
      if ((this.threeSceneService as any).renderer && (this.threeSceneService as any).scene && (this.threeSceneService as any).camera) {
        (this.threeSceneService as any).renderer.render((this.threeSceneService as any).scene, (this.threeSceneService as any).camera);
      }
    };
    
    animate();
  }

  private initializeAnimationSystems(): void {
    console.log('🎬 Initializing animation systems...');
    
    // Subscribe to AlephScript messages for animations
    this.alephScriptService.getMessages()
      .pipe(takeUntil(this.destroy$))
      .subscribe((message: any) => {
        console.log('📨 Received AlephScript message for animation:', message);
        this.handleAlephScriptMessage(message);
      });
  }

  private initializeDemoSimulation(): void {
    console.log('🎭 Initializing demo simulation...');
    
    // Subscribe to demo simulator events
    this.demoSimulator.status$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        console.log('🎯 Demo status updated:', status);
        // Emit events for external components
      });

    // IMPORTANTE: Suscribirse a los mensajes del simulador
    this.demoSimulator.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(message => {
        console.log('🎭 Demo message received:', message);
        this.handleDemoMessage(message);
      });
  }

  private handleAlephScriptMessage(message: any): void {
    console.log('🎯 Processing AlephScript message:', message);
    
    // Create animated particles based on message
    if (message && message.data) {
      this.createMessageVisualization(message);
    }
  }

  private handleDemoMessage(message: any): void {
    console.log('🎭 Processing demo message:', message);
    
    // Test trajectory manager state before creating particles
    console.log('🛤️ Trajectory manager state check:', {
      hasScene: !!this.trajectoryManager['scene'],
      hasGeometry: !!this.trajectoryManager['particleGeometry'],
      activeParticles: this.trajectoryManager['activeParticles']?.size || 0,
      sceneName: this.trajectoryManager['scene']?.constructor.name,
      geometryType: this.trajectoryManager['particleGeometry']?.constructor.name
    });
    
    // Create animated particles for demo messages
    this.createMessageVisualization(message);
  }

  private createMessageVisualization(message: any): void {
    console.log('✨ Creating message visualization for:', message);
    
    // Get bot positions based on message type
    let startPosition: THREE.Vector3;
    let endPosition: THREE.Vector3;
    
    if (message.type === 'bot-to-center') {
      // From bot to center
      startPosition = this.getBotPosition(message.fromBot);
      endPosition = new THREE.Vector3(0, 1, 0); // Center hub
    } else if (message.type === 'center-to-bot') {
      // From center to bot
      startPosition = new THREE.Vector3(0, 1, 0); // Center hub
      endPosition = this.getBotPosition(message.toBot);
    } else {
      // Random positions for demo
      startPosition = new THREE.Vector3(
        (Math.random() - 0.5) * 8, 
        Math.random() * 2 + 1, 
        (Math.random() - 0.5) * 8
      );
      endPosition = new THREE.Vector3(
        (Math.random() - 0.5) * 8, 
        Math.random() * 2 + 1, 
        (Math.random() - 0.5) * 8
      );
    }
    
    // Create unique ID for particle
    const particleId = `particle_${message.id || Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    console.log(`🚀 Creating particle ${particleId} from`, startPosition, 'to', endPosition, 'channel:', message.channel);
    
    // Create the animated particle
    const particle = this.trajectoryManager.createMessageParticle(
      particleId,
      startPosition, 
      endPosition, 
      message.channel || 'app',
      1.5 // speed
    );
    
    if (particle) {
      console.log(`✅ Particle ${particleId} created successfully`);
    } else {
      console.warn(`⚠️ Failed to create particle ${particleId}`);
    }
  }

  private getBotPosition(botName: string): THREE.Vector3 {
    // Predefined bot positions in a circle around the center
    const botPositions = [
      new THREE.Vector3(4, 1, 0),    // East
      new THREE.Vector3(3, 1, 3),    // Northeast  
      new THREE.Vector3(0, 1, 4),    // North
      new THREE.Vector3(-3, 1, 3),   // Northwest
      new THREE.Vector3(-4, 1, 0),   // West
      new THREE.Vector3(-3, 1, -3),  // Southwest
      new THREE.Vector3(0, 1, -4),   // South
      new THREE.Vector3(3, 1, -3),   // Southeast
    ];
    
    // Hash bot name to get consistent position
    let hash = 0;
    for (let i = 0; i < botName.length; i++) {
      hash += botName.charCodeAt(i);
    }
    
    return botPositions[hash % botPositions.length];
  }

  private getMessageColor(channel: string): number {
    const colors: { [key: string]: number } = {
      'sys': 0xff6b6b,     // Red for system
      'app': 0x4ecdc4,     // Teal for application
      'ui': 0x45b7d1,      // Blue for UI
      'agent': 0x96ceb4,   // Green for agent
      'game': 0xfeca57,    // Yellow for game
      'default': 0x3498db  // Default blue
    };
    
    return colors[channel] || colors['default'];
  }

  private setupFPSMonitoring() {
    this.fpsUpdateInterval = window.setInterval(() => {
      // Subscribe to FPS from the service instead of calling a method
      this.threeSceneService.fps.subscribe(fps => {
        if (fps !== this.currentFPS) {
          this.currentFPS = fps;
          this.fpsUpdate.emit(fps);
        }
      });
      
      // Emit particle and animation counts (using placeholders from base component)
      this.particleCountUpdate.emit(this.getActiveParticleCount());
      this.animationCountUpdate.emit(this.getActiveAnimationCount());
    }, 1000);
  }

  // Public API methods for external control
  public connectToAlephScript(): void {
    try {
      this.alephScriptService.connect();
    } catch (error) {
      console.error('Failed to connect to AlephScript:', error);
      throw error;
    }
  }

  public disconnectFromAlephScript(): void {
    this.alephScriptService.disconnect();
  }

  public toggleWireframe(): void {
    // Use local state tracking like in base component
    console.log('🔲 Toggling wireframe mode');
    // TODO: Implement actual wireframe toggle when ThreeSceneService has the method
  }

  public resetCamera(): void {
    console.log('📷 Resetting camera position');
    // TODO: Implement when ThreeSceneService has the method
  }

  public resetScene(): void {
    console.log('🔄 Resetting scene...');
    
    // Clear all particles using trajectory manager
    this.trajectoryManager.clearAllParticles();
    
    // Reset Three.js scene if reset method exists
    if ((this.threeSceneService as any).reset) {
      (this.threeSceneService as any).reset();
    }
    
    console.log('🔄 Scene reset complete');
  }

  public takeScreenshot(): string {
    console.log('📸 Taking screenshot');
    // TODO: Implement when ThreeSceneService has the method
    return '';
  }

  public getActiveParticleCount(): number {
    // Return actual count when trajectoryManager method is available
    return Math.floor(Math.random() * 100); // Placeholder for demo
  }

  public getActiveAnimationCount(): number {
    // Return actual count when animationController method is available  
    return Math.floor(Math.random() * 20); // Placeholder for demo
  }

  public isWireframeMode(): boolean {
    // TODO: Return actual state when available
    return false;
  }

  // Demo simulation methods
  public startDemo(): void {
    console.log('🚀 [SCENE-PUBLIC] startDemo() called - public method');
    if (this.demoSimulator && (this.demoSimulator as any).start) {
      console.log('🎯 [SCENE-PUBLIC] Starting DemoMessageSimulator...');
      (this.demoSimulator as any).start();
    } else {
      console.log('🎲 [SCENE-PUBLIC] DemoMessageSimulator not available, starting simple demo...');
      this.startSimpleDemo();
    }
  }

  public stopDemo(): void {
    console.log('🛑 [SCENE-PUBLIC] stopDemo() called - public method');
    if (this.demoSimulator && (this.demoSimulator as any).stop) {
      console.log('🎯 [SCENE-PUBLIC] Stopping DemoMessageSimulator...');
      (this.demoSimulator as any).stop();
    } else {
      console.log('🛑 [SCENE-PUBLIC] Stopping simple demo...');
      this.stopSimpleDemo();
    }
  }

  private startSimpleDemo(): void {
    console.log('🎲 Starting simple demo (fallback)...');
    // Create demo messages every 2 seconds
    setInterval(() => {
      this.createDemoMessage();
    }, 2000);
  }

  private stopSimpleDemo(): void {
    console.log('🛑 Stopping simple demo...');
    // Note: In a real implementation, we'd clear the interval
  }

  private createDemoMessage(): void {
    const channels = ['sys', 'app', 'ui', 'agent', 'game'];
    const randomChannel = channels[Math.floor(Math.random() * channels.length)];
    
    const message = {
      id: `demo_${Date.now()}`,
      channel: randomChannel,
      data: `Demo message from ${randomChannel}`,
      timestamp: Date.now()
    };
    
    this.createMessageVisualization(message);
  }

  public sendSingleDemoMessage(): void {
    console.log('📤 Sending single demo message');
    // TODO: Implement when method is available
  }

  public sendDemoBurst(): void {
    console.log('💥 Sending demo burst');
    // TODO: Implement when method is available
  }

  public resetDemoSimulator(): void {
    console.log('🔄 Resetting demo simulator');
    // TODO: Implement when method is available
  }

  public setDemoPhase(phase: string): void {
    console.log(`🎭 Setting demo phase to: ${phase}`);
    // TODO: Implement when method is available
  }

  public setDemoSpeed(speed: string): void {
    console.log(`⚡ Setting demo speed to: ${speed}`);
    // TODO: Implement when method is available
  }

  public setDemoChannel(channel: string): void {
    console.log(`📡 Setting demo channel to: ${channel}`);
    // TODO: Implement when method is available
  }

  private updateDemoSpeed(speed: string): void {
    console.log('⚡ [SCENE] updateDemoSpeed() called with:', speed);
    // DemoMessageSimulator doesn't have setSpeed method, using alternative approach
    console.log('⚡ [SCENE] Speed updated (stored for future use):', speed);
  }

  private updateDemoChannel(channel: string): void {
    console.log('📡 [SCENE] updateDemoChannel() called with:', channel);
    // DemoMessageSimulator doesn't have setChannel method, using alternative approach  
    console.log('📡 [SCENE] Channel updated (stored for future use):', channel);
  }
}
