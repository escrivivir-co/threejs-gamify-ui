import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, Input, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import * as THREE from 'three';

import { BotListComponent } from './features/bot-management/bot-list.component';
import { MessagePanelComponent } from './features/message-panel/message-panel.component';
import { AlephScriptTestComponent } from './components/alephscript-test/alephscript-test.component';
import { ModalManagerComponent } from './shared/components/modal-manager.component';
import { DemoControlsComponent } from './shared/components/demo-controls.component';
import { VisualControlsComponent } from './shared/components/visual-controls.component';
import { DemoMessage, DemoMessageSimulator } from './shared/simulation/demo-message-simulator';
import { ThreeJSUIComponentBase } from './shared/ThreeJSUIComponentBase';
import { ThreeSceneService } from './shared/three/three-scene.service';
import { AlephScriptService } from './core/services/alephscript.service';
import { AnimationController } from './shared/three/animation-controller';
import { TrajectoryManager } from './shared/three/trajectory-manager';
import { ModalService } from './shared/services/modal.service';

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
    AlephScriptTestComponent,
    ModalManagerComponent,
    DemoControlsComponent,
    VisualControlsComponent
  ],
  templateUrl: './threejs-ui-component.html',
  styleUrls: ['./threejs-ui-component.css']
})
export class ThreeJSUIComponent extends ThreeJSUIComponentBase implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('canvasContainer', { static: false }) canvasContainer!: ElementRef;
  @Input() config!: ThreeJSUIConfig;
  
  private destroy$ = new Subject<void>();

  constructor(
    threeSceneService: ThreeSceneService,
    alephScriptService: AlephScriptService,
    animationController: AnimationController,
    trajectoryManager: TrajectoryManager,
    demoSimulator: DemoMessageSimulator,
    modalService: ModalService,
    cdr: ChangeDetectorRef
  ) {
    super(threeSceneService, alephScriptService, animationController, trajectoryManager, demoSimulator, modalService, cdr);
  }

  ngOnInit() {
    console.log('🎮 ThreeJSUI Library - AlephScript Integration v2.0 initializing...');
    
    if (!this.config) {
      throw new Error('ThreeJSUIComponent requires config input');
    }
    
    // Inicializar estado de carga
    this.isLoading = true;
    
    // Subscribe to connection status
    this.alephScriptService.getConnectionStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe((status: string) => {
        console.log('🔗 Connection status changed:', status);
        this.connectionStatus = status;
        
        // Don't automatically set loading to false here
        // Let the Three.js initialization handle it
        this.cdr.detectChanges();
      });

    // Subscribe to demo simulator status
    this.demoSimulator.status$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.demoStatus = status;
        this.isDemoRunning = status.isRunning;
        this.cdr.detectChanges();
      });

    console.log('🎮 Component initialization completed, waiting for view...');
  }

  ngAfterViewInit() {
    console.log('🎬 ngAfterViewInit - Verificando canvasContainer...');
    
    // Verificar inmediatamente si canvasContainer está disponible
    if (!this.canvasContainer) {
      console.warn('⚠️ canvasContainer not available immediately, retrying...');
      
      // Retry mechanism con intervalos para esperar que el DOM esté listo
      this.waitForCanvasContainer();
      return;
    }
    
    console.log('✅ canvasContainer available in ngAfterViewInit');
    this.initializeThreeScene();
  }

  private waitForCanvasContainer() {
    let retries = 0;
    const maxRetries = 10;
    const retryInterval = 100;

    const checkCanvasContainer = () => {
      retries++;
      console.log(`🔄 Attempt ${retries}/${maxRetries} - Checking canvasContainer...`);
      
      if (this.canvasContainer?.nativeElement) {
        console.log('✅ canvasContainer found after retry:', retries);
        this.initializeThreeScene();
        return;
      }
      
      if (retries >= maxRetries) {
        console.error('❌ Failed to find canvasContainer after', maxRetries, 'attempts');
        this.handleCanvasContainerError();
        return;
      }
      
      setTimeout(checkCanvasContainer, retryInterval);
    };
    
    setTimeout(checkCanvasContainer, retryInterval);
  }

  private handleCanvasContainerError() {
    console.error('❌ Canvas container initialization failed');
    this.isLoading = false;
    // Marcar como error pero mantener el componente funcionando
    this.connectionStatus = 'error';
    this.cdr.detectChanges();
  }

  private async initializeThreeScene() {
    try {
      console.log('🌟 Initializing Three.js scene...');
      console.log('🔄 Loading state before Three.js init:', this.isLoading);
      
      // Validación final del canvasContainer
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
        this.canvasContainer.nativeElement.style.height = '600px';
      }
      
      // Initialize Three.js scene
      console.log('🎯 Calling threeSceneService.initialize...');
      await this.threeSceneService.initialize(this.canvasContainer.nativeElement);
      console.log('✅ Three.js scene initialized successfully');
      
      // Initialize animation systems
      this.initializeAnimationSystems();
      
      // Initialize demo simulation
      this.initializeDemoSimulation();
      
      // Start render loop
      console.log('🔄 Starting render loop...');
      this.threeSceneService.startRenderLoop();
      
      // Subscribe to FPS updates
      this.threeSceneService.fps
        .pipe(takeUntil(this.destroy$))
        .subscribe((fps: any) => {
          this.currentFPS = Math.round(fps);
        });

      // Mark as loaded
      this.isLoading = false;
      console.log('🎉 Three.js initialization complete');
      
    } catch (error) {
      console.error('❌ Failed to initialize Three.js scene:', error);
      this.isLoading = false;
      this.connectionStatus = 'error';
      this.cdr.detectChanges();
    }
  }

  private initializeAnimationSystems() {
    console.log('🎬 Initializing animation systems...');
    
    // Get the scene from ThreeSceneService
    const scene = this.threeSceneService.getScene();
    
    if (scene) {
      // Initialize TrajectoryManager with scene reference
      this.trajectoryManager.setScene(scene);
      
      // Initialize AnimationController with scene reference
      this.animationController.setScene(scene);
      
      // Start animation controller
      this.animationController.start();
      
      // Subscribe to animation updates
      this.threeSceneService.onBeforeRender
        .pipe(takeUntil(this.destroy$))
        .subscribe((deltaTime: number) => {
          this.updateAnimations(deltaTime);
        });
      
      // Connect AlephScript message events with particle animations
      this.connectMessageAnimations();
      
      console.log('🎬 Animation systems initialized successfully');
    } else {
      console.warn('🎬 Could not initialize animation systems: scene not available');
    }
  }

  private initializeDemoSimulation() {
    console.log('🎭 Initializing demo message simulation...');
    
    // Subscribe to demo messages
    this.demoSimulator.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe((message: DemoMessage) => {
        this.handleDemoMessage(message);
      });
    
    // Subscribe to simulation status
    this.demoSimulator.status$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        console.log(`🎭 Demo simulation status: ${status.currentPhase} (${status.messagesSent} messages sent)`);
      });
    
    // Auto-start demo simulation after a short delay
    setTimeout(() => {
      if (this.config.debugMode !== false) { // Default to true unless explicitly disabled
        console.log('🎭 Auto-starting demo simulation...');
        this.demoSimulator.start();
      }
    }, 3000); // 3 second delay after scene initialization
    
    console.log('🎭 Demo simulation initialized');
  }

  private handleDemoMessage(message: DemoMessage) {
    console.log(`🎭 Handling demo message: ${message.id} from ${message.fromBot} to ${message.toBot} (${message.channel})`);
    
    // Get bot positions
    const fromPosition = this.demoSimulator.getBotPosition(message.fromBot);
    const toPosition = this.demoSimulator.getBotPosition(message.toBot);
    
    // Create particle animation based on message type
    switch (message.type) {
      case 'bot-to-center':
        this.trajectoryManager.createBotToCenterTrajectory(
          fromPosition,
          message.id,
          message.channel
        );
        break;
        
      case 'center-to-bot':
        this.trajectoryManager.createCenterToBotTrajectory(
          toPosition,
          message.id,
          message.channel
        );
        break;
        
      case 'bot-to-bot':
        this.trajectoryManager.createMessageParticle(
          message.id,
          fromPosition,
          toPosition,
          message.channel,
          1.2 // Slightly faster for direct bot-to-bot
        );
        break;
    }
    
    // Optional: Create some visual feedback animations
    this.createMessageEffects(message, fromPosition, toPosition);
  }

  private createMessageEffects(message: DemoMessage, fromPos: THREE.Vector3, toPos: THREE.Vector3) {
    // Get the scene to find objects for animation
    const scene = this.threeSceneService.getScene();
    if (!scene) return;
    
    // Find bot objects in the scene and animate them
    scene.traverse((object: any) => {
      if (object.userData && object.userData['type'] === 'bot') {
        const botId = object.userData['botId'];
        
        // Animate the source bot
        if (botId === message.fromBot) {
          this.animateBotActivity(object, 'sending');
        }
        
        // Animate the target bot (if not center)
        if (botId === message.toBot && message.toBot !== 'CentralHub') {
          setTimeout(() => {
            this.animateBotActivity(object, 'receiving');
          }, 1000); // Delay to match particle travel time
        }
      }
      
      // Animate central hub
      if (object.userData && object.userData['type'] === 'central_hub') {
        if (message.fromBot === 'CentralHub' || message.toBot === 'CentralHub') {
          this.animateBotActivity(object, 'processing');
        }
      }
    });
  }

  private animateBotActivity(object: THREE.Object3D, activity: 'sending' | 'receiving' | 'processing') {
    const objectId = object.userData['botId'] || object.userData['id'] || `object-${Date.now()}`;
    const animationId = `${objectId}-${activity}-${Date.now()}`;
    
    switch (activity) {
      case 'sending':
        // Scale up and down animation - we'll use direct property animation
        const originalScale = object.scale.clone();
        const targetScale = new THREE.Vector3(1.3, 1.3, 1.3);
        
        // Create animation target for scale up
        this.animationController.createAnimation(animationId, [{
          object: object,
          property: 'scale',
          startValue: originalScale,
          endValue: targetScale
        }], {
          duration: 0.5,
          easing: 'easeInOut',
          loop: false,
          autoStart: true
        });
        
        // Schedule scale down
        setTimeout(() => {
          this.animationController.createAnimation(animationId + '-return', [{
            object: object,
            property: 'scale',
            startValue: targetScale,
            endValue: originalScale
          }], {
            duration: 0.5,
            easing: 'easeInOut',
            loop: false,
            autoStart: true
          });
        }, 500);
        break;
        
      case 'receiving':
        // Gentle pulse animation
        const originalScalePulse = object.scale.clone();
        const targetScalePulse = new THREE.Vector3(1.1, 1.1, 1.1);
        
        this.animationController.createAnimation(animationId, [{
          object: object,
          property: 'scale',
          startValue: originalScalePulse,
          endValue: targetScalePulse
        }], {
          duration: 0.3,
          easing: 'easeInOut',
          loop: false,
          autoStart: true
        });
        
        setTimeout(() => {
          this.animationController.createAnimation(animationId + '-return', [{
            object: object,
            property: 'scale',
            startValue: targetScalePulse,
            endValue: originalScalePulse
          }], {
            duration: 0.3,
            easing: 'easeInOut',
            loop: false,
            autoStart: true
          });
        }, 300);
        break;
        
      case 'processing':
        // Rotation animation
        const currentRotation = object.rotation.clone();
        const targetRotation = new THREE.Euler(0, currentRotation.y + Math.PI * 0.5, 0);
        
        this.animationController.createAnimation(animationId, [{
          object: object,
          property: 'rotation',
          startValue: currentRotation,
          endValue: targetRotation
        }], {
          duration: 1.0,
          easing: 'easeInOut',
          loop: false,
          autoStart: true
        });
        break;
    }
  }

  private connectMessageAnimations() {
    console.log('🛤️ Connecting AlephScript message events with particle animations...');
    
    // Subscribe to incoming messages to create particle animations
    this.alephScriptService.getMessages()
      .pipe(takeUntil(this.destroy$))
      .subscribe(message => {
        this.createMessageParticle(message);
      });
    
    // Subscribe to connection status changes for visual feedback
    this.alephScriptService.getConnectionStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.handleConnectionStatusAnimation(status);
      });
  }

  private createMessageParticle(message: any) {
    // Generate unique particle ID
    const particleId = `msg_${message.id || Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Determine message direction and positions
    const isIncoming = message.target === 'BASTION_BOT_THREEJS_SRV' || !message.source;
    const channel = this.getMessageChannel(message);
    
    // Get random bot position (simulate bot-to-center or center-to-bot communication)
    const botPosition = this.getRandomBotPosition();
    
    if (isIncoming) {
      // Bot to center message
      const particle = this.trajectoryManager.createBotToCenterTrajectory(
        botPosition,
        particleId,
        channel
      );
      
      if (particle) {
        console.log(`🛤️ Created incoming message particle: ${particleId} (${channel})`);
      }
    } else {
      // Center to bot message
      const particle = this.trajectoryManager.createCenterToBotTrajectory(
        botPosition,
        particleId,
        channel
      );
      
      if (particle) {
        console.log(`🛤️ Created outgoing message particle: ${particleId} (${channel})`);
      }
    }
  }

  private getMessageChannel(message: any): string {
    // Determine channel based on message properties
    if (message.type?.includes('sys') || message.source?.includes('system')) {
      return 'sys';
    } else if (message.type?.includes('ui') || message.data?.ui) {
      return 'ui';
    } else if (message.type?.includes('agent') || message.source?.includes('agent')) {
      return 'agent';
    } else if (message.type?.includes('game') || message.data?.game) {
      return 'game';
    }
    return 'app'; // Default channel
  }

  private getRandomBotPosition(): THREE.Vector3 {
    // Generate random bot position around a circle
    const angle = Math.random() * Math.PI * 2;
    const radius = 8;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = 0.5; // Slightly elevated
    
    return new THREE.Vector3(x, y, z);
  }

  private handleConnectionStatusAnimation(status: string) {
    switch (status) {
      case 'connected':
        // Create celebration particle burst
        this.createConnectionParticleBurst('connected');
        break;
      case 'disconnected':
        // Create disconnection particle effect
        this.createConnectionParticleBurst('disconnected');
        break;
      case 'error':
        // Create error particle effect
        this.createConnectionParticleBurst('error');
        break;
    }
  }

  private createConnectionParticleBurst(type: 'connected' | 'disconnected' | 'error') {
    const centerPosition = new THREE.Vector3(0, 1, 0);
    const particleCount = type === 'connected' ? 8 : 4;
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = 3;
      const targetPosition = new THREE.Vector3(
        Math.cos(angle) * radius,
        centerPosition.y,
        Math.sin(angle) * radius
      );
      
      const particleId = `${type}_burst_${i}_${Date.now()}`;
      const channel = type === 'connected' ? 'sys' : 
                     type === 'error' ? 'sys' : 'app';
      
      this.trajectoryManager.createMessageParticle(
        particleId,
        centerPosition,
        targetPosition,
        channel,
        2.0 // Faster speed for burst effect
      );
    }
    
    console.log(`🛤️ Created ${type} particle burst with ${particleCount} particles`);
  }

  private updateAnimations(deltaTime: number) {
    // Update animation controller
    this.animationController.update(deltaTime);
    
    // Update trajectory manager (particle animations)
    this.trajectoryManager.updateParticles(deltaTime);
  }

  override openSettings(): void {
    const existingModal = this.modalService.getModal('settings');
    if (existingModal) {
      this.modalService.bringToFront('settings');
    } else {
      this.modalService.open({
        id: 'settings',
        title: '⚙️ Settings',
        position: { x: 300, y: 150 },
        size: { width: 300, height: 250 },
        draggable: true,
        resizable: false,
        closable: true,
        minimizable: true
      });
    }
  }

  override openHelp(): void {
    const existingModal = this.modalService.getModal('help');
    if (existingModal) {
      this.modalService.bringToFront('help');
    } else {
      this.modalService.open({
        id: 'help',
        title: '📖 Help & Controls',
        position: { x: 150, y: 100 },
        size: { width: 400, height: 450 },
        draggable: true,
        resizable: true,
        closable: true,
        minimizable: true
      });
    }
  }

  private runDemoAnimations() {
    if (!this.isDemoRunning) return;
    
    // Create demo message particles every 2 seconds
    const createDemoParticle = () => {
      if (!this.isDemoRunning) return;
      
      // Create random demo message
      const demoMessage = {
        id: `demo_${Date.now()}`,
        type: Math.random() > 0.5 ? 'agent_response' : 'ui_update',
        data: { demo: true },
        source: Math.random() > 0.5 ? 'agent_bot' : 'system',
        target: Math.random() > 0.5 ? 'BASTION_BOT_THREEJS_SRV' : 'external_bot',
        timestamp: Date.now()
      };
      
      this.createMessageParticle(demoMessage);
      
      // Schedule next particle
      setTimeout(createDemoParticle, 2000 + Math.random() * 3000);
    };
    
    // Start demo particle creation
    createDemoParticle();
    
    console.log('🎮 Demo animations started - particles will be created every 2-5 seconds');
  }

  ngOnDestroy() {
    console.log('🎭 ThreeJSUI component destroying...');
    
    // Stop demo simulation
    this.demoSimulator.dispose();
    
    // Clean up subscriptions
    this.destroy$.next();
    this.destroy$.complete();
    
    // Clean up animation systems
    this.animationController.stop();
    this.trajectoryManager.clearAllParticles();
    
    // Clean up services
    this.threeSceneService.dispose();
    this.alephScriptService.disconnect();
  }
}
