import { NgModule } from '@angular/core';
import { ThreeJSUIComponent } from './threejs-ui-component';
import { ThreeJSScenePureComponent } from './components/threejs-scene-pure.component';
import { ThreeJSLayoutComponent } from './components/threejs-layout.component';
import { ThreeJSControlsComponent } from './components/threejs-controls.component';
import { ThreeJSHeaderComponent } from './components/threejs-header.component';
import { ThreeJSSidebarLeftComponent } from './components/threejs-sidebar-left.component';
import { ThreeJSSidebarRightComponent } from './components/threejs-sidebar-right.component';
import { ThreeSceneService } from './shared/three/three-scene.service';
import { AlephScriptService } from './core/services/alephscript.service';
import { AlephScriptModule } from '@alephscript/angular';

@NgModule({
  imports: [
    // Original component (for backward compatibility)
    ThreeJSUIComponent,
    
    // New modular components
    ThreeJSScenePureComponent,
    ThreeJSLayoutComponent,
    ThreeJSControlsComponent,
    ThreeJSHeaderComponent,
    ThreeJSSidebarLeftComponent,
    ThreeJSSidebarRightComponent,
    
    // AlephScript integration
    AlephScriptModule
  ],
  exports: [
    // Original component (for backward compatibility)
    ThreeJSUIComponent,
    
    // New modular components
    ThreeJSScenePureComponent,
    ThreeJSLayoutComponent,
    ThreeJSControlsComponent,
    ThreeJSHeaderComponent,
    ThreeJSSidebarLeftComponent,
    ThreeJSSidebarRightComponent
  ],
  providers: [
    // ThreeSceneService and AlephScriptService are providedIn: 'root' and should not be re-provided here
    // RxjsSocketBridge is provided via providedIn: 'root' - no need to register here
  ]
})
export class ThreeJSUIModule { }
