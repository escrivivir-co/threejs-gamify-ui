import * as THREE from 'three';
import { Injectable } from '@angular/core';

export interface TrajectoryConfig {
  startPosition: THREE.Vector3;
  endPosition: THREE.Vector3;
  curvature: number;
  segments: number;
}

export interface MessageParticle {
  id: string;
  position: THREE.Vector3;
  targetPosition: THREE.Vector3;
  curve: THREE.CubicBezierCurve3;
  progress: number;
  speed: number;
  color: THREE.Color;
  mesh: THREE.Mesh;
  channel: string;
}

@Injectable({
  providedIn: 'root'
})
export class TrajectoryManager {
  private scene: THREE.Scene | null = null;
  private activeParticles = new Map<string, MessageParticle>();
  private particleGeometry: THREE.SphereGeometry | null = null;
  private particleMaterials = new Map<string, THREE.MeshBasicMaterial>();
  
  // Channel colors
  private channelColors = {
    sys: new THREE.Color(0xff4444), // Red
    app: new THREE.Color(0x4444ff), // Blue
    ui: new THREE.Color(0x44ff44)   // Green
  };

  constructor() {
    console.log('TrajectoryManager initialized');
    this.initializeGeometry();
    this.initializeMaterials();
  }

  /**
   * Initialize particle geometry (reused for all particles)
   */
  private initializeGeometry(): void {
    this.particleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
  }

  /**
   * Initialize materials for different channels
   */
  private initializeMaterials(): void {
    Object.entries(this.channelColors).forEach(([channel, color]) => {
      const material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.8
      });
      this.particleMaterials.set(channel, material);
    });
  }

  /**
   * Set the Three.js scene reference
   */
  setScene(scene: THREE.Scene): void {
    this.scene = scene;
  }

  /**
   * Create a trajectory curve between two positions
   */
  createTrajectory(config: TrajectoryConfig): THREE.CubicBezierCurve3 {
    const { startPosition, endPosition, curvature } = config;
    
    // Calculate control points for smooth curve
    const midPoint = new THREE.Vector3()
      .addVectors(startPosition, endPosition)
      .multiplyScalar(0.5);
    
    // Add height for arc effect
    midPoint.y += curvature;
    
    // Calculate direction for control points
    const direction = new THREE.Vector3()
      .subVectors(endPosition, startPosition)
      .normalize();
    
    const perpendicular = new THREE.Vector3()
      .crossVectors(direction, new THREE.Vector3(0, 1, 0))
      .normalize()
      .multiplyScalar(curvature * 0.5);
    
    const controlPoint1 = new THREE.Vector3()
      .addVectors(startPosition, perpendicular)
      .lerp(midPoint, 0.3);
    
    const controlPoint2 = new THREE.Vector3()
      .subVectors(endPosition, perpendicular)
      .lerp(midPoint, 0.3);
    
    return new THREE.CubicBezierCurve3(
      startPosition,
      controlPoint1,
      controlPoint2,
      endPosition
    );
  }

  /**
   * Create and launch a message particle
   */
  createMessageParticle(
    id: string,
    startPos: THREE.Vector3,
    endPos: THREE.Vector3,
    channel: string = 'app',
    speed: number = 1.0
  ): MessageParticle | null {
    
    if (!this.scene || !this.particleGeometry) {
      console.warn('Scene or geometry not initialized');
      return null;
    }

    // Create trajectory curve
    const curve = this.createTrajectory({
      startPosition: startPos.clone(),
      endPosition: endPos.clone(),
      curvature: 2.0,
      segments: 50
    });

    // Get material for channel
    const material = this.particleMaterials.get(channel) || 
                    this.particleMaterials.get('app')!;

    // Create particle mesh
    const mesh = new THREE.Mesh(this.particleGeometry, material.clone());
    mesh.position.copy(startPos);
    mesh.userData = { type: 'message_particle', id, channel };

    // Add to scene
    this.scene.add(mesh);

    // Create particle object
    const particle: MessageParticle = {
      id,
      position: startPos.clone(),
      targetPosition: endPos.clone(),
      curve,
      progress: 0,
      speed,
      color: this.channelColors[channel as keyof typeof this.channelColors] || this.channelColors.app,
      mesh,
      channel
    };

    // Store active particle
    this.activeParticles.set(id, particle);

    console.log(`Created message particle: ${id} (${channel})`);
    return particle;
  }

  /**
   * Update all active particles
   */
  updateParticles(deltaTime: number): void {
    const particlesToRemove: string[] = [];

    this.activeParticles.forEach((particle, id) => {
      // Update progress
      particle.progress += deltaTime * particle.speed;

      if (particle.progress >= 1.0) {
        // Particle reached destination
        particlesToRemove.push(id);
        return;
      }

      // Update position along curve
      const newPosition = particle.curve.getPoint(particle.progress);
      particle.position.copy(newPosition);
      particle.mesh.position.copy(newPosition);

      // Add some visual effects
      this.updateParticleEffects(particle, deltaTime);
    });

    // Remove completed particles
    particlesToRemove.forEach(id => {
      this.removeParticle(id);
    });
  }

  /**
   * Update visual effects for particle
   */
  private updateParticleEffects(particle: MessageParticle, deltaTime: number): void {
    // Pulsing effect
    const pulse = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
    particle.mesh.scale.setScalar(pulse);

    // Rotation
    particle.mesh.rotation.x += deltaTime * 2;
    particle.mesh.rotation.y += deltaTime * 3;

    // Fade effect near end
    if (particle.progress > 0.8) {
      const fadeProgress = (particle.progress - 0.8) / 0.2;
      const material = particle.mesh.material as THREE.MeshBasicMaterial;
      material.opacity = 1 - fadeProgress;
    }
  }

  /**
   * Remove a particle from the scene
   */
  removeParticle(id: string): void {
    const particle = this.activeParticles.get(id);
    
    if (particle && this.scene) {
      // Remove mesh from scene
      this.scene.remove(particle.mesh);
      
      // Dispose of material if it's a clone
      if (particle.mesh.material !== this.particleMaterials.get(particle.channel)) {
        (particle.mesh.material as THREE.Material).dispose();
      }
      
      // Remove from active particles
      this.activeParticles.delete(id);
      
      console.log(`Removed message particle: ${id}`);
    }
  }

  /**
   * Create trajectory for bot-to-center message
   */
  createBotToCenterTrajectory(
    botPosition: THREE.Vector3,
    messageId: string,
    channel: string = 'app'
  ): MessageParticle | null {
    const centerPosition = new THREE.Vector3(0, 0, 0);
    return this.createMessageParticle(
      messageId,
      botPosition,
      centerPosition,
      channel,
      1.5 // Slightly faster for incoming messages
    );
  }

  /**
   * Create trajectory for center-to-bot message
   */
  createCenterToBotTrajectory(
    botPosition: THREE.Vector3,
    messageId: string,
    channel: string = 'app'
  ): MessageParticle | null {
    const centerPosition = new THREE.Vector3(0, 0, 0);
    return this.createMessageParticle(
      messageId,
      centerPosition,
      botPosition,
      channel,
      1.0 // Normal speed for outgoing messages
    );
  }

  /**
   * Get active particle count
   */
  getActiveParticleCount(): number {
    return this.activeParticles.size;
  }

  /**
   * Clear all particles
   */
  clearAllParticles(): void {
    console.log(`Clearing ${this.activeParticles.size} active particles`);
    
    const particleIds = Array.from(this.activeParticles.keys());
    particleIds.forEach(id => {
      this.removeParticle(id);
    });
  }

  /**
   * Get particles by channel
   */
  getParticlesByChannel(channel: string): MessageParticle[] {
    return Array.from(this.activeParticles.values())
      .filter(particle => particle.channel === channel);
  }

  /**
   * Update channel color
   */
  updateChannelColor(channel: string, color: THREE.Color): void {
    this.channelColors[channel as keyof typeof this.channelColors] = color;
    
    // Update material
    const material = this.particleMaterials.get(channel);
    if (material) {
      material.color.copy(color);
    }
    
    // Update existing particles of this channel
    this.activeParticles.forEach(particle => {
      if (particle.channel === channel) {
        (particle.mesh.material as THREE.MeshBasicMaterial).color.copy(color);
      }
    });
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    console.log('Disposing TrajectoryManager');
    
    // Clear all particles
    this.clearAllParticles();
    
    // Dispose of geometry
    if (this.particleGeometry) {
      this.particleGeometry.dispose();
    }
    
    // Dispose of materials
    this.particleMaterials.forEach(material => {
      material.dispose();
    });
    
    this.particleMaterials.clear();
    this.scene = null;
  }
}
