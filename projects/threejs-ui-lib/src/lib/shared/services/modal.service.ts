import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

export interface ModalConfig {
  id: string;
  title: string;
  component?: any;
  data?: any;
  draggable?: boolean;
  resizable?: boolean;
  closable?: boolean;
  minimizable?: boolean;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  zIndex?: number;
}

export interface ModalState {
  id: string;
  config: ModalConfig;
  isOpen: boolean;
  isMinimized: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
}

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private modals = new Map<string, ModalState>();
  private modalSubject = new BehaviorSubject<ModalState[]>([]);
  private highestZIndex = 1000;

  public modals$ = this.modalSubject.asObservable();

  constructor() {
    console.log('🪟 ModalService initialized');
  }

  /**
   * Open a new modal
   */
  open(config: ModalConfig): string {
    const modalState: ModalState = {
      id: config.id,
      config: {
        draggable: true,
        resizable: true,
        closable: true,
        minimizable: true,
        position: { x: 100, y: 100 },
        size: { width: 400, height: 300 },
        ...config
      },
      isOpen: true,
      isMinimized: false,
      position: config.position || { x: 100 + (this.modals.size * 30), y: 100 + (this.modals.size * 30) },
      size: config.size || { width: 400, height: 300 },
      zIndex: ++this.highestZIndex
    };

    this.modals.set(config.id, modalState);
    this.updateModals();
    
    console.log(`🪟 Modal opened: ${config.id}`);
    return config.id;
  }

  /**
   * Close a modal
   */
  close(modalId: string): void {
    const modal = this.modals.get(modalId);
    if (modal) {
      modal.isOpen = false;
      this.modals.delete(modalId);
      this.updateModals();
      console.log(`🪟 Modal closed: ${modalId}`);
    }
  }

  /**
   * Minimize/restore a modal
   */
  toggle(modalId: string): void {
    const modal = this.modals.get(modalId);
    if (modal) {
      modal.isMinimized = !modal.isMinimized;
      this.updateModals();
      console.log(`🪟 Modal ${modal.isMinimized ? 'minimized' : 'restored'}: ${modalId}`);
    }
  }

  /**
   * Bring modal to front
   */
  bringToFront(modalId: string): void {
    const modal = this.modals.get(modalId);
    if (modal) {
      modal.zIndex = ++this.highestZIndex;
      this.updateModals();
    }
  }

  /**
   * Update modal position
   */
  updatePosition(modalId: string, position: { x: number; y: number }): void {
    const modal = this.modals.get(modalId);
    if (modal) {
      modal.position = { ...position };
      this.updateModals();
    }
  }

  /**
   * Update modal size
   */
  updateSize(modalId: string, size: { width: number; height: number }): void {
    const modal = this.modals.get(modalId);
    if (modal) {
      modal.size = { ...size };
      this.updateModals();
    }
  }

  /**
   * Get modal state
   */
  getModal(modalId: string): ModalState | undefined {
    return this.modals.get(modalId);
  }

  /**
   * Get all open modals
   */
  getOpenModals(): ModalState[] {
    return Array.from(this.modals.values()).filter(modal => modal.isOpen);
  }

  /**
   * Close all modals
   */
  closeAll(): void {
    this.modals.clear();
    this.updateModals();
    console.log('🪟 All modals closed');
  }

  private updateModals(): void {
    const modalArray = Array.from(this.modals.values()).filter(modal => modal.isOpen);
    this.modalSubject.next(modalArray);
  }
}
