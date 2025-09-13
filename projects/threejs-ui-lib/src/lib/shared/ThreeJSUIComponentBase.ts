import { ChangeDetectorRef, Injectable } from "@angular/core";
import { ModalService } from "./services/modal.service";
import { DemoMessageSimulator } from "./simulation/demo-message-simulator";
import { AnimationController } from "./three/animation-controller";
import { ThreeSceneService } from "./three/three-scene.service";
import { TrajectoryManager } from "./three/trajectory-manager";
import { AlephScriptService } from "../../public-api";

@Injectable()
export class ThreeJSUIComponentBase {
  // Component state
  isLoading = true;
  connectionStatus = "disconnected";
  isDemoRunning = false;
  currentFPS = 0;
  demoStatus: any = null;
  isWireframeMode = false;

  // Demo simulator controls
  demoPhase: "idle" | "single" | "burst" | "continuous" = "idle";
  demoSpeed: "slow" | "normal" | "fast" = "normal";
  demoMessagesCount = 0;
  demoChannel: "sys" | "app" | "ui" | "agent" | "game" = "app";

  constructor(
    protected threeSceneService: ThreeSceneService,
    public alephScriptService: AlephScriptService,
    protected animationController: AnimationController,
    protected trajectoryManager: TrajectoryManager,
    public demoSimulator: DemoMessageSimulator,
    protected modalService: ModalService,
    protected cdr: ChangeDetectorRef
  ) {}

  toggleDemo() {
    if (this.isDemoRunning) {
      console.log("� Stopping demo simulation...");
      this.demoSimulator.stop();
      this.isDemoRunning = false;
    } else {
      console.log("� Starting demo simulation...");
      this.demoSimulator.start();
      this.isDemoRunning = true;
    }
  }

  // Modal Management Methods
  toggleBotManagement(): void {
    const existingModal = this.modalService.getModal("bot-management");
    if (existingModal) {
      this.modalService.close("bot-management");
    } else {
      this.modalService.open({
        id: "bot-management",
        title: "🤖 Bot Management",
        position: { x: 50, y: 120 },
        size: { width: 350, height: 500 },
        draggable: true,
        resizable: true,
        closable: true,
        minimizable: true,
      });
    }
  }

  toggleMessagePanel(): void {
    const existingModal = this.modalService.getModal("message-panel");
    if (existingModal) {
      this.modalService.close("message-panel");
    } else {
      this.modalService.open({
        id: "message-panel",
        title: "💬 Message Stream",
        position: { x: window.innerWidth - 400, y: 120 },
        size: { width: 380, height: 500 },
        draggable: true,
        resizable: true,
        closable: true,
        minimizable: true,
      });
    }
  }

  toggleAlephScriptTest(): void {
    const existingModal = this.modalService.getModal("alephscript-test");
    if (existingModal) {
      this.modalService.close("alephscript-test");
    } else {
      this.modalService.open({
        id: "alephscript-test",
        title: "⚡ AlephScript Connection",
        position: { x: 200, y: 200 },
        size: { width: 450, height: 400 },
        draggable: true,
        resizable: true,
        closable: true,
        minimizable: true,
      });
    }
  }

  // Advanced Demo Controls
  setDemoPhase(phase: string): void {
    this.demoPhase = phase as "idle" | "single" | "burst" | "continuous";
    console.log(`🎭 Setting demo phase to: ${phase}`);
    // Future: Connect to actual simulator when methods are available
  }

  setDemoSpeed(speed: string): void {
    this.demoSpeed = speed as "slow" | "normal" | "fast";
    console.log(`⚡ Setting demo speed to: ${speed}`);
    const speedMultiplier = {
      slow: 0.5,
      normal: 1.0,
      fast: 2.0
    };
    // Future: Apply speed to simulator when method is available
  }

  setDemoChannel(channel: string): void {
    this.demoChannel = channel as "sys" | "app" | "ui" | "agent" | "game";
    console.log(`📡 Setting demo channel to: ${channel}`);
    // Future: Apply channel to simulator when method is available
  }

  sendSingleDemoMessage(): void {
    console.log(`📤 Sending single demo message on channel: ${this.demoChannel}`);
    // Future: Use simulator.sendSingleMessage when available
    this.demoMessagesCount++;
  }

  sendDemoBurst(): void {
    console.log(`💥 Sending demo burst on channel: ${this.demoChannel}`);
    // Future: Use simulator.sendBurst when available
    this.demoMessagesCount += 5;
  }

  resetDemoSimulator(): void {
    console.log(`🔄 Resetting demo simulator`);
    this.demoMessagesCount = 0;
    this.demoPhase = "idle";
    this.isDemoRunning = false;
    // Future: Use simulator.reset when available
  }

  // Visual Controls
  toggleWireframe(): void {
    this.isWireframeMode = !this.isWireframeMode;
    console.log(`🔲 Wireframe mode: ${this.isWireframeMode ? 'ON' : 'OFF'}`);
    // Future: Apply to ThreeJS scene when method is available
  }

  resetCamera(): void {
    console.log(`📷 Resetting camera position`);
    // Future: Apply to ThreeJS camera when method is available
  }

  takeScreenshot(): void {
    console.log(`📸 Taking screenshot`);
    // Future: Capture ThreeJS canvas when method is available
  }

  resetScene(): void {
    console.log('🔄 Resetting scene...');
    
    // Clear all particles
    this.trajectoryManager.clearAllParticles();
    
    // Stop demo if running
    if (this.isDemoRunning) {
      this.isDemoRunning = false;
    }
    
    // Reset Three.js scene
    if (this.threeSceneService.reset) {
      this.threeSceneService.reset();
    }
    
    console.log('🔄 Scene reset complete');
  }

  // Performance monitoring
  getActiveParticleCount(): number {
    // Return actual count when trajectoryManager method is available
    return Math.floor(Math.random() * 100); // Placeholder for demo
  }

  getActiveAnimationCount(): number {
    // Return actual count when animationController method is available  
    return Math.floor(Math.random() * 20); // Placeholder for demo
  }

  // Modal Controls
  openSettings(): void {
    const existingModal = this.modalService.getModal("settings");
    if (existingModal) {
      this.modalService.bringToFront("settings");
    } else {
      this.modalService.open({
        id: "settings",
        title: "⚙️ Settings",
        position: { x: 300, y: 150 },
        size: { width: 400, height: 500 },
        draggable: true,
        resizable: true,
        closable: true,
        minimizable: true,
      });
    }
  }

  openHelp(): void {
    const existingModal = this.modalService.getModal("help");
    if (existingModal) {
      this.modalService.bringToFront("help");
    } else {
      this.modalService.open({
        id: "help",
        title: "📖 Help & Controls",
        position: { x: 150, y: 100 },
        size: { width: 500, height: 600 },
        draggable: true,
        resizable: true,
        closable: true,
        minimizable: true,
      });
    }
  }

  openDemoControls(): void {
    const existingModal = this.modalService.getModal("demo-controls");
    if (existingModal) {
      this.modalService.bringToFront("demo-controls");
    } else {
      this.modalService.open({
        id: "demo-controls",
        title: "🎛️ Advanced Demo Controls",
        position: { x: 100, y: 150 },
        size: { width: 500, height: 600 },
        draggable: true,
        resizable: true,
        closable: true,
        minimizable: true,
      });
    }
  }

  // Connection Controls
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
    console.log('� Alternando modo offline...');
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
}
