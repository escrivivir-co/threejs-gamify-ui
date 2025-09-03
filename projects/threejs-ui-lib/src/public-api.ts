/*
 * Public API Surface of threejs-ui-lib
 */

// Main component and module
export * from './lib/threejs-ui-component';
export * from './lib/threejs-ui-module';

// Services
export * from './lib/core/services/alephscript.service';
export * from './lib/shared/three/three-scene.service';
export * from './lib/core/bridge/rxjs-socket-bridge';

// Types and interfaces
export * from './lib/core/bridge/interfaces';
export * from './lib/shared/models/bot.model';

// Sub-components (if needed separately)
export * from './lib/features/bot-management/bot-list.component';
export * from './lib/features/message-panel/message-panel.component';
