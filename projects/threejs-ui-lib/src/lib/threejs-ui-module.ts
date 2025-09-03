import { NgModule } from '@angular/core';
import { ThreeJSUIComponent } from './threejs-ui-component';
import { ThreeSceneService } from './shared/three/three-scene.service';
import { AlephScriptService } from './core/services/alephscript.service';
import { RxjsSocketBridge } from './core/bridge/rxjs-socket-bridge';

@NgModule({
  imports: [ThreeJSUIComponent],
  exports: [ThreeJSUIComponent],
  providers: [
    ThreeSceneService,
    AlephScriptService,
    RxjsSocketBridge
  ]
})
export class ThreeJSUIModule { }
