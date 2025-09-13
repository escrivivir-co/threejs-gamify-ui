import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ThreeJSHeaderState {
  gameTitle: string;
  connectionStatus: string;
}

@Component({
  selector: 'tjs-threejs-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="header-panel">
      <h1>{{ state.gameTitle }}</h1>
      <div class="connection-status">
        <span class="status-indicator" [class]="state.connectionStatus"></span>
        AlephScript: {{ state.connectionStatus.toUpperCase() }}
      </div>
    </div>
  `,
  styleUrls: ['./threejs-header.component.css']
})
export class ThreeJSHeaderComponent {
  @Input() state!: ThreeJSHeaderState;
}
