import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DemoControlState {
  isRunning: boolean;
  phase: string;
  speed: string;
  channel: string;
  messagesCount: number;
}

@Component({
  selector: 'demo-controls',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="demo-controls">
      <div class="demo-status">
        <span class="status-indicator" [class]="'status-' + (state.isRunning ? 'running' : 'stopped')"></span>
        <span>Demo: {{ state.isRunning ? 'Running' : 'Stopped' }}</span>
        <span class="messages-count">({{ state.messagesCount }} msgs)</span>
      </div>

      <div class="control-group">
        <label>Phase:</label>
        <select [value]="state.phase" (change)="onPhaseChange($event)">
          <option value="idle">Idle</option>
          <option value="single">Single Messages</option>
          <option value="burst">Message Bursts</option>
          <option value="continuous">Continuous Flow</option>
        </select>
      </div>

      <div class="control-group">
        <label>Speed:</label>
        <select [value]="state.speed" (change)="onSpeedChange($event)">
          <option value="slow">Slow</option>
          <option value="normal">Normal</option>
          <option value="fast">Fast</option>
        </select>
      </div>

      <div class="control-group">
        <label>Channel:</label>
        <select [value]="state.channel" (change)="onChannelChange($event)">
          <option value="sys">System</option>
          <option value="app">Application</option>
          <option value="ui">Interface</option>
          <option value="agent">Agent</option>
          <option value="game">Game</option>
        </select>
      </div>

      <div class="button-group">
        <button (click)="onToggle()" [class]="state.isRunning ? 'stop' : 'start'">
          {{ state.isRunning ? '⏹️ Stop' : '▶️ Start' }}
        </button>
        <button (click)="onSingleMessage()" [disabled]="!state.isRunning">📤 Send One</button>
        <button (click)="onBurst()" [disabled]="!state.isRunning">💥 Burst</button>
        <button (click)="onReset()">🔄 Reset</button>
      </div>
    </div>
  `,
  styles: [`
    .demo-controls {
      padding: 16px;
      background: rgba(15, 23, 42, 0.9);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 10px;
      color: #e2e8f0;
      font-size: 13px;
      min-width: 220px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
    }

    .demo-status {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 14px;
      font-weight: 600;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.2);
    }

    .status-indicator {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: inline-block;
      box-shadow: 0 0 8px currentColor;
      transition: all 0.3s ease;
    }

    .status-running { 
      background: #10b981; 
      color: #10b981;
      animation: pulse-glow 2s infinite;
    }
    
    .status-stopped { 
      background: #ef4444; 
      color: #ef4444;
    }

    @keyframes pulse-glow {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(1.1); }
    }

    .messages-count {
      color: #60a5fa;
      font-size: 11px;
      background: rgba(96, 165, 250, 0.1);
      padding: 2px 6px;
      border-radius: 4px;
      margin-left: auto;
    }

    .control-group {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .control-group label {
      font-weight: 600;
      min-width: 60px;
      color: #cbd5e1;
    }

    .control-group select {
      background: rgba(30, 41, 59, 0.8);
      border: 1px solid rgba(148, 163, 184, 0.3);
      color: #e2e8f0;
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      flex: 1;
      margin-left: 12px;
    }

    .control-group select:hover {
      border-color: rgba(59, 130, 246, 0.5);
      background: rgba(30, 41, 59, 0.9);
    }

    .control-group select:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }

    .button-group {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1px solid rgba(148, 163, 184, 0.2);
    }

    .button-group button {
      padding: 8px 12px;
      border: none;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
      overflow: hidden;
    }

    .button-group button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none !important;
    }

    .start {
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
    }

    .start:hover:not(:disabled) {
      background: linear-gradient(135deg, #059669, #047857);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
    }

    .stop {
      background: linear-gradient(135deg, #ef4444, #dc2626);
      color: white;
      box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
    }

    .stop:hover:not(:disabled) {
      background: linear-gradient(135deg, #dc2626, #b91c1c);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
    }

    .button-group button:not(.start):not(.stop) {
      background: rgba(71, 85, 105, 0.8);
      color: #e2e8f0;
      border: 1px solid rgba(148, 163, 184, 0.3);
      backdrop-filter: blur(4px);
    }

    .button-group button:not(.start):not(.stop):hover:not(:disabled) {
      background: rgba(71, 85, 105, 0.9);
      border-color: rgba(148, 163, 184, 0.5);
      transform: translateY(-1px);
      box-shadow: 0 3px 10px rgba(71, 85, 105, 0.4);
    }
  `]
})
export class DemoControlsComponent {
  @Input() state!: DemoControlState;
  @Output() toggle = new EventEmitter<void>();
  @Output() phaseChange = new EventEmitter<string>();
  @Output() speedChange = new EventEmitter<string>();
  @Output() channelChange = new EventEmitter<string>();
  @Output() singleMessage = new EventEmitter<void>();
  @Output() burst = new EventEmitter<void>();
  @Output() reset = new EventEmitter<void>();

  onToggle() { this.toggle.emit(); }
  onPhaseChange(event: any) { this.phaseChange.emit(event.target.value); }
  onSpeedChange(event: any) { this.speedChange.emit(event.target.value); }
  onChannelChange(event: any) { this.channelChange.emit(event.target.value); }
  onSingleMessage() { this.singleMessage.emit(); }
  onBurst() { this.burst.emit(); }
  onReset() { this.reset.emit(); }
}
