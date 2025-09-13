import { Injectable } from '@angular/core';
import { Subject, interval, timer, BehaviorSubject } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';
import * as THREE from 'three';

export interface DemoMessage {
  id: string;
  fromBot: string;
  toBot: string;
  channel: 'sys' | 'app' | 'ui' | 'agent' | 'game';
  content: string;
  timestamp: number;
  type: 'bot-to-center' | 'center-to-bot' | 'bot-to-bot';
}

@Injectable({
  providedIn: 'root'
})
export class DemoMessageSimulator {
  private destroy$ = new Subject<void>();
  private isRunning = false;
  private messageCounter = 0;
  
  // Demo configuration
  private messageInterval = 2000; // 2 seconds between messages
  private burstInterval = 10000; // 10 seconds between bursts
  private burstSize = 5; // Number of messages in a burst
  
  // Observables
  private messageEmitter$ = new Subject<DemoMessage>();
  private simulationStatus$ = new BehaviorSubject<{
    isRunning: boolean;
    messagesSent: number;
    currentPhase: 'idle' | 'single' | 'burst' | 'chaos'
  }>({
    isRunning: false,
    messagesSent: 0,
    currentPhase: 'idle'
  });

  // Demo data
  private botNames = [
    'KickBot-Alpha', 'KickBot-Beta', 'KickBot-Gamma', 
    'KickBot-Delta', 'KickBot-Epsilon', 'CentralHub'
  ];
  
  private channels: Array<'sys' | 'app' | 'ui' | 'agent' | 'game'> = 
    ['sys', 'app', 'ui', 'agent', 'game'];
  
  private demoMessages = [
    'System initialization complete ✅',
    'Bot connection established 🔗',
    'Processing user command... ⚙️',
    'Data synchronization in progress 🔄',
    'Performance metrics updated 📊',
    'Health check passed ✅',
    'Message queue processing 📬',
    'Agent response generated 🤖',
    'UI component updated 🎨',
    'Game state synchronized 🎮',
    'Error handling activated ⚠️',
    'Recovery protocol initiated 🔧',
    'Optimization routine running 🚀',
    'Cache refreshed successfully 💾',
    'Security scan completed 🔒'
  ];

  constructor() {
    console.log('🎭 DemoMessageSimulator initialized');
  }

  /**
   * Get message stream observable
   */
  get messages$() {
    return this.messageEmitter$.asObservable();
  }

  /**
   * Get simulation status observable
   */
  get status$() {
    return this.simulationStatus$.asObservable();
  }

  /**
   * Start the demo simulation
   */
  start(): void {
    if (this.isRunning) {
      console.log('🎭 Demo simulation already running');
      return;
    }

    console.log('🎭 Starting demo message simulation...');
    this.isRunning = true;
    this.updateStatus('single', 0);

    // Start with single messages
    this.startSingleMessagePhase();

    // Schedule burst phase
    timer(15000).pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.startBurstPhase();
    });

    // Schedule chaos phase
    timer(30000).pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.startChaosPhase();
    });

    // Schedule return to normal
    timer(45000).pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.startSingleMessagePhase();
    });
  }

  /**
   * Stop the simulation
   */
  stop(): void {
    if (!this.isRunning) return;

    console.log('🎭 Stopping demo simulation...');
    this.isRunning = false;
    this.destroy$.next();
    this.updateStatus('idle', this.messageCounter);
  }

  /**
   * Single message phase - steady stream
   */
  private startSingleMessagePhase(): void {
    if (!this.isRunning) return;

    console.log('🎭 Phase: Single Messages');
    this.updateStatus('single', this.messageCounter);

    interval(this.messageInterval)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.isRunning) {
          this.sendRandomMessage();
        }
      });
  }

  /**
   * Burst phase - rapid fire messages
   */
  private startBurstPhase(): void {
    if (!this.isRunning) return;

    console.log('🎭 Phase: Message Bursts');
    this.updateStatus('burst', this.messageCounter);

    interval(this.burstInterval)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.isRunning) {
          this.sendMessageBurst();
        }
      });
  }

  /**
   * Chaos phase - random intensive messaging
   */
  private startChaosPhase(): void {
    if (!this.isRunning) return;

    console.log('🎭 Phase: Message Chaos');
    this.updateStatus('chaos', this.messageCounter);

    // Multiple rapid intervals
    interval(500).pipe(takeUntil(this.destroy$)).subscribe(() => {
      if (this.isRunning && Math.random() > 0.3) {
        this.sendRandomMessage();
      }
    });

    interval(800).pipe(takeUntil(this.destroy$)).subscribe(() => {
      if (this.isRunning && Math.random() > 0.5) {
        this.sendRandomMessage();
      }
    });
  }

  /**
   * Send a random message
   */
  private sendRandomMessage(): void {
    const message = this.generateRandomMessage();
    this.messageEmitter$.next(message);
    this.messageCounter++;
    
    console.log(`🎭 Demo message sent: ${message.id} (${message.channel})`);
  }

  /**
   * Send a burst of messages
   */
  private sendMessageBurst(): void {
    console.log('🎭 Sending message burst...');
    
    for (let i = 0; i < this.burstSize; i++) {
      timer(i * 200).subscribe(() => {
        if (this.isRunning) {
          this.sendRandomMessage();
        }
      });
    }
  }

  /**
   * Generate a random demo message
   */
  private generateRandomMessage(): DemoMessage {
    const id = `demo-msg-${this.messageCounter}`;
    const channel = this.getRandomChannel();
    const content = this.getRandomContent();
    const type = this.getRandomMessageType();
    
    let fromBot: string;
    let toBot: string;

    switch (type) {
      case 'bot-to-center':
        fromBot = this.getRandomBot();
        toBot = 'CentralHub';
        break;
      case 'center-to-bot':
        fromBot = 'CentralHub';
        toBot = this.getRandomBot();
        break;
      case 'bot-to-bot':
        fromBot = this.getRandomBot();
        toBot = this.getRandomBot();
        // Ensure different bots
        while (toBot === fromBot) {
          toBot = this.getRandomBot();
        }
        break;
    }

    return {
      id,
      fromBot,
      toBot,
      channel,
      content,
      timestamp: Date.now(),
      type
    };
  }

  /**
   * Get random bot name
   */
  private getRandomBot(): string {
    const nonHubBots = this.botNames.filter(name => name !== 'CentralHub');
    return nonHubBots[Math.floor(Math.random() * nonHubBots.length)];
  }

  /**
   * Get random channel
   */
  private getRandomChannel(): 'sys' | 'app' | 'ui' | 'agent' | 'game' {
    return this.channels[Math.floor(Math.random() * this.channels.length)];
  }

  /**
   * Get random message content
   */
  private getRandomContent(): string {
    return this.demoMessages[Math.floor(Math.random() * this.demoMessages.length)];
  }

  /**
   * Get random message type with weighted probability
   */
  private getRandomMessageType(): 'bot-to-center' | 'center-to-bot' | 'bot-to-bot' {
    const rand = Math.random();
    if (rand < 0.5) return 'bot-to-center';
    if (rand < 0.8) return 'center-to-bot';
    return 'bot-to-bot';
  }

  /**
   * Update simulation status
   */
  private updateStatus(phase: 'idle' | 'single' | 'burst' | 'chaos', messagesSent: number): void {
    this.simulationStatus$.next({
      isRunning: this.isRunning,
      messagesSent,
      currentPhase: phase
    });
  }

  /**
   * Get bot position for animations (mock positions)
   */
  getBotPosition(botName: string): THREE.Vector3 {
    const botIndex = this.botNames.indexOf(botName);
    if (botIndex === -1 || botName === 'CentralHub') {
      return new THREE.Vector3(0, 1, 0); // Center position
    }

    // Arrange bots in a circle
    const angle = (botIndex / (this.botNames.length - 1)) * Math.PI * 2;
    const radius = 5;
    return new THREE.Vector3(
      Math.cos(angle) * radius,
      0.5,
      Math.sin(angle) * radius
    );
  }

  /**
   * Manual message trigger for testing
   */
  sendTestMessage(channel?: 'sys' | 'app' | 'ui' | 'agent' | 'game'): void {
    const message = this.generateRandomMessage();
    if (channel) {
      message.channel = channel;
    }
    
    this.messageEmitter$.next(message);
    this.messageCounter++;
    
    console.log(`🎭 Test message sent: ${message.id} (${message.channel})`);
  }

  /**
   * Send specific message type for testing
   */
  sendTestMessageType(type: 'bot-to-center' | 'center-to-bot' | 'bot-to-bot'): void {
    const message = this.generateRandomMessage();
    message.type = type;
    
    // Adjust from/to based on type
    switch (type) {
      case 'bot-to-center':
        message.fromBot = this.getRandomBot();
        message.toBot = 'CentralHub';
        break;
      case 'center-to-bot':
        message.fromBot = 'CentralHub';
        message.toBot = this.getRandomBot();
        break;
      case 'bot-to-bot':
        message.fromBot = this.getRandomBot();
        message.toBot = this.getRandomBot();
        while (message.toBot === message.fromBot) {
          message.toBot = this.getRandomBot();
        }
        break;
    }
    
    this.messageEmitter$.next(message);
    this.messageCounter++;
    
    console.log(`🎭 Test ${type} message sent: ${message.id}`);
  }

  /**
   * Get current statistics
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      messagesSent: this.messageCounter,
      currentStatus: this.simulationStatus$.value
    };
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    console.log('🎭 Disposing DemoMessageSimulator');
    this.stop();
    this.destroy$.complete();
    this.messageEmitter$.complete();
    this.simulationStatus$.complete();
  }
}
