import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, Subject } from 'rxjs';
import { takeUntil, filter, debounceTime } from 'rxjs/operators';
import * as THREE from 'three';

import { SocketService } from './socket.service';
import { ThreeSceneService } from '../../shared/three/three-scene.service';
import { TrajectoryManager } from '../../shared/three/trajectory-manager';
import { AnimationController } from '../../shared/three/animation-controller';
import { Bot } from '../../shared/models/bot.model';
import { SocketMessage, MessageType, BotStatusMessage, UserActionMessage, ChannelType } from '../bridge/interfaces';

export interface IntegrationState {
  selectedBotIds: Set<string>;
  highlightedBotId: string | null;
  cameraTarget: THREE.Vector3 | null;
  isAutoRotating: boolean;
  syncEnabled: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class IntegrationService {
  private destroy$ = new Subject<void>();
  
  // State management
  private state$ = new BehaviorSubject<IntegrationState>({
    selectedBotIds: new Set(),
    highlightedBotId: null,
    cameraTarget: null,
    isAutoRotating: false,
    syncEnabled: true
  });

  // Bot positions cache
  private botPositions = new Map<string, THREE.Vector3>();
  private botMeshes = new Map<string, THREE.Object3D>();

  constructor(
    private socketService: SocketService,
    private threeSceneService: ThreeSceneService,
    private trajectoryManager: TrajectoryManager,
    private animationController: AnimationController
  ) {
    console.log('IntegrationService initialized');
    this.setupIntegration();
  }

  /**
   * Initialize the integration between all services
   */
  private setupIntegration(): void {
    // Subscribe to socket messages and create 3D animations
    this.socketService.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(message => {
        this.handleSocketMessage(message);
      });

    // Subscribe to bot status updates
    this.socketService.sysMessages$
      .pipe(
        takeUntil(this.destroy$),
        filter(msg => msg.type === MessageType.BOT_STATUS)
      )
      .subscribe(msg => {
        this.handleBotStatusUpdate(msg as BotStatusMessage);
      });

    // Subscribe to user actions
    this.socketService.uiMessages$
      .pipe(
        takeUntil(this.destroy$),
        filter(msg => msg.type === MessageType.USER_ACTION)
      )
      .subscribe(msg => {
        this.handleUserAction(msg as UserActionMessage);
      });

    // Set up animation controller
    this.animationController.start();
  }

  /**
   * Handle incoming socket messages and create visual representations
   */
  private handleSocketMessage(message: SocketMessage): void {
    if (!this.state$.value.syncEnabled) return;

    // Create message particle animation
    this.createMessageAnimation(message);
  }

  /**
   * Create animated particle for message
   */
  private createMessageAnimation(message: SocketMessage): void {
    const messageId = `msg_${message.id}`;
    
    // Determine direction and positions
    let startPos: THREE.Vector3;
    let endPos: THREE.Vector3;
    
    if (message.source && this.botPositions.has(message.source)) {
      // Message from bot to center
      startPos = this.botPositions.get(message.source)!.clone();
      endPos = new THREE.Vector3(0, 0, 0);
    } else if (message.target && this.botPositions.has(message.target)) {
      // Message from center to bot
      startPos = new THREE.Vector3(0, 0, 0);
      endPos = this.botPositions.get(message.target)!.clone();
    } else {
      // Default: center to random bot or generic animation
      startPos = new THREE.Vector3(0, 0, 0);
      endPos = this.getRandomBotPosition();
    }

    // Create trajectory particle
    const particle = this.trajectoryManager.createMessageParticle(
      messageId,
      startPos,
      endPos,
      message.channel,
      this.getSpeedForChannel(message.channel)
    );

    if (particle) {
      console.log(`Created message animation for ${message.type} on ${message.channel}`);
    }
  }

  /**
   * Handle bot status updates
   */
  private handleBotStatusUpdate(message: BotStatusMessage): void {
    // Update 3D scene bot status
    this.threeSceneService.updateBotStatus(message.botId, message.status);
    
    // Update bot position cache
    if (message.position) {
      const position = new THREE.Vector3(
        message.position.x,
        message.position.y,
        message.position.z
      );
      this.botPositions.set(message.botId, position);
    }

    // Create status change animation
    this.animateBotStatusChange(message.botId, message.status);
  }

  /**
   * Handle user action messages
   */
  private handleUserAction(message: UserActionMessage): void {
    switch (message.action) {
      case 'bot_selected':
        this.handleBotSelection(message.data);
        break;
      case 'scene_reset':
        this.resetScene();
        break;
      case 'filter_changed':
        this.handleFilterChange(message.data);
        break;
    }
  }

  /**
   * Handle bot selection from UI
   */
  private handleBotSelection(data: any): void {
    const { botId, selected } = data;
    const currentState = this.state$.value;
    const newSelectedIds = new Set(currentState.selectedBotIds);
    
    if (selected) {
      newSelectedIds.add(botId);
      this.highlightBot(botId);
    } else {
      newSelectedIds.delete(botId);
      this.unhighlightBot(botId);
    }
    
    this.updateState({
      selectedBotIds: newSelectedIds,
      highlightedBotId: selected ? botId : null
    });
  }

  /**
   * Highlight bot in 3D scene
   */
  private highlightBot(botId: string): void {
    const botMesh = this.botMeshes.get(botId);
    if (!botMesh) return;

    // Create highlight animation
    this.animationController.animateScale(
      `highlight_${botId}`,
      botMesh,
      1.3,
      {
        duration: 0.5,
        easing: 'easeOut',
        loop: false
      }
    );

    // Add glow effect
    this.addGlowEffect(botMesh);
    
    console.log(`Highlighted bot: ${botId}`);
  }

  /**
   * Remove highlight from bot
   */
  private unhighlightBot(botId: string): void {
    const botMesh = this.botMeshes.get(botId);
    if (!botMesh) return;

    // Remove highlight animation
    this.animationController.animateScale(
      `unhighlight_${botId}`,
      botMesh,
      1.0,
      {
        duration: 0.3,
        easing: 'easeIn'
      }
    );

    // Remove glow effect
    this.removeGlowEffect(botMesh);
    
    console.log(`Unhighlighted bot: ${botId}`);
  }

  /**
   * Animate bot status change
   */
  private animateBotStatusChange(botId: string, status: string): void {
    const botMesh = this.botMeshes.get(botId);
    if (!botMesh) return;

    // Create bounce animation for status change
    this.animationController.createAnimation(
      `status_change_${botId}`,
      [
        {
          object: botMesh,
          property: 'position.y',
          startValue: botMesh.position.y,
          endValue: botMesh.position.y + 0.5
        }
      ],
      {
        duration: 0.4,
        easing: 'easeOut',
        loop: false
      }
    );

    // Return to original position
    setTimeout(() => {
      this.animationController.animateProperty(
        `status_return_${botId}`,
        botMesh,
        'position.y',
        botMesh.position.y - 0.5,
        {
          duration: 0.4,
          easing: 'easeIn'
        }
      );
    }, 400);
  }

  /**
   * Add glow effect to object
   */
  private addGlowEffect(object: THREE.Object3D): void {
    // Simple glow effect using emissive material
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        child.material.emissive.setHex(0x404040);
        child.material.emissiveIntensity = 0.3;
      }
    });
  }

  /**
   * Remove glow effect from object
   */
  private removeGlowEffect(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        child.material.emissive.setHex(0x000000);
        child.material.emissiveIntensity = 0;
      }
    });
  }

  /**
   * Reset scene to initial state
   */
  private resetScene(): void {
    console.log('Resetting integrated scene');
    
    // Clear all animations
    this.animationController.clearAll();
    
    // Clear all trajectories
    this.trajectoryManager.clearAllParticles();
    
    // Reset Three.js scene
    this.threeSceneService.reset();
    
    // Reset integration state
    this.updateState({
      selectedBotIds: new Set(),
      highlightedBotId: null,
      cameraTarget: null,
      isAutoRotating: false
    });
  }

  /**
   * Handle filter changes
   */
  private handleFilterChange(data: any): void {
    // This could filter visible particles or adjust visualization
    console.log('Filter changed:', data);
  }

  /**
   * Update bot positions from Three.js scene
   */
  setBotPositions(positions: Map<string, THREE.Vector3>): void {
    this.botPositions = new Map(positions);
    console.log(`Updated ${positions.size} bot positions`);
  }

  /**
   * Update bot mesh references
   */
  setBotMeshes(meshes: Map<string, THREE.Object3D>): void {
    this.botMeshes = new Map(meshes);
    console.log(`Updated ${meshes.size} bot mesh references`);
  }

  /**
   * Initialize trajectory manager with scene
   */
  initializeTrajectoryManager(scene: THREE.Scene): void {
    this.trajectoryManager.setScene(scene);
    console.log('Trajectory manager initialized with scene');
  }

  /**
   * Update method to be called in render loop
   */
  update(deltaTime: number): void {
    // Update animations
    this.animationController.update();
    
    // Update trajectories
    this.trajectoryManager.updateParticles(deltaTime);
  }

  /**
   * Get random bot position for generic animations
   */
  private getRandomBotPosition(): THREE.Vector3 {
    const positions = Array.from(this.botPositions.values());
    if (positions.length === 0) {
      return new THREE.Vector3(5, 0, 0); // Default position
    }
    return positions[Math.floor(Math.random() * positions.length)].clone();
  }

  /**
   * Get animation speed based on channel
   */
  private getSpeedForChannel(channel: ChannelType): number {
    switch (channel) {
      case ChannelType.SYS:
        return 2.0; // Fast for system messages
      case ChannelType.APP:
        return 1.0; // Normal speed
      case ChannelType.UI:
        return 1.5; // Slightly fast for UI interactions
      default:
        return 1.0;
    }
  }

  /**
   * Update integration state
   */
  private updateState(updates: Partial<IntegrationState>): void {
    const currentState = this.state$.value;
    this.state$.next({ ...currentState, ...updates });
  }

  /**
   * Get current state
   */
  getState() {
    return this.state$.asObservable();
  }

  /**
   * Toggle synchronization
   */
  toggleSync(): void {
    const currentState = this.state$.value;
    this.updateState({ syncEnabled: !currentState.syncEnabled });
    console.log('Sync toggled:', !currentState.syncEnabled);
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return {
      activeAnimations: this.animationController.getActiveAnimations().length,
      activeParticles: this.trajectoryManager.getActiveParticleCount(),
      totalAnimations: this.animationController.getAnimationCount$(),
      syncEnabled: this.state$.value.syncEnabled
    };
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    console.log('Disposing IntegrationService');
    
    this.destroy$.next();
    this.destroy$.complete();
    
    this.animationController.dispose();
    this.trajectoryManager.dispose();
    
    this.state$.complete();
  }
}
