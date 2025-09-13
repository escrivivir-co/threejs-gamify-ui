/*
 * Public API Surface of threejs-ui-lib
 */

// Main component and module
export * from './lib/threejs-ui-component';
export * from './lib/threejs-ui-module';

// New modular components
export * from './lib/components/threejs-scene-pure.component';
export * from './lib/components/threejs-layout.component';
export * from './lib/components/threejs-controls.component';
export * from './lib/components/threejs-header.component';
export * from './lib/components/threejs-sidebar-left.component';
export * from './lib/components/threejs-sidebar-right.component';

// Services
export * from './lib/core/services/alephscript.service';
export * from './lib/shared/three/three-scene.service';
export * from './lib/shared/services/modal.service';

// Test Components
export * from './lib/components/alephscript-test/alephscript-test.component';

// Shared components
export * from './lib/shared/components/demo-controls.component';
export * from './lib/shared/components/visual-controls.component';
export * from './lib/shared/components/modal-manager.component';

// Feature components
export * from './lib/features/bot-management/bot-list.component';
export * from './lib/features/message-panel/message-panel.component';

// Types and interfaces
export * from './lib/shared/models/bot.model';

// Controllers and managers
export * from './lib/shared/three/animation-controller';
export * from './lib/shared/three/trajectory-manager';
export * from './lib/shared/simulation/demo-message-simulator';
