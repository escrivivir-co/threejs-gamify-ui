# ThreeJS Gamify UI - Layout Refactoring

## Nuevo Sistema Modular

Se ha refactorizado la librería para separar la escena Three.js de los elementos de UI, permitiendo mejor orquestación del layout desde fuera.

## Componentes Disponibles

### 1. Componente de Escena Puro
```typescript
import { ThreeJSScenePureComponent, ThreeJSSceneConfig } from 'threejs-gamification-ui';

// Configuración
const sceneConfig: ThreeJSSceneConfig = {
  debugMode: true,
  alephScriptUrl: 'ws://localhost:3000',
  autoConnect: true
};
```

**Template:**
```html
<tjs-threejs-scene-pure 
  [config]="sceneConfig"
  (sceneReady)="onSceneReady()"
  (connectionStatusChange)="onConnectionChange($event)"
  (fpsUpdate)="onFpsUpdate($event)">
</tjs-threejs-scene-pure>
```

### 2. Componente de Layout Orquestador
```typescript
import { ThreeJSLayoutComponent, ThreeJSLayoutConfig } from 'threejs-gamification-ui';

const layoutConfig: ThreeJSLayoutConfig = {
  gameTitle: 'Mi Aplicación 3D',
  sceneConfig: {
    debugMode: true,
    alephScriptUrl: 'ws://localhost:3000'
  },
  showHeader: true,
  showLeftSidebar: true,
  showRightSidebar: true,
  showControls: true,
  controlsPosition: 'bottom' // 'top', 'bottom', 'floating'
};
```

**Template:**
```html
<tjs-threejs-layout [config]="layoutConfig"></tjs-threejs-layout>
```

### 3. Componentes Individuales

#### Escena + Header personalizado
```html
<div class="mi-layout-personalizado">
  <tjs-threejs-header [state]="headerState"></tjs-threejs-header>
  
  <div class="contenido-principal">
    <tjs-threejs-scene-pure [config]="sceneConfig"></tjs-threejs-scene-pure>
  </div>
  
  <tjs-threejs-controls [state]="controlsState" [events]="controlsEvents"></tjs-threejs-controls>
</div>
```

#### Solo la escena (máxima flexibilidad)
```html
<div class="mi-interfaz-personalizada">
  <!-- Tu UI personalizada -->
  <div class="panel-izquierdo">
    <h2>Mi Panel</h2>
    <!-- Tu contenido -->
  </div>
  
  <!-- Solo la escena limpia -->
  <div class="escena-contenedor">
    <tjs-threejs-scene-pure [config]="sceneConfig"></tjs-threejs-scene-pure>
  </div>
  
  <!-- Tu UI personalizada -->
  <div class="panel-derecho">
    <h2>Otro Panel</h2>
    <!-- Tu contenido -->
  </div>
</div>
```

## Compatibilidad Hacia Atrás

El componente original `ThreeJSUIComponent` **sigue funcionando igual** que antes:

```html
<!-- Esto sigue funcionando -->
<tjs-threejs-ui [config]="config"></tjs-threejs-ui>
```

```typescript
import { ThreeJSUIComponent, ThreeJSUIConfig } from 'threejs-gamification-ui';

const config: ThreeJSUIConfig = {
  gameTitle: 'Mi Juego',
  serverUrl: 'http://localhost:3000',
  alephScriptUrl: 'ws://localhost:3000',
  debugMode: true
};
```

## Casos de Uso

### 1. Migración Gradual
Puedes empezar usando el componente original y migrar gradualmente:

```typescript
// Antes (sigue funcionando)
<tjs-threejs-ui [config]="config"></tjs-threejs-ui>

// Después - paso a paso
<tjs-threejs-layout [config]="layoutConfig"></tjs-threejs-layout>

// Después - máxima personalización
<mi-layout-personalizado>
  <tjs-threejs-scene-pure [config]="sceneConfig"></tjs-threejs-scene-pure>
</mi-layout-personalizado>
```

### 2. UI Personalizada Completa
```html
<div class="aplicacion-completa">
  <nav class="navegacion-principal">
    <!-- Tu navegación -->
  </nav>
  
  <main class="contenido-principal">
    <aside class="sidebar">
      <!-- Tus controles personalizados -->
    </aside>
    
    <section class="escena-3d">
      <!-- Solo la escena, sin UI superpuesta -->
      <tjs-threejs-scene-pure 
        [config]="sceneConfig"
        #scene
        (sceneReady)="onSceneReady()">
      </tjs-threejs-scene-pure>
    </section>
    
    <aside class="panel-info">
      <!-- Tu información personalizada -->
      <div class="fps">FPS: {{currentFPS}}</div>
      <button (click)="scene.resetCamera()">Reset Camera</button>
      <button (click)="scene.takeScreenshot()">Screenshot</button>
    </aside>
  </main>
</div>
```

### 3. Configuraciones de Layout

#### Layout Minimalista (solo escena)
```typescript
const minimalConfig: ThreeJSLayoutConfig = {
  gameTitle: 'Escena Minimalista',
  sceneConfig: { debugMode: false },
  showHeader: false,
  showLeftSidebar: false,
  showRightSidebar: false,
  showControls: false
};
```

#### Layout con Controles Flotantes
```typescript
const floatingConfig: ThreeJSLayoutConfig = {
  gameTitle: 'Controles Flotantes',
  sceneConfig: { debugMode: true },
  showHeader: true,
  showLeftSidebar: false,
  showRightSidebar: false,
  showControls: true,
  controlsPosition: 'floating'
};
```

#### Layout Completo
```typescript
const fullConfig: ThreeJSLayoutConfig = {
  gameTitle: 'Aplicación Completa',
  sceneConfig: { 
    debugMode: true,
    alephScriptUrl: 'ws://localhost:3000',
    autoConnect: true
  },
  showHeader: true,
  showLeftSidebar: true,
  showRightSidebar: true,
  showControls: true,
  controlsPosition: 'bottom'
};
```

## Ventajas del Nuevo Sistema

1. **Separación de Responsabilidades**: La escena 3D está separada del UI
2. **Flexibilidad**: Puedes componer el layout como necesites
3. **Reutilización**: Cada componente puede usarse independientemente
4. **Compatibilidad**: El componente original sigue funcionando
5. **Escalabilidad**: Fácil agregar nuevos tipos de paneles o controles
6. **Personalización**: Máximo control sobre el diseño y posicionamiento

## Migración Recomendada

1. **Mantener** el componente original en producción
2. **Experimentar** con `ThreeJSLayoutComponent` en desarrollo
3. **Migrar gradualmente** a componentes individuales según necesites
4. **Personalizar completamente** cuando tengas requisitos específicos de UI
