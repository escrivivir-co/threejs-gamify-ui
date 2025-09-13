import { Component } from '@angular/core';
import { ThreeJSLayoutConfig, ThreeJSSceneConfig } from '../public-api';

@Component({
  selector: 'app-ejemplo-modular',
  template: `
    <div class="contenedor-ejemplo">
      <h1>Ejemplo de Layout Modular ThreeJS</h1>
      
      <!-- Ejemplo 1: Layout completo predefinido -->
      <section class="ejemplo">
        <h2>1. Layout Completo (reemplaza el componente original)</h2>
        <tjs-threejs-layout [config]="layoutCompletoConfig"></tjs-threejs-layout>
      </section>

      <!-- Ejemplo 2: Layout minimalista -->
      <section class="ejemplo">
        <h2>2. Layout Minimalista (solo escena)</h2>
        <tjs-threejs-layout [config]="layoutMinimalistaConfig"></tjs-threejs-layout>
      </section>

      <!-- Ejemplo 3: Composición personalizada -->
      <section class="ejemplo">
        <h2>3. Composición Personalizada</h2>
        <div class="layout-personalizado">
          <!-- Header personalizado -->
          <tjs-threejs-header [state]="headerState"></tjs-threejs-header>
          
          <div class="contenido-principal">
            <!-- Solo la escena pura -->
            <div class="escena-wrapper">
              <tjs-threejs-scene-pure 
                #escena
                [config]="escenaConfig"
                (sceneReady)="onEscenaLista()"
                (fpsUpdate)="onActualizacionFPS($event)">
              </tjs-threejs-scene-pure>
            </div>
            
            <!-- Panel de información personalizado -->
            <div class="panel-info">
              <h3>Información de la Escena</h3>
              <div class="stat">FPS: {{fpsActual}}</div>
              <div class="stat">Estado: {{estadoConexion}}</div>
              
              <!-- Controles personalizados -->
              <div class="controles-personalizados">
                <button (click)="escena.resetCamera()" class="btn">
                  📷 Reset Cámara
                </button>
                <button (click)="escena.takeScreenshot()" class="btn">
                  📸 Captura
                </button>
                <button (click)="escena.resetScene()" class="btn">
                  🔄 Reset Escena
                </button>
              </div>
            </div>
          </div>
          
          <!-- Controles en la parte inferior -->
          <tjs-threejs-controls 
            [state]="estadoControles" 
            [events]="eventosControles">
          </tjs-threejs-controls>
        </div>
      </section>

      <!-- Ejemplo 4: Solo la escena (máxima personalización) -->
      <section class="ejemplo">
        <h2>4. Solo Escena (para integración en UI existente)</h2>
        <div class="mi-interfaz-existente">
          <nav class="navegacion">
            <span>Mi App</span>
            <div class="nav-items">
              <button>Home</button>
              <button>Settings</button>
            </div>
          </nav>
          
          <main class="contenido">
            <aside class="sidebar">
              <h3>Mis Controles</h3>
              <button (click)="toggleDemo()" class="btn">
                {{demoActivo ? 'Parar' : 'Iniciar'}} Demo
              </button>
            </aside>
            
            <!-- La escena se integra perfectamente -->
            <section class="escena-3d">
              <tjs-threejs-scene-pure 
                [config]="escenaConfig"
                #escenaPersonalizada>
              </tjs-threejs-scene-pure>
            </section>
          </main>
        </div>
      </section>
    </div>
  `,
  styleUrls: ['./ejemplo-modular.component.css']
})
export class EjemploModularComponent {
  // Configuraciones para diferentes layouts
  layoutCompletoConfig: ThreeJSLayoutConfig = {
    gameTitle: 'Aplicación Completa',
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

  layoutMinimalistaConfig: ThreeJSLayoutConfig = {
    gameTitle: 'Vista Minimalista',
    sceneConfig: {
      debugMode: false
    },
    showHeader: false,
    showLeftSidebar: false,
    showRightSidebar: false,
    showControls: false
  };

  escenaConfig: ThreeJSSceneConfig = {
    debugMode: true,
    alephScriptUrl: 'ws://localhost:3000',
    autoConnect: false
  };

  // Estados para componentes individuales
  headerState = {
    gameTitle: 'Mi Aplicación 3D',
    connectionStatus: 'disconnected'
  };

  estadoControles = {
    isDemoRunning: false,
    demoPhase: 'idle',
    demoSpeed: 1,
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
  eventosControles = {
    toggleDemo: { emit: () => this.toggleDemo() },
    phaseChange: { emit: (phase: string) => console.log('Phase:', phase) },
    speedChange: { emit: (speed: number) => console.log('Speed:', speed) },
    channelChange: { emit: (channel: string) => console.log('Channel:', channel) },
    singleMessage: { emit: () => console.log('Single message') },
    burst: { emit: () => console.log('Burst') },
    resetDemo: { emit: () => this.resetDemo() },
    toggleWireframe: { emit: () => console.log('Toggle wireframe') },
    resetCamera: { emit: () => console.log('Reset camera') },
    takeScreenshot: { emit: () => console.log('Take screenshot') },
    resetScene: { emit: () => console.log('Reset scene') },
    connect: { emit: () => this.conectar() },
    disconnect: { emit: () => this.desconectar() },
    toggleOffline: { emit: () => console.log('Toggle offline') },
    openAlephScript: { emit: () => console.log('Open AlephScript') },
    openSettings: { emit: () => console.log('Open settings') },
    openHelp: { emit: () => console.log('Open help') },
    openAdvanced: { emit: () => console.log('Open advanced') }
  };

  // Estado de la aplicación
  fpsActual = 0;
  estadoConexion = 'disconnected';
  demoActivo = false;

  onEscenaLista() {
    console.log('🎬 Escena lista para usar');
    this.estadoConexion = 'ready';
  }

  onActualizacionFPS(fps: number) {
    this.fpsActual = fps;
  }

  toggleDemo() {
    this.demoActivo = !this.demoActivo;
    this.estadoControles.isDemoRunning = this.demoActivo;
    console.log('Demo:', this.demoActivo ? 'Iniciado' : 'Parado');
  }

  resetDemo() {
    this.demoActivo = false;
    this.estadoControles.isDemoRunning = false;
    this.estadoControles.demoMessagesCount = 0;
    console.log('Demo reseteado');
  }

  conectar() {
    console.log('Conectando...');
    this.estadoConexion = 'connecting';
    this.headerState.connectionStatus = 'connecting';
    
    // Simular conexión
    setTimeout(() => {
      this.estadoConexion = 'connected';
      this.headerState.connectionStatus = 'connected';
      this.estadoControles.connectionStatus = 'connected';
    }, 2000);
  }

  desconectar() {
    console.log('Desconectando...');
    this.estadoConexion = 'disconnected';
    this.headerState.connectionStatus = 'disconnected';
    this.estadoControles.connectionStatus = 'disconnected';
  }
}
