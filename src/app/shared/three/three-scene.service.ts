import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject, interval } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

@Injectable({
  providedIn: 'root'
})
export class ThreeSceneService {
  private destroy$ = new Subject<void>();
  
  // Three.js core objects
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private controls: OrbitControls | null = null;
  
  // Scene objects
  private centralHub: THREE.Mesh | null = null;
  private botPositions: THREE.Mesh[] = [];
  private gridHelper: THREE.GridHelper | null = null;
  
  // Animation and performance
  private animationId: number | null = null;
  private clock = new THREE.Clock();
  private fps$ = new BehaviorSubject<number>(0);
  
  // Scene state
  private isInitialized = false;
  private lastFrameTime = 0;
  private frameCount = 0;
  
  // Public observables
  public readonly fps = this.fps$.asObservable();

  constructor() {
    console.log('ThreeSceneService initialized');
  }

  /**
   * Initialize the Three.js scene
   */
  async initialize(container: HTMLElement): Promise<void> {
    try {
      console.log('Initializing Three.js scene...');
      
      // Create scene
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x0a0a0a);
      this.scene.fog = new THREE.Fog(0x0a0a0a, 10, 100);
      
      // Create camera
      const aspect = container.clientWidth / container.clientHeight;
      this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
      this.camera.position.set(0, 8, 12);
      
      // Create renderer
      this.renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
      this.renderer.setSize(container.clientWidth, container.clientHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1;
      
      // Add canvas to container
      container.appendChild(this.renderer.domElement);
      
      // Create controls
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.screenSpacePanning = false;
      this.controls.minDistance = 3;
      this.controls.maxDistance = 50;
      this.controls.maxPolarAngle = Math.PI / 2;
      
      // Set up lights
      this.setupLighting();
      
      // Create scene objects
      this.createCentralHub();
      this.createBotPositions();
      this.createEnvironment();
      
      // Set up resize handling
      this.setupResizeHandler(container);
      
      this.isInitialized = true;
      console.log('Three.js scene initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize Three.js scene:', error);
      throw error;
    }
  }

  /**
   * Set up scene lighting
   */
  private setupLighting(): void {
    if (!this.scene) return;
    
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    this.scene.add(ambientLight);
    
    // Main directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    this.scene.add(directionalLight);
    
    // Fill light
    const fillLight = new THREE.DirectionalLight(0x4488ff, 0.2);
    fillLight.position.set(-10, 5, -5);
    this.scene.add(fillLight);
    
    // Rim light
    const rimLight = new THREE.DirectionalLight(0xff8844, 0.1);
    rimLight.position.set(0, -10, 10);
    this.scene.add(rimLight);
  }

  /**
   * Create the central Socket.io hub
   */
  private createCentralHub(): void {
    if (!this.scene) return;
    
    // Central sphere geometry
    const geometry = new THREE.SphereGeometry(1.5, 32, 32);
    
    // Glowing material with emission
    const material = new THREE.MeshStandardMaterial({
      color: 0x3498db,
      emissive: 0x1a5490,
      emissiveIntensity: 0.3,
      metalness: 0.1,
      roughness: 0.2
    });
    
    this.centralHub = new THREE.Mesh(geometry, material);
    this.centralHub.position.set(0, 0, 0);
    this.centralHub.castShadow = true;
    this.centralHub.userData = { type: 'central_hub' };
    
    this.scene.add(this.centralHub);
    
    // Add a subtle glow effect
    const glowGeometry = new THREE.SphereGeometry(2, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x3498db,
      transparent: true,
      opacity: 0.1
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.centralHub.add(glow);
    
    console.log('Central hub created');
  }

  /**
   * Create bot positions on cardinal spirals
   */
  private createBotPositions(): void {
    if (!this.scene) return;
    
    // Define cardinal directions (N, S, E, W)
    const cardinals = [
      { name: 'North', angle: 0 },
      { name: 'East', angle: Math.PI / 2 },
      { name: 'South', angle: Math.PI },
      { name: 'West', angle: 3 * Math.PI / 2 }
    ];
    
    // Create 2 bot positions per cardinal direction
    cardinals.forEach((cardinal, cardinalIndex) => {
      for (let i = 0; i < 2; i++) {
        const botIndex = cardinalIndex * 2 + i;
        
        // Calculate spiral position
        const radius = 5 + (i * 2); // Spiral outward
        const angle = cardinal.angle + (i * 0.3); // Slight angle offset
        const height = i * 0.5; // Slight height variation
        
        const position = new THREE.Vector3(
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius
        );
        
        // Create bot marker
        const geometry = new THREE.ConeGeometry(0.3, 1.2, 8);
        const material = new THREE.MeshStandardMaterial({
          color: 0x95a5a6, // Default inactive color
          metalness: 0.3,
          roughness: 0.7
        });
        
        const botMesh = new THREE.Mesh(geometry, material);
        botMesh.position.copy(position);
        botMesh.castShadow = true;
        botMesh.receiveShadow = true;
        
        // Store bot data
        botMesh.userData = {
          type: 'bot_position',
          botId: `bot_${cardinal.name.toLowerCase()}_${i + 1}`,
          cardinal: cardinal.name,
          index: i,
          position: position.clone()
        };
        
        this.botPositions.push(botMesh);
        this.scene.add(botMesh);
        
        // Add position marker (ring around bot)
        const ringGeometry = new THREE.RingGeometry(0.8, 1.2, 16);
        const ringMaterial = new THREE.MeshBasicMaterial({
          color: 0x34495e,
          transparent: true,
          opacity: 0.3,
          side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = -Math.PI / 2;
        ring.position.copy(position);
        ring.position.y = 0.1;
        
        this.scene.add(ring);
      }
    });
    
    console.log(`Created ${this.botPositions.length} bot positions`);
  }

  /**
   * Create environment helpers
   */
  private createEnvironment(): void {
    if (!this.scene) return;
    
    // Grid helper
    this.gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
    this.gridHelper.material.transparent = true;
    this.gridHelper.material.opacity = 0.3;
    this.scene.add(this.gridHelper);
    
    // Axes helper (for development)
    const axesHelper = new THREE.AxesHelper(3);
    axesHelper.material.transparent = true;
    axesHelper.material.opacity = 0.5;
    this.scene.add(axesHelper);
    
    console.log('Environment created');
  }

  /**
   * Set up window resize handling
   */
  private setupResizeHandler(container: HTMLElement): void {
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        
        if (this.camera && this.renderer) {
          this.camera.aspect = width / height;
          this.camera.updateProjectionMatrix();
          this.renderer.setSize(width, height);
        }
      }
    });
    
    resizeObserver.observe(container);
    
    // Clean up observer on destroy
    this.destroy$.subscribe(() => {
      resizeObserver.disconnect();
    });
  }

  /**
   * Start the render loop
   */
  startRenderLoop(): void {
    if (!this.isInitialized) {
      console.warn('Cannot start render loop: Scene not initialized');
      return;
    }
    
    console.log('Starting render loop...');
    this.animate();
    
    // Start FPS monitoring
    interval(1000).pipe(takeUntil(this.destroy$)).subscribe(() => {
      const fps = this.frameCount;
      this.fps$.next(fps);
      this.frameCount = 0;
    });
  }

  /**
   * Animation loop
   */
  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    
    const deltaTime = this.clock.getDelta();
    this.frameCount++;
    
    // Update controls
    if (this.controls) {
      this.controls.update();
    }
    
    // Animate central hub
    if (this.centralHub) {
      this.centralHub.rotation.y += deltaTime * 0.5;
      
      // Subtle pulsing effect
      const pulse = Math.sin(this.clock.elapsedTime * 2) * 0.1;
      this.centralHub.scale.setScalar(1 + pulse * 0.05);
    }
    
    // Animate bot positions
    this.botPositions.forEach((bot, index) => {
      if (bot) {
        // Gentle bobbing motion
        const bobOffset = Math.sin(this.clock.elapsedTime * 1.5 + index * 0.3) * 0.1;
        bot.position.y = bot.userData.position.y + bobOffset;
        
        // Subtle rotation
        bot.rotation.y = this.clock.elapsedTime * 0.2 + index * 0.5;
      }
    });
    
    // Render the scene
    if (this.scene && this.camera && this.renderer) {
      this.renderer.render(this.scene, this.camera);
    }
  };

  /**
   * Update bot status visualization
   */
  updateBotStatus(botId: string, status: 'online' | 'offline' | 'processing'): void {
    const botMesh = this.botPositions.find(bot => bot.userData.botId === botId);
    
    if (!botMesh) {
      console.warn('Bot not found:', botId);
      return;
    }
    
    const material = botMesh.material as THREE.MeshStandardMaterial;
    
    switch (status) {
      case 'online':
        material.color.setHex(0x2ecc71); // Green
        material.emissive.setHex(0x0a4015);
        break;
      case 'offline':
        material.color.setHex(0x95a5a6); // Gray
        material.emissive.setHex(0x000000);
        break;
      case 'processing':
        material.color.setHex(0xf39c12); // Orange
        material.emissive.setHex(0x4a3200);
        break;
    }
    
    console.log(`Updated bot ${botId} status to ${status}`);
  }

  /**
   * Reset scene to initial state
   */
  reset(): void {
    console.log('Resetting scene...');
    
    // Reset camera position
    if (this.camera && this.controls) {
      this.camera.position.set(0, 8, 12);
      this.controls.reset();
    }
    
    // Reset bot colors
    this.botPositions.forEach(bot => {
      if (bot) {
        const material = bot.material as THREE.MeshStandardMaterial;
        material.color.setHex(0x95a5a6);
        material.emissive.setHex(0x000000);
      }
    });
    
    // Reset clock
    this.clock.start();
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    console.log('Disposing Three.js scene...');
    
    this.destroy$.next();
    this.destroy$.complete();
    
    // Stop animation loop
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    // Dispose of Three.js objects
    if (this.renderer) {
      this.renderer.dispose();
      
      // Remove canvas from DOM
      if (this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
    
    if (this.controls) {
      this.controls.dispose();
    }
    
    // Dispose of geometries and materials
    this.scene?.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
    
    // Clean up references
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.centralHub = null;
    this.botPositions = [];
    this.gridHelper = null;
    
    this.fps$.complete();
    
    this.isInitialized = false;
  }
}
