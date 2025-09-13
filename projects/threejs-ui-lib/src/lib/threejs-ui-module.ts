import { NgModule } from '@angular/core';
import { ThreeJSUIComponent } from './threejs-ui-component';
import { ThreeSceneService } from './shared/three/three-scene.service';
import { AlephScriptService } from './core/services/alephscript.service';
import { AlephScriptModule } from '@alephscript/angular';

@NgModule({
  imports: [
    ThreeJSUIComponent,
    AlephScriptModule
  ],
  exports: [ThreeJSUIComponent],
  providers: [
    // ThreeSceneService and AlephScriptService are providedIn: 'root' and should not be re-provided here
    // RxjsSocketBridge is provided via providedIn: 'root' - no need to register here
  ]
})
export class ThreeJSUIModule { }
