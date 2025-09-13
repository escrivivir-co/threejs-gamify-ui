import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalState, ModalService } from '../../shared/services/modal.service';

@Component({
  selector: 'app-draggable-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="modal-overlay"
      [class.minimized]="modalState.isMinimized"
      [style.z-index]="modalState.zIndex"
      (mousedown)="onBackgroundClick($event)"
    >
      <div 
        #modalWindow
        class="modal-window"
        [class.minimized]="modalState.isMinimized"
        [style.left.px]="modalState.position.x"
        [style.top.px]="modalState.position.y"
        [style.width.px]="modalState.size.width"
        [style.height.px]="modalState.isMinimized ? 'auto' : modalState.size.height"
        [style.z-index]="modalState.zIndex"
        (mousedown)="bringToFront()"
      >
        <!-- Modal Header -->
        <div 
          class="modal-header"
          #modalHeader
          (mousedown)="startDrag($event)"
        >
          <div class="modal-title">
            <span class="modal-icon">🪟</span>
            {{ modalState.config.title }}
          </div>
          
          <div class="modal-controls">
            <button 
              *ngIf="modalState.config.minimizable"
              class="modal-btn minimize-btn"
              (click)="toggleMinimize()"
              title="Minimize"
            >
              <span *ngIf="!modalState.isMinimized">−</span>
              <span *ngIf="modalState.isMinimized">□</span>
            </button>
            
            <button 
              *ngIf="modalState.config.closable"
              class="modal-btn close-btn"
              (click)="closeModal()"
              title="Close"
            >
              ×
            </button>
          </div>
        </div>
        
        <!-- Modal Content -->
        <div 
          class="modal-content"
          [class.hidden]="modalState.isMinimized"
        >
          <ng-content></ng-content>
        </div>
        
        <!-- Resize Handle -->
        <div 
          *ngIf="modalState.config.resizable && !modalState.isMinimized"
          class="resize-handle"
          (mousedown)="startResize($event)"
        ></div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      transition: opacity 0.2s ease;
    }

    .modal-overlay.minimized {
      pointer-events: none;
    }

    .modal-window {
      position: absolute;
      background: rgba(20, 25, 35, 0.95);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      pointer-events: auto;
      min-width: 250px;
      min-height: 100px;
      overflow: hidden;
      transition: all 0.2s ease;
    }

    .modal-window:hover {
      box-shadow: 0 15px 40px rgba(0, 0, 0, 0.6);
    }

    .modal-window.minimized {
      height: auto !important;
      min-height: auto;
    }

    .modal-header {
      background: rgba(30, 35, 45, 0.9);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: move;
      user-select: none;
    }

    .modal-header:hover {
      background: rgba(35, 40, 50, 0.9);
    }

    .modal-title {
      color: #fff;
      font-weight: 600;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .modal-icon {
      font-size: 16px;
    }

    .modal-controls {
      display: flex;
      gap: 4px;
    }

    .modal-btn {
      width: 24px;
      height: 24px;
      border: none;
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      line-height: 1;
      transition: all 0.2s ease;
    }

    .modal-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .close-btn:hover {
      background: rgba(220, 53, 69, 0.8);
    }

    .minimize-btn:hover {
      background: rgba(255, 193, 7, 0.8);
    }

    .modal-content {
      padding: 16px;
      color: #fff;
      overflow-y: auto;
      max-height: calc(100% - 50px);
    }

    .modal-content.hidden {
      display: none;
    }

    .resize-handle {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 16px;
      height: 16px;
      cursor: se-resize;
      background: linear-gradient(
        -45deg,
        transparent 0%,
        transparent 40%,
        rgba(255, 255, 255, 0.2) 40%,
        rgba(255, 255, 255, 0.2) 60%,
        transparent 60%
      );
    }

    .resize-handle:hover {
      background: linear-gradient(
        -45deg,
        transparent 0%,
        transparent 35%,
        rgba(255, 255, 255, 0.4) 35%,
        rgba(255, 255, 255, 0.4) 65%,
        transparent 65%
      );
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .modal-window {
        max-width: calc(100vw - 20px);
        max-height: calc(100vh - 20px);
      }
    }
  `]
})
export class DraggableModalComponent implements OnInit, OnDestroy {
  @Input() modalState!: ModalState;
  @Output() closed = new EventEmitter<string>();

  @ViewChild('modalWindow') modalWindow!: ElementRef;
  @ViewChild('modalHeader') modalHeader!: ElementRef;

  private isDragging = false;
  private isResizing = false;
  private dragStart = { x: 0, y: 0 };
  private resizeStart = { x: 0, y: 0, width: 0, height: 0 };

  constructor(private modalService: ModalService) {}

  ngOnInit() {
    console.log(`🪟 Modal component initialized: ${this.modalState.id}`);
  }

  ngOnDestroy() {
    console.log(`🪟 Modal component destroyed: ${this.modalState.id}`);
  }

  bringToFront(): void {
    this.modalService.bringToFront(this.modalState.id);
  }

  closeModal(): void {
    this.modalService.close(this.modalState.id);
    this.closed.emit(this.modalState.id);
  }

  toggleMinimize(): void {
    this.modalService.toggle(this.modalState.id);
  }

  startDrag(event: MouseEvent): void {
    if (!this.modalState.config.draggable) return;
    
    event.preventDefault();
    this.isDragging = true;
    this.dragStart = {
      x: event.clientX - this.modalState.position.x,
      y: event.clientY - this.modalState.position.y
    };
    
    this.bringToFront();
  }

  startResize(event: MouseEvent): void {
    if (!this.modalState.config.resizable) return;
    
    event.preventDefault();
    event.stopPropagation();
    this.isResizing = true;
    this.resizeStart = {
      x: event.clientX,
      y: event.clientY,
      width: this.modalState.size.width,
      height: this.modalState.size.height
    };
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (this.isDragging) {
      const newPosition = {
        x: Math.max(0, Math.min(window.innerWidth - 250, event.clientX - this.dragStart.x)),
        y: Math.max(0, Math.min(window.innerHeight - 100, event.clientY - this.dragStart.y))
      };
      this.modalService.updatePosition(this.modalState.id, newPosition);
    }
    
    if (this.isResizing) {
      const deltaX = event.clientX - this.resizeStart.x;
      const deltaY = event.clientY - this.resizeStart.y;
      
      const newSize = {
        width: Math.max(250, this.resizeStart.width + deltaX),
        height: Math.max(150, this.resizeStart.height + deltaY)
      };
      
      this.modalService.updateSize(this.modalState.id, newSize);
    }
  }

  @HostListener('document:mouseup', ['$event'])
  onMouseUp(event: MouseEvent): void {
    this.isDragging = false;
    this.isResizing = false;
  }

  onBackgroundClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      // Clicked on overlay background - bring to front but don't close
      this.bringToFront();
    }
  }
}
