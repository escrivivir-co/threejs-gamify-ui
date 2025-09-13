import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessagePanelComponent } from '../features/message-panel/message-panel.component';

@Component({
  selector: 'tjs-threejs-sidebar-right',
  standalone: true,
  imports: [CommonModule, MessagePanelComponent],
  template: `
    <div class="sidebar-panel">
      <div class="sidebar-header">
        <button class="btn panel-toggle-btn" (click)="toggleMessagePanel.emit()">
          💬 Messages
        </button>
      </div>
      
      <div class="sidebar-content" *ngIf="showMessagePanel">
        <app-message-panel></app-message-panel>
      </div>
    </div>
  `,
  styleUrls: ['./threejs-sidebar-right.component.css']
})
export class ThreeJSSidebarRightComponent {
  @Output() toggleMessagePanel = new EventEmitter<void>();
  
  public showMessagePanel = false;
  
  onToggleMessagePanel() {
    this.showMessagePanel = !this.showMessagePanel;
    this.toggleMessagePanel.emit();
  }
}
