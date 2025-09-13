import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BotListComponent } from '../features/bot-management/bot-list.component';

@Component({
  selector: 'tjs-threejs-sidebar-left',
  standalone: true,
  imports: [CommonModule, BotListComponent],
  template: `
    <div class="sidebar-panel">
      <div class="sidebar-header">
        <button class="btn panel-toggle-btn" (click)="toggleBotManagement.emit()">
          🤖 Bot Management
        </button>
      </div>
      
      <div class="sidebar-content" *ngIf="showBotManagement">
        <app-bot-list></app-bot-list>
      </div>
    </div>
  `,
  styleUrls: ['./threejs-sidebar-left.component.css']
})
export class ThreeJSSidebarLeftComponent {
  @Output() toggleBotManagement = new EventEmitter<void>();
  
  public showBotManagement = false;
  
  onToggleBotManagement() {
    this.showBotManagement = !this.showBotManagement;
    this.toggleBotManagement.emit();
  }
}
