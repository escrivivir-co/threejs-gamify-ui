import { Component, signal } from '@angular/core';
import { ThreeJSUIComponent, ThreeJSUIConfig } from '@escrivivir/threejs-ui-lib';

@Component({
  selector: 'app-root',
  imports: [ThreeJSUIComponent],
  template: `
    <div class="app-container">
      <h1>🎮 ThreeJS UI Library Demo - {{ title() }}</h1>
      <p>Testing the threejs-ui-lib library in a zoneless Angular application</p>
      <tjs-threejs-ui [config]="uiConfig"></tjs-threejs-ui>
    </div>
  `,
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('dev-app');
  
  uiConfig: ThreeJSUIConfig = {
    gameTitle: 'ThreeJS Demo',
    serverUrl: 'http://localhost:3000',
    alephScriptUrl: 'http://localhost:8080',
    debugMode: true
  };
}
