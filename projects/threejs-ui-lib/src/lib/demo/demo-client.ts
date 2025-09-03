import { io, Socket } from 'socket.io-client';
import { 
  ChannelType, 
  MessageType, 
  BotStatusMessage,
  BotCommandMessage,
  HealthCheckMessage,
  UserActionMessage,
  SystemEventMessage
} from '../core/bridge/interfaces';

export interface DemoConfig {
  serverUrl: string;
  scenarios: string[];
  messageInterval: number;
  duration: number;
}

export class DemoClient {
  private socket: Socket | null = null;
  private isRunning = false;
  private intervalId: any = null;
  private messageCounter = 0;
  
  private botIds = [
    'bot_north_1', 'bot_north_2',
    'bot_east_1', 'bot_east_2',
    'bot_south_1', 'bot_south_2',
    'bot_west_1', 'bot_west_2'
  ];

  constructor(private config: DemoConfig) {
    console.log('DemoClient created with config:', config);
  }

  /**
   * Connect to the Socket.io server
   */
  async connect(): Promise<boolean> {
    return new Promise((resolve) => {
      console.log('Demo client connecting to:', this.config.serverUrl);
      
      this.socket = io(this.config.serverUrl, {
        autoConnect: true,
        timeout: 10000
      });

      this.socket.on('connect', () => {
        console.log('Demo client connected');
        resolve(true);
      });

      this.socket.on('connect_error', (error) => {
        console.error('Demo client connection error:', error);
        resolve(false);
      });
    });
  }

  /**
   * Start the demo simulation
   */
  start(): void {
    if (this.isRunning || !this.socket?.connected) {
      console.warn('Demo already running or not connected');
      return;
    }

    console.log('Starting demo simulation...');
    this.isRunning = true;
    this.messageCounter = 0;

    // Start message generation loop
    this.intervalId = setInterval(() => {
      this.generateDemoMessage();
    }, this.config.messageInterval);

    // Send initial system event
    this.sendSystemEvent('demo_started', 'info', {
      scenarios: this.config.scenarios,
      duration: this.config.duration
    });
  }

  /**
   * Stop the demo simulation
   */
  stop(): void {
    if (!this.isRunning) {
      console.warn('Demo not running');
      return;
    }

    console.log('Stopping demo simulation...');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Send stop event
    this.sendSystemEvent('demo_stopped', 'info', {
      totalMessages: this.messageCounter
    });
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    this.stop();
    
    if (this.socket) {
      console.log('Demo client disconnecting...');
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Generate a random demo message based on scenarios
   */
  private generateDemoMessage(): void {
    if (!this.socket?.connected) return;

    const scenarios = this.config.scenarios.length > 0 
      ? this.config.scenarios 
      : ['bot_status', 'health_check', 'user_actions'];
    
    const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    
    switch (scenario) {
      case 'bot_status':
        this.generateBotStatusMessage();
        break;
      case 'health_check':
        this.generateHealthCheckMessage();
        break;
      case 'user_actions':
        this.generateUserActionMessage();
        break;
      case 'system_events':
        this.generateSystemEventMessage();
        break;
      case 'bot_commands':
        this.generateBotCommandMessage();
        break;
      default:
        this.generateRandomMessage();
    }
    
    this.messageCounter++;
  }

  /**
   * Generate bot status messages
   */
  private generateBotStatusMessage(): void {
    const botId = this.getRandomBotId();
    const statuses: Array<'online' | 'offline' | 'processing'> = ['online', 'offline', 'processing'];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    const message: BotStatusMessage = {
      id: this.generateMessageId(),
      timestamp: Date.now(),
      channel: ChannelType.SYS,
      type: MessageType.BOT_STATUS,
      botId,
      status,
      position: this.getBotPosition(botId)
    };

    this.emit(ChannelType.SYS, message);
  }

  /**
   * Generate health check messages
   */
  private generateHealthCheckMessage(): void {
    const message: HealthCheckMessage = {
      id: this.generateMessageId(),
      timestamp: Date.now(),
      channel: ChannelType.SYS,
      type: MessageType.HEALTH_CHECK,
      systemHealth: {
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        connections: Math.floor(Math.random() * 50) + 1
      }
    };

    this.emit(ChannelType.SYS, message);
  }

  /**
   * Generate user action messages
   */
  private generateUserActionMessage(): void {
    const actions = ['bot_selected', 'filter_changed', 'scene_reset', 'demo_toggled'];
    const action = actions[Math.floor(Math.random() * actions.length)];
    
    const message: UserActionMessage = {
      id: this.generateMessageId(),
      timestamp: Date.now(),
      channel: ChannelType.UI,
      type: MessageType.USER_ACTION,
      action,
      data: {
        botId: this.getRandomBotId(),
        value: Math.random() > 0.5
      }
    };

    this.emit(ChannelType.UI, message);
  }

  /**
   * Generate system event messages
   */
  private generateSystemEventMessage(): void {
    const events = [
      { event: 'connection_established', severity: 'info' as const },
      { event: 'high_cpu_usage', severity: 'warning' as const },
      { event: 'memory_limit_reached', severity: 'error' as const },
      { event: 'bot_synchronized', severity: 'info' as const }
    ];
    
    const { event, severity } = events[Math.floor(Math.random() * events.length)];
    
    const message: SystemEventMessage = {
      id: this.generateMessageId(),
      timestamp: Date.now(),
      channel: ChannelType.SYS,
      type: MessageType.SYSTEM_EVENT,
      event,
      severity,
      data: {
        details: `Simulated ${event} event`,
        metric: Math.random() * 100
      }
    };

    this.emit(ChannelType.SYS, message);
  }

  /**
   * Generate bot command messages
   */
  private generateBotCommandMessage(): void {
    const commands: Array<'start' | 'stop' | 'reset' | 'configure'> = ['start', 'stop', 'reset', 'configure'];
    const command = commands[Math.floor(Math.random() * commands.length)];
    const botId = this.getRandomBotId();
    
    const message: BotCommandMessage = {
      id: this.generateMessageId(),
      timestamp: Date.now(),
      channel: ChannelType.APP,
      type: MessageType.BOT_COMMAND,
      botId,
      command,
      params: command === 'configure' ? { 
        setting: 'demo_mode',
        value: true 
      } : undefined
    };

    this.emit(ChannelType.APP, message);
  }

  /**
   * Generate random message for variety
   */
  private generateRandomMessage(): void {
    const generators = [
      () => this.generateBotStatusMessage(),
      () => this.generateHealthCheckMessage(),
      () => this.generateUserActionMessage(),
      () => this.generateSystemEventMessage(),
      () => this.generateBotCommandMessage()
    ];
    
    const generator = generators[Math.floor(Math.random() * generators.length)];
    generator();
  }

  /**
   * Send system event message
   */
  private sendSystemEvent(event: string, severity: 'info' | 'warning' | 'error', data?: any): void {
    const message: SystemEventMessage = {
      id: this.generateMessageId(),
      timestamp: Date.now(),
      channel: ChannelType.SYS,
      type: MessageType.SYSTEM_EVENT,
      event,
      severity,
      data
    };

    this.emit(ChannelType.SYS, message);
  }

  /**
   * Emit message to specific channel
   */
  private emit(channel: ChannelType, message: any): void {
    if (!this.socket?.connected) return;
    
    this.socket.emit(`${channel}_message`, message);
    console.log(`[Demo] Sent ${channel} message:`, message.type);
  }

  /**
   * Get random bot ID
   */
  private getRandomBotId(): string {
    return this.botIds[Math.floor(Math.random() * this.botIds.length)];
  }

  /**
   * Get bot position by ID
   */
  private getBotPosition(botId: string): { x: number; y: number; z: number } {
    // Simple hash-based position generation for consistency
    const hash = this.simpleHash(botId);
    const angle = (hash % 8) * (Math.PI / 4);
    const radius = 5 + ((hash % 3) * 2);
    
    return {
      x: Math.cos(angle) * radius,
      y: (hash % 2) * 0.5,
      z: Math.sin(angle) * radius
    };
  }

  /**
   * Simple hash function for consistent positions
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if demo is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get message count
   */
  getMessageCount(): number {
    return this.messageCounter;
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}
