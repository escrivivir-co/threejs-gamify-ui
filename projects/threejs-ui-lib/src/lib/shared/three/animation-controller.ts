import * as THREE from 'three';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

export interface AnimationConfig {
  duration: number;
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
  loop: boolean;
  autoStart: boolean;
}

export interface AnimationTarget {
  object: THREE.Object3D;
  property: string;
  startValue: any;
  endValue: any;
  currentValue?: any;
}

export interface Animation {
  id: string;
  targets: AnimationTarget[];
  config: AnimationConfig;
  progress: number;
  isPlaying: boolean;
  startTime: number;
  onComplete?: () => void;
  onUpdate?: (progress: number) => void;
}

@Injectable({
  providedIn: 'root'
})
export class AnimationController {
  private animations = new Map<string, Animation>();
  private clock = new THREE.Clock();
  private isRunning = false;
  
  // Animation state observables
  private animationCount$ = new BehaviorSubject<number>(0);
  private performanceStats$ = new BehaviorSubject<{
    activeAnimations: number;
    totalAnimations: number;
    averageFrameTime: number;
  }>({
    activeAnimations: 0,
    totalAnimations: 0,
    averageFrameTime: 0
  });

  // Performance tracking
  private frameCount = 0;
  private totalFrameTime = 0;
  private lastFrameTime = 0;

  constructor() {
    console.log('AnimationController initialized');
  }

  /**
   * Start the animation update loop
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.clock.start();
    console.log('Animation controller started');
  }

  /**
   * Stop the animation update loop
   */
  stop(): void {
    this.isRunning = false;
    console.log('Animation controller stopped');
  }

  /**
   * Update all active animations
   */
  update(): void {
    if (!this.isRunning) return;

    const startTime = performance.now();
    const deltaTime = this.clock.getDelta();
    const currentTime = this.clock.elapsedTime;

    const animationsToRemove: string[] = [];

    // Update each animation
    this.animations.forEach((animation, id) => {
      if (!animation.isPlaying) return;

      // Calculate progress
      const elapsed = currentTime - animation.startTime;
      animation.progress = Math.min(elapsed / animation.config.duration, 1.0);

      // Apply easing
      const easedProgress = this.applyEasing(animation.progress, animation.config.easing);

      // Update all targets
      animation.targets.forEach(target => {
        this.updateAnimationTarget(target, easedProgress);
      });

      // Call update callback
      if (animation.onUpdate) {
        animation.onUpdate(animation.progress);
      }

      // Check if animation completed
      if (animation.progress >= 1.0) {
        if (animation.config.loop) {
          // Restart animation
          animation.startTime = currentTime;
          animation.progress = 0;
        } else {
          // Mark for removal
          animationsToRemove.push(id);
          
          // Call completion callback
          if (animation.onComplete) {
            animation.onComplete();
          }
        }
      }
    });

    // Remove completed animations
    animationsToRemove.forEach(id => {
      this.animations.delete(id);
    });

    // Update performance stats
    this.updatePerformanceStats(performance.now() - startTime);
    this.animationCount$.next(this.animations.size);
  }

  /**
   * Create a new animation
   */
  createAnimation(
    id: string,
    targets: AnimationTarget[],
    config: Partial<AnimationConfig> = {}
  ): Animation {
    const fullConfig: AnimationConfig = {
      duration: 1.0,
      easing: 'easeInOut',
      loop: false,
      autoStart: true,
      ...config
    };

    // Initialize target start values
    targets.forEach(target => {
      if (target.startValue === undefined) {
        target.startValue = this.getObjectProperty(target.object, target.property);
      }
      target.currentValue = target.startValue;
    });

    const animation: Animation = {
      id,
      targets,
      config: fullConfig,
      progress: 0,
      isPlaying: fullConfig.autoStart,
      startTime: this.clock.elapsedTime
    };

    this.animations.set(id, animation);
    
    console.log(`Created animation: ${id}`);
    return animation;
  }

  /**
   * Animate object property
   */
  animateProperty(
    id: string,
    object: THREE.Object3D,
    property: string,
    endValue: any,
    config?: Partial<AnimationConfig>
  ): Animation {
    const target: AnimationTarget = {
      object,
      property,
      startValue: this.getObjectProperty(object, property),
      endValue
    };

    return this.createAnimation(id, [target], config);
  }

  /**
   * Animate position
   */
  animatePosition(
    id: string,
    object: THREE.Object3D,
    targetPosition: THREE.Vector3,
    config?: Partial<AnimationConfig>
  ): Animation {
    const targets: AnimationTarget[] = [
      {
        object,
        property: 'position.x',
        startValue: object.position.x,
        endValue: targetPosition.x
      },
      {
        object,
        property: 'position.y',
        startValue: object.position.y,
        endValue: targetPosition.y
      },
      {
        object,
        property: 'position.z',
        startValue: object.position.z,
        endValue: targetPosition.z
      }
    ];

    return this.createAnimation(id, targets, config);
  }

  /**
   * Animate rotation
   */
  animateRotation(
    id: string,
    object: THREE.Object3D,
    targetRotation: THREE.Euler,
    config?: Partial<AnimationConfig>
  ): Animation {
    const targets: AnimationTarget[] = [
      {
        object,
        property: 'rotation.x',
        startValue: object.rotation.x,
        endValue: targetRotation.x
      },
      {
        object,
        property: 'rotation.y',
        startValue: object.rotation.y,
        endValue: targetRotation.y
      },
      {
        object,
        property: 'rotation.z',
        startValue: object.rotation.z,
        endValue: targetRotation.z
      }
    ];

    return this.createAnimation(id, targets, config);
  }

  /**
   * Animate scale
   */
  animateScale(
    id: string,
    object: THREE.Object3D,
    targetScale: THREE.Vector3 | number,
    config?: Partial<AnimationConfig>
  ): Animation {
    const scale = typeof targetScale === 'number' 
      ? new THREE.Vector3(targetScale, targetScale, targetScale)
      : targetScale;

    const targets: AnimationTarget[] = [
      {
        object,
        property: 'scale.x',
        startValue: object.scale.x,
        endValue: scale.x
      },
      {
        object,
        property: 'scale.y',
        startValue: object.scale.y,
        endValue: scale.y
      },
      {
        object,
        property: 'scale.z',
        startValue: object.scale.z,
        endValue: scale.z
      }
    ];

    return this.createAnimation(id, targets, config);
  }

  /**
   * Play animation
   */
  play(id: string): boolean {
    const animation = this.animations.get(id);
    if (animation) {
      animation.isPlaying = true;
      animation.startTime = this.clock.elapsedTime - (animation.progress * animation.config.duration);
      console.log(`Playing animation: ${id}`);
      return true;
    }
    return false;
  }

  /**
   * Pause animation
   */
  pause(id: string): boolean {
    const animation = this.animations.get(id);
    if (animation) {
      animation.isPlaying = false;
      console.log(`Paused animation: ${id}`);
      return true;
    }
    return false;
  }

  /**
   * Stop animation
   */
  stopAnimation(id: string): boolean {
    const animation = this.animations.get(id);
    if (animation) {
      animation.isPlaying = false;
      animation.progress = 0;
      animation.startTime = this.clock.elapsedTime;
      
      // Reset to start values
      animation.targets.forEach(target => {
        this.setObjectProperty(target.object, target.property, target.startValue);
      });
      
      console.log(`Stopped animation: ${id}`);
      return true;
    }
    return false;
  }

  /**
   * Remove animation
   */
  removeAnimation(id: string): boolean {
    const removed = this.animations.delete(id);
    if (removed) {
      console.log(`Removed animation: ${id}`);
      this.animationCount$.next(this.animations.size);
    }
    return removed;
  }

  /**
   * Get animation by ID
   */
  getAnimation(id: string): Animation | undefined {
    return this.animations.get(id);
  }

  /**
   * Check if animation exists and is playing
   */
  isAnimationPlaying(id: string): boolean {
    const animation = this.animations.get(id);
    return animation ? animation.isPlaying : false;
  }

  /**
   * Get all active animations
   */
  getActiveAnimations(): Animation[] {
    return Array.from(this.animations.values()).filter(anim => anim.isPlaying);
  }

  /**
   * Clear all animations
   */
  clearAll(): void {
    console.log(`Clearing ${this.animations.size} animations`);
    this.animations.clear();
    this.animationCount$.next(0);
  }

  /**
   * Update animation target
   */
  private updateAnimationTarget(target: AnimationTarget, progress: number): void {
    const { startValue, endValue } = target;
    
    if (typeof startValue === 'number' && typeof endValue === 'number') {
      // Numeric interpolation
      target.currentValue = startValue + (endValue - startValue) * progress;
    } else if (startValue instanceof THREE.Vector3 && endValue instanceof THREE.Vector3) {
      // Vector3 interpolation
      target.currentValue = startValue.clone().lerp(endValue, progress);
    } else if (startValue instanceof THREE.Color && endValue instanceof THREE.Color) {
      // Color interpolation
      target.currentValue = startValue.clone().lerp(endValue, progress);
    } else {
      // Fallback - direct assignment at 50% progress
      target.currentValue = progress < 0.5 ? startValue : endValue;
    }

    // Apply the value to the object
    this.setObjectProperty(target.object, target.property, target.currentValue);
  }

  /**
   * Apply easing function to progress
   */
  private applyEasing(progress: number, easing: string): number {
    switch (easing) {
      case 'linear':
        return progress;
      case 'easeIn':
        return progress * progress;
      case 'easeOut':
        return 1 - Math.pow(1 - progress, 2);
      case 'easeInOut':
        return progress < 0.5 
          ? 2 * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      default:
        return progress;
    }
  }

  /**
   * Get object property by path
   */
  private getObjectProperty(object: any, path: string): any {
    const parts = path.split('.');
    let current = object;
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  /**
   * Set object property by path
   */
  private setObjectProperty(object: any, path: string, value: any): void {
    const parts = path.split('.');
    let current = object;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return;
      }
    }
    
    const lastPart = parts[parts.length - 1];
    if (current && typeof current === 'object' && lastPart in current) {
      current[lastPart] = value;
    }
  }

  /**
   * Update performance statistics
   */
  private updatePerformanceStats(frameTime: number): void {
    this.frameCount++;
    this.totalFrameTime += frameTime;
    
    // Update stats every 60 frames
    if (this.frameCount % 60 === 0) {
      const averageFrameTime = this.totalFrameTime / this.frameCount;
      
      this.performanceStats$.next({
        activeAnimations: this.getActiveAnimations().length,
        totalAnimations: this.animations.size,
        averageFrameTime
      });
      
      // Reset counters
      this.frameCount = 0;
      this.totalFrameTime = 0;
    }
  }

  /**
   * Get observable for animation count
   */
  getAnimationCount$() {
    return this.animationCount$.asObservable();
  }

  /**
   * Get observable for performance stats
   */
  getPerformanceStats$() {
    return this.performanceStats$.asObservable();
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    console.log('Disposing AnimationController');
    this.stop();
    this.clearAll();
    this.animationCount$.complete();
    this.performanceStats$.complete();
  }
}
