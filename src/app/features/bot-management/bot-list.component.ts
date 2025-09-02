import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';

import { SocketService } from '../../core/services/socket.service';
import { Bot } from '../../shared/models/bot.model';
import { SocketMessage, MessageType, BotStatusMessage, ChannelType } from '../../core/bridge/interfaces';

@Component({
  selector: 'app-bot-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bot-list.component.html',
  styleUrls: ['./bot-list.component.css']
})
export class BotListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  bots: Bot[] = [];
  selectedBotIds = new Set<string>();

  constructor(private socketService: SocketService) {}

  ngOnInit() {
    console.log('BotListComponent initializing...');
    
    // Initialize default bots (8 positions on cardinal spirals)
    this.initializeBots();
    
    // Subscribe to bot status messages
    this.socketService.sysMessages$
      .pipe(
        takeUntil(this.destroy$),
        filter(msg => msg.type === MessageType.BOT_STATUS)
      )
      .subscribe((msg: BotStatusMessage) => {
        this.updateBotStatus(msg);
      });

    // Subscribe to app messages for bot responses
    this.socketService.appMessages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(msg => {
        console.log('Bot app message:', msg);
      });
  }

  private initializeBots(): void {
    // Create 8 bots positioned on cardinal spirals (N, S, E, W - 2 each)
    const cardinals = [
      { name: 'North', angle: 0, positions: 2 },
      { name: 'East', angle: Math.PI / 2, positions: 2 },
      { name: 'South', angle: Math.PI, positions: 2 },
      { name: 'West', angle: 3 * Math.PI / 2, positions: 2 }
    ];

    this.bots = [];
    
    cardinals.forEach((cardinal, cardinalIndex) => {
      for (let i = 0; i < cardinal.positions; i++) {
        const botId = `bot_${cardinal.name.toLowerCase()}_${i + 1}`;
        
        // Calculate spiral position
        const radius = 5 + (i * 2); // Spiral outward
        const angle = cardinal.angle + (i * 0.3); // Slight angle offset for spiral
        
        const bot: Bot = {
          id: botId,
          name: `${cardinal.name} Bot ${i + 1}`,
          status: 'offline',
          position: {
            x: Math.cos(angle) * radius,
            y: 0,
            z: Math.sin(angle) * radius
          },
          lastActive: null,
          messageCount: 0
        };
        
        this.bots.push(bot);
      }
    });

    console.log('Initialized bots:', this.bots);
  }

  private updateBotStatus(message: BotStatusMessage): void {
    const bot = this.bots.find(b => b.id === message.botId);
    if (bot) {
      bot.status = message.status;
      bot.lastActive = new Date();
      
      if (message.position) {
        bot.position = message.position;
      }
      
      console.log('Updated bot status:', bot);
    }
  }

  onBotClick(bot: Bot): void {
    if (this.selectedBotIds.has(bot.id)) {
      this.selectedBotIds.delete(bot.id);
    } else {
      this.selectedBotIds.add(bot.id);
    }
    
    // Send user action to Socket.io
    this.socketService.sendUserAction('bot_selected', {
      botId: bot.id,
      selected: this.selectedBotIds.has(bot.id)
    });
    
    console.log('Bot clicked:', bot.id, 'Selected:', this.selectedBotIds.has(bot.id));
  }

  startBot(bot: Bot, event: Event): void {
    event.stopPropagation();
    
    console.log('Starting bot:', bot.id);
    this.socketService.sendBotCommand(bot.id, 'start');
  }

  stopBot(bot: Bot, event: Event): void {
    event.stopPropagation();
    
    console.log('Stopping bot:', bot.id);
    this.socketService.sendBotCommand(bot.id, 'stop');
  }

  resetBot(bot: Bot, event: Event): void {
    event.stopPropagation();
    
    console.log('Resetting bot:', bot.id);
    this.socketService.sendBotCommand(bot.id, 'reset');
  }

  startAllSelected(): void {
    this.selectedBotIds.forEach(botId => {
      this.socketService.sendBotCommand(botId, 'start');
    });
    console.log('Started all selected bots');
  }

  stopAllSelected(): void {
    this.selectedBotIds.forEach(botId => {
      this.socketService.sendBotCommand(botId, 'stop');
    });
    console.log('Stopped all selected bots');
  }

  selectAll(): void {
    this.selectedBotIds.clear();
    this.bots.forEach(bot => this.selectedBotIds.add(bot.id));
  }

  deselectAll(): void {
    this.selectedBotIds.clear();
  }

  isSelected(bot: Bot): boolean {
    return this.selectedBotIds.has(bot.id);
  }

  getSelectedCount(): number {
    return this.selectedBotIds.size;
  }

  ngOnDestroy() {
    console.log('BotListComponent destroying...');
    this.destroy$.next();
    this.destroy$.complete();
  }
}
