import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface VisualControlState {
  isWireframeMode: boolean;
  currentFPS: number;
  particleCount: number;
  animationCount: number;
}

@Component({
  selector: 'visual-controls',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="visual-controls">
      <div class="control-section">
        <h4>🎨 Visual Settings</h4>
        <div class="button-grid">
          <button 
            (click)="onToggleWireframe()" 
            [class.active]="state.isWireframeMode"
            class="btn-toggle">
            🔲 Wireframe
          </button>
          <button (click)="onResetCamera()" class="btn-action">
            📷 Reset Camera
          </button>
          <button (click)="onTakeScreenshot()" class="btn-action">
            📸 Screenshot
          </button>
          <button (click)="onResetScene()" class="btn-danger">
            🔄 Reset Scene
          </button>
        </div>
      </div>

      <div class="performance-section">
        <h4>📊 Performance</h4>
        <div class="performance-grid">
          <div class="perf-item">
            <span class="label">FPS:</span>
            <span class="value" [class]="getFPSClass(state.currentFPS)">{{ state.currentFPS }}</span>
          </div>
          <div class="perf-item">
            <span class="label">Particles:</span>
            <span class="value particles">{{ state.particleCount }}</span>
          </div>
          <div class="perf-item">
            <span class="label">Animations:</span>
            <span class="value animations">{{ state.animationCount }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .visual-controls {
      padding: 16px;
      background: rgba(15, 23, 42, 0.9);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 10px;
      color: #e2e8f0;
      font-size: 13px;
      min-width: 240px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
    }

    .control-section, .performance-section {
      margin-bottom: 16px;
    }

    .control-section:last-child, .performance-section:last-child {
      margin-bottom: 0;
    }

    h4 {
      margin: 0 0 12px 0;
      font-size: 14px;
      font-weight: 700;
      color: #f1f5f9;
      border-bottom: 1px solid rgba(148, 163, 184, 0.2);
      padding-bottom: 8px;
    }

    .button-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .button-grid button {
      padding: 8px 12px;
      border: none;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }

    .btn-toggle {
      background: rgba(71, 85, 105, 0.8);
      color: #e2e8f0;
      border: 1px solid rgba(148, 163, 184, 0.3);
    }

    .btn-toggle.active {
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      color: white;
      border-color: #3b82f6;
      box-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
    }

    .btn-action {
      background: rgba(59, 130, 246, 0.8);
      color: white;
      border: 1px solid rgba(59, 130, 246, 0.5);
    }

    .btn-action:hover {
      background: rgba(59, 130, 246, 0.9);
      transform: translateY(-1px);
      box-shadow: 0 3px 10px rgba(59, 130, 246, 0.4);
    }

    .btn-danger {
      background: rgba(239, 68, 68, 0.8);
      color: white;
      border: 1px solid rgba(239, 68, 68, 0.5);
    }

    .btn-danger:hover {
      background: rgba(239, 68, 68, 0.9);
      transform: translateY(-1px);
      box-shadow: 0 3px 10px rgba(239, 68, 68, 0.4);
    }

    .btn-toggle:hover {
      background: rgba(71, 85, 105, 0.9);
      border-color: rgba(148, 163, 184, 0.5);
      transform: translateY(-1px);
    }

    .btn-toggle.active:hover {
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      transform: translateY(-1px);
      box-shadow: 0 0 15px rgba(59, 130, 246, 0.4);
    }

    .performance-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 8px;
    }

    .perf-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 10px;
      background: rgba(30, 41, 59, 0.6);
      border-radius: 6px;
      border: 1px solid rgba(148, 163, 184, 0.1);
    }

    .perf-item .label {
      font-weight: 600;
      color: #cbd5e1;
      font-size: 11px;
    }

    .perf-item .value {
      font-weight: 700;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 12px;
      padding: 2px 6px;
      border-radius: 4px;
      min-width: 30px;
      text-align: center;
    }

    /* FPS Color coding */
    .fps-excellent { 
      background: rgba(16, 185, 129, 0.2); 
      color: #10b981; 
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    
    .fps-good { 
      background: rgba(245, 158, 11, 0.2); 
      color: #f59e0b; 
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    
    .fps-poor { 
      background: rgba(239, 68, 68, 0.2); 
      color: #ef4444; 
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .particles {
      background: rgba(139, 92, 246, 0.2);
      color: #8b5cf6;
      border: 1px solid rgba(139, 92, 246, 0.3);
    }

    .animations {
      background: rgba(236, 72, 153, 0.2);
      color: #ec4899;
      border: 1px solid rgba(236, 72, 153, 0.3);
    }
  `]
})
export class VisualControlsComponent {
  @Input() state!: VisualControlState;
  @Output() toggleWireframe = new EventEmitter<void>();
  @Output() resetCamera = new EventEmitter<void>();
  @Output() takeScreenshot = new EventEmitter<void>();
  @Output() resetScene = new EventEmitter<void>();

  onToggleWireframe() { this.toggleWireframe.emit(); }
  onResetCamera() { this.resetCamera.emit(); }
  onTakeScreenshot() { this.takeScreenshot.emit(); }
  onResetScene() { this.resetScene.emit(); }

  getFPSClass(fps: number): string {
    if (fps >= 50) return 'fps-excellent';
    if (fps >= 30) return 'fps-good';
    return 'fps-poor';
  }
}
