import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AlephScriptService } from '../../core/services/alephscript.service';
import { Bot } from '../../shared/models/bot.model';

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

  constructor(private alephScriptService: AlephScriptService) {}

  ngOnInit() {
    console.log('BotListComponent initializing...');
    
    // Initialize default bots (8 positions on cardinal spirals)
    this.initializeBots();
    
    // Subscribe to AlephScript events if needed
    // this.alephScriptService.onMessage((data) => {
    //   console.log('AlephScript message:', data);
    // });
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

  onBotClick(bot: Bot): void {
    if (this.selectedBotIds.has(bot.id)) {
      this.selectedBotIds.delete(bot.id);
    } else {
      this.selectedBotIds.add(bot.id);
    }
    
    console.log('Bot clicked:', bot.id, 'Selected:', this.selectedBotIds.has(bot.id));
  }

  startBot(bot: Bot, event: Event): void {
    event.stopPropagation();
    console.log('Starting bot:', bot.id);
    // TODO: Implement AlephScript bot start command
  }

  stopBot(bot: Bot, event: Event): void {
    event.stopPropagation();
    console.log('Stopping bot:', bot.id);
    // TODO: Implement AlephScript bot stop command
  }

  resetBot(bot: Bot, event: Event): void {
    event.stopPropagation();
    console.log('Resetting bot:', bot.id);
    // TODO: Implement AlephScript bot reset command
  }

  startAllSelected(): void {
    this.selectedBotIds.forEach(botId => {
      console.log('Starting bot:', botId);
      // TODO: Implement AlephScript bot start command
    });
    console.log('Started all selected bots');
  }

  stopAllSelected(): void {
    this.selectedBotIds.forEach(botId => {
      console.log('Stopping bot:', botId);
      // TODO: Implement AlephScript bot stop command
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

  trackBot(index: number, bot: Bot): string {
    return bot.id;
  }

  ngOnDestroy() {
    console.log('BotListComponent destroying...');
    this.destroy$.next();
    this.destroy$.complete();
  }
}
