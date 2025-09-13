import { Component, signal } from '@angular/core';
import { 
  ThreeJSLayoutComponent, 
  ThreeJSLayoutConfig,
  ThreeJSScenePureComponent,
  ThreeJSControlsComponent,
  ThreeJSHeaderComponent,
  ThreeJSControlsState,
  ThreeJSControlsEvents,
  ThreeJSHeaderState,
  ThreeJSSceneConfig
} from '@escrivivir/threejs-ui-lib';

@Component({
  selector: 'app-root',
  imports: [
    ThreeJSScenePureComponent,
    ThreeJSControlsComponent,
    ThreeJSHeaderComponent
  ],
  template: `
    <div class="app-container">
      <h1>🎮 ThreeJS UI Library Demo - {{ title() }} (Nueva Arquitectura Modular)</h1>
      <!-- Demo con composición personalizada -->
      <section class="demo-section">
        <h2>🎨 Composición Personalizada</h2>
        <p>AS T3js</p>
        <div class="custom-composition">
          <!-- Header personalizado -->
          <div class="custom-header">
            <tjs-threejs-header [state]="headerState"></tjs-threejs-header>
          </div>
          
          <div class="main-content">
            <!-- Escena pura sin UI superpuesta -->
            <div class="scene-container">
              <tjs-threejs-scene-pure 
                #pureScene
                [config]="pureSceneConfig"
                [loadingMessage]="'Cargando escena liberada...'"
                [isDemoRunning]="controlsState.isDemoRunning"
                [demoSpeed]="controlsState.demoSpeed"
                [demoChannel]="controlsState.demoChannel"
                (sceneReady)="onSceneReady()"
                (connectionStatusChange)="onConnectionChange($event)"
                (fpsUpdate)="onFpsUpdate($event)">
              </tjs-threejs-scene-pure>
            </div>
            
            <!-- Panel de información -->
            <div class="info-panel">
              <h3>📊 Información en Tiempo Real</h3>
              <div class="stat-grid">
                <div class="stat-item">
                  <label>FPS:</label>
                  <span class="stat-value">{{currentFps}}</span>
                </div>
                <div class="stat-item">
                  <label>Estado:</label>
                  <span class="stat-value status" [class]="connectionStatus">{{connectionStatus}}</span>
                </div>
                <div class="stat-item">
                  <label>Escena:</label>
                  <span class="stat-value">{{sceneStatus}}</span>
                </div>
              </div>
              
              <!-- Controles rápidos -->
              <div class="quick-controls">
                <h4>⚡ Controles Rápidos</h4>
                <button (click)="pureScene.resetCamera()" class="control-btn">
                  📷 Reset Cámara
                </button>
                <button (click)="pureScene.takeScreenshot()" class="control-btn">
                  📸 Captura
                </button>
                <button (click)="pureScene.resetScene()" class="control-btn">
                  🔄 Reset Escena
                </button>
                <button (click)="toggleDemo()" class="control-btn" [class]="demoActive ? 'active' : ''">
                  {{demoActive ? '⏹️ Parar' : '▶️ Iniciar'}} Demo
                </button>
              </div>
            </div>
          </div>
          
          <!-- Controles completos en la parte inferior -->
          <div class="controls-container">
            <tjs-threejs-controls 
              [state]="controlsState" 
              [events]="controlsEvents">
            </tjs-threejs-controls>
          </div>
        </div>
      </section>
      

    </div>
  `,
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('dev-app');
  
  // Estado de la aplicación
  currentFps = 0;
  connectionStatus = 'disconnected';
  sceneStatus = 'initializing';
  demoActive = false;

  // Configuración para el layout completo
  layoutConfig: ThreeJSLayoutConfig = {
    gameTitle: 'Demo Arquitectura Modular',
    sceneConfig: {
      debugMode: true,
      alephScriptUrl: 'ws://localhost:3000',
      autoConnect: false
    },
    showHeader: true,
    showLeftSidebar: true,
    showRightSidebar: true,
    showControls: true,
    controlsPosition: 'bottom'
  };

  // Configuración para la escena pura
  pureSceneConfig: ThreeJSSceneConfig = {
    debugMode: true,
    alephScriptUrl: 'ws://localhost:3000',
    autoConnect: false
  };

  // Configuración minimalista
  minimalLayoutConfig: ThreeJSLayoutConfig = {
    gameTitle: 'Vista Minimalista',
    sceneConfig: {
      debugMode: false
    },
    showHeader: false,
    showLeftSidebar: false,
    showRightSidebar: false,
    showControls: false
  };

  // Estado para componentes individuales
  headerState: ThreeJSHeaderState = {
    gameTitle: 'Escena Three.js Liberada',
    connectionStatus: 'disconnected'
  };

  controlsState: ThreeJSControlsState = {
    isDemoRunning: false,
    demoPhase: 'idle',
    demoSpeed: 'normal',
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

  // Eventos para controles
  controlsEvents: { [K in keyof ThreeJSControlsEvents]: any } = {
    toggleDemo: { emit: () => this.toggleDemo() },
    phaseChange: { emit: (phase: string) => this.handlePhaseChange(phase) },
    speedChange: { emit: (speed: string) => this.handleSpeedChange(speed) },
    channelChange: { emit: (channel: string) => this.handleChannelChange(channel) },
    singleMessage: { emit: () => this.handleSingleMessage() },
    burst: { emit: () => this.handleBurst() },
    resetDemo: { emit: () => this.resetDemo() },
    toggleWireframe: { emit: () => this.handleToggleWireframe() },
    resetCamera: { emit: () => this.handleResetCamera() },
    takeScreenshot: { emit: () => this.handleTakeScreenshot() },
    resetScene: { emit: () => this.handleResetScene() },
    connect: { emit: () => this.handleConnect() },
    disconnect: { emit: () => this.handleDisconnect() },
    toggleOffline: { emit: () => this.handleToggleOffline() },
    openAlephScript: { emit: () => console.log('Open AlephScript modal') },
    openSettings: { emit: () => console.log('Open Settings modal') },
    openHelp: { emit: () => console.log('Open Help modal') },
    openAdvanced: { emit: () => console.log('Open Advanced modal') }
  };

  // Event handlers
  onSceneReady() {
    console.log('🎬 Escena lista en dev-app');
    this.sceneStatus = 'ready';
  }

  onConnectionChange(status: string) {
    this.connectionStatus = status;
    this.headerState.connectionStatus = status;
    this.controlsState.connectionStatus = status;
  }

  onFpsUpdate(fps: number) {
    this.currentFps = fps;
    this.controlsState.currentFPS = fps;
  }

  toggleDemo() {
    console.log('🚀 [APP] toggleDemo() called - Current state:', this.demoActive);
    this.demoActive = !this.demoActive;
    this.controlsState.isDemoRunning = this.demoActive;
    console.log(`🎮 [APP] Demo ${this.demoActive ? 'INICIADO' : 'PARADO'} - New state:`, this.demoActive);
    console.log('📊 [APP] Controls state updated:', this.controlsState);
    console.log('🔄 [APP] Component should now react to isDemoRunning:', this.controlsState.isDemoRunning);
  }

  // Control event handlers
  handlePhaseChange(phase: string) {
    this.controlsState.demoPhase = phase;
    console.log('🎭 Phase changed to:', phase);
  }

  handleSpeedChange(speed: string) {
    this.controlsState.demoSpeed = speed;
    console.log('⚡ Speed changed to:', speed);
  }

  handleChannelChange(channel: string) {
    this.controlsState.demoChannel = channel;
    console.log('📡 Channel changed to:', channel);
  }

  handleSingleMessage() {
    this.controlsState.demoMessagesCount++;
    console.log('📤 Single message sent');
  }

  handleBurst() {
    this.controlsState.demoMessagesCount += 5;
    console.log('💥 Burst sent');
  }

  resetDemo() {
    this.demoActive = false;
    this.controlsState.isDemoRunning = false;
    this.controlsState.demoMessagesCount = 0;
    console.log('🔄 Demo reset');
  }

  handleToggleWireframe() {
    this.controlsState.isWireframeMode = !this.controlsState.isWireframeMode;
    console.log('🔲 Wireframe toggled');
  }

  handleResetCamera() {
    console.log('📷 Camera reset');
  }

  handleTakeScreenshot() {
    console.log('📸 Screenshot taken');
  }

  handleResetScene() {
    console.log('🔄 Scene reset');
  }

  handleConnect() {
    this.controlsState.isLoading = true;
    console.log('🔌 Connecting...');
    
    // Simular conexión
    setTimeout(() => {
      this.onConnectionChange('connected');
      this.controlsState.isLoading = false;
    }, 2000);
  }

  handleDisconnect() {
    this.onConnectionChange('disconnected');
    console.log('🔌 Disconnected');
  }

  handleToggleOffline() {
    this.controlsState.isOfflineMode = !this.controlsState.isOfflineMode;
    console.log('📴 Offline mode toggled');
  }
}
