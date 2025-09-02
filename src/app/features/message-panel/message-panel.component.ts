import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil, scan } from 'rxjs/operators';

import { SocketService } from '../../core/services/socket.service';
import { Message } from '../../shared/models/message.model';
import { SocketMessage, ChannelType, MessageType } from '../../core/bridge/interfaces';

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
  
  // Filter state
  activeFilters = {
    sys: true,
    app: true,
    ui: true
  };
  
  maxMessages = 100; // Limit to prevent memory issues
  autoScroll = true;
  
  // Stats
  messageStats = {
    total: 0,
    sys: 0,
    app: 0,
    ui: 0
  };

  constructor(private socketService: SocketService) {}

  ngOnInit() {
    console.log('MessagePanelComponent initializing...');
    
    // Subscribe to all messages
    this.socketService.messages$
      .pipe(
        takeUntil(this.destroy$),
        scan((messages: Message[], socketMessage: SocketMessage) => {
          const message = this.convertSocketMessageToMessage(socketMessage);
          const updatedMessages = [...messages, message];
          
          // Keep only the last N messages
          if (updatedMessages.length > this.maxMessages) {
            updatedMessages.splice(0, updatedMessages.length - this.maxMessages);
          }
          
          return updatedMessages;
        }, [])
      )
      .subscribe(messages => {
        this.messages = messages;
        this.updateStats();
        this.applyFilters();
        this.scrollToBottomIfNeeded();
      });
  }

  ngAfterViewInit() {
    // Initial scroll to bottom
    setTimeout(() => this.scrollToBottom(), 100);
  }

  private convertSocketMessageToMessage(socketMessage: SocketMessage): Message {
    return {
      id: socketMessage.id,
      timestamp: new Date(socketMessage.timestamp),
      channel: socketMessage.channel,
      type: socketMessage.type,
      content: this.formatMessageContent(socketMessage),
      source: socketMessage.source,
      target: socketMessage.target,
      data: socketMessage
    };
  }

  private formatMessageContent(socketMessage: SocketMessage): string {
    switch (socketMessage.type) {
      case MessageType.BOT_STATUS:
        const botStatus = socketMessage as any;
        return `Bot ${botStatus.botId} is now ${botStatus.status}`;
        
      case MessageType.BOT_COMMAND:
        const botCommand = socketMessage as any;
        return `Command "${botCommand.command}" sent to bot ${botCommand.botId}`;
        
      case MessageType.HEALTH_CHECK:
        const health = socketMessage as any;
        return `System Health - CPU: ${health.systemHealth?.cpu}%, Memory: ${health.systemHealth?.memory}%, Connections: ${health.systemHealth?.connections}`;
        
      case MessageType.USER_ACTION:
        const userAction = socketMessage as any;
        return `User action: ${userAction.action}`;
        
      case MessageType.SYSTEM_EVENT:
        const systemEvent = socketMessage as any;
        return `${systemEvent.severity.toUpperCase()}: ${systemEvent.event}`;
        
      default:
        return `Unknown message type`;
    }
  }

  private updateStats(): void {
    this.messageStats = {
      total: this.messages.length,
      sys: this.messages.filter(m => m.channel === ChannelType.SYS).length,
      app: this.messages.filter(m => m.channel === ChannelType.APP).length,
      ui: this.messages.filter(m => m.channel === ChannelType.UI).length
    };
  }

  private applyFilters(): void {
    this.filteredMessages = this.messages.filter(message => {
      return this.activeFilters[message.channel as keyof typeof this.activeFilters];
    });
  }

  private scrollToBottomIfNeeded(): void {
    if (this.autoScroll && this.messageContainer) {
      setTimeout(() => this.scrollToBottom(), 0);
    }
  }

  private scrollToBottom(): void {
    if (this.messageContainer) {
      const container = this.messageContainer.nativeElement;
      container.scrollTop = container.scrollHeight;
    }
  }

  // Filter methods
  toggleFilter(channel: keyof typeof this.activeFilters): void {
    this.activeFilters[channel] = !this.activeFilters[channel];
    this.applyFilters();
    console.log('Filter toggled:', channel, this.activeFilters[channel]);
  }

  clearAllFilters(): void {
    this.activeFilters = { sys: false, app: false, ui: false };
    this.applyFilters();
  }

  showAllFilters(): void {
    this.activeFilters = { sys: true, app: true, ui: true };
    this.applyFilters();
  }

  // Message actions
  clearMessages(): void {
    this.messages = [];
    this.filteredMessages = [];
    this.updateStats();
    console.log('Messages cleared');
  }

  toggleAutoScroll(): void {
    this.autoScroll = !this.autoScroll;
    console.log('Auto-scroll:', this.autoScroll);
  }

  onMessageClick(message: Message): void {
    console.log('Message clicked:', message);
    
    // Send user action
    this.socketService.sendUserAction('message_clicked', {
      messageId: message.id,
      channel: message.channel,
      type: message.type
    });
  }

  // Utility methods
  getChannelClass(channel: ChannelType): string {
    return `message-${channel}`;
  }

  getTimeString(date: Date): string {
    return date.toLocaleTimeString();
  }

  trackMessage(index: number, message: Message): string {
    return message.id;
  }

  isFilterActive(channel: keyof typeof this.activeFilters): boolean {
    return this.activeFilters[channel];
  }

  getFilteredCount(): number {
    return this.filteredMessages.length;
  }

  ngOnDestroy() {
    console.log('MessagePanelComponent destroying...');
    this.destroy$.next();
    this.destroy$.complete();
  }
}
