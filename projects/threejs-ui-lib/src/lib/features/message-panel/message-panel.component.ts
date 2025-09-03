import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';

import { AlephScriptService } from '../../core/services/alephscript.service';
import { Message } from '../../shared/models/message.model';

@Component({
  selector: 'app-message-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './message-panel.component.html',
  styleUrls: ['./message-panel.component.css']
})
export class MessagePanelComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('messageContainer', { static: false }) messageContainer!: ElementRef;
  
  private destroy$ = new Subject<void>();
  
  messages: Message[] = [];
  filteredMessages: Message[] = [];
  
  filters = {
    sys: true,
    app: true,
    ui: true
  };

  maxMessages = 500;
  autoScroll = true;
  
  messageStats = {
    total: 0,
    sys: 0,
    app: 0,
    ui: 0
  };

  constructor(private alephScriptService: AlephScriptService) {}

  ngOnInit() {
    console.log('MessagePanelComponent initializing...');
    this.initializeSampleMessages();
  }

  ngAfterViewInit() {
    setTimeout(() => this.scrollToBottom(), 100);
  }

  private initializeSampleMessages(): void {
    const sampleMessages: Message[] = [
      {
        id: '1',
        timestamp: new Date(),
        channel: 'sys',
        content: 'AlephScript client initialized',
        type: 'system'
      },
      {
        id: '2',
        timestamp: new Date(),
        channel: 'app',
        content: 'ThreeJS scene ready',
        type: 'app'
      }
    ];
    
    this.messages = sampleMessages;
    this.updateStats();
    this.applyFilters();
  }

  private updateStats(): void {
    this.messageStats = {
      total: this.messages.length,
      sys: this.messages.filter(m => m.channel === 'sys').length,
      app: this.messages.filter(m => m.channel === 'app').length,
      ui: this.messages.filter(m => m.channel === 'ui').length
    };
  }

  private applyFilters(): void {
    this.filteredMessages = this.messages.filter(message => {
      return this.filters[message.channel as keyof typeof this.filters];
    });
  }

  toggleFilter(channel: string): void {
    this.filters[channel as keyof typeof this.filters] = !this.filters[channel as keyof typeof this.filters];
    this.applyFilters();
  }

  clearMessages(): void {
    this.messages = [];
    this.filteredMessages = [];
    this.updateStats();
  }

  private scrollToBottom(): void {
    if (this.messageContainer && this.autoScroll) {
      try {
        this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight;
      } catch (err) {
        console.error('Error scrolling to bottom:', err);
      }
    }
  }

  toggleAutoScroll(): void {
    this.autoScroll = !this.autoScroll;
  }

  getChannelClass(channel: string): string {
    const channelClasses: { [key: string]: string } = {
      'sys': 'channel-sys',
      'app': 'channel-app',
      'ui': 'channel-ui'
    };
    return channelClasses[channel] || 'channel-default';
  }

  getFilteredCount(): number {
    return this.filteredMessages.length;
  }

  isFilterActive(channel: string): boolean {
    return this.filters[channel as keyof typeof this.filters];
  }

  showAllFilters(): void {
    this.filters.sys = true;
    this.filters.app = true;
    this.filters.ui = true;
    this.applyFilters();
  }

  clearAllFilters(): void {
    this.filters.sys = false;
    this.filters.app = false;
    this.filters.ui = false;
    this.applyFilters();
  }

  trackMessage(index: number, message: Message): string {
    return message.id;
  }

  onMessageClick(message: Message): void {
    console.log('Message clicked:', message);
  }

  getTimeString(timestamp: Date): string {
    return timestamp.toLocaleTimeString();
  }

  ngOnDestroy() {
    console.log('MessagePanelComponent destroying...');
    this.destroy$.next();
    this.destroy$.complete();
  }
}
