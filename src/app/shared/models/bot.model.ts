export interface Bot {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'processing';
  position: {
    x: number;
    y: number;
    z: number;
  };
  lastActive: Date | null;
  messageCount: number;
}

export interface BotCommand {
  id: string;
  botId: string;
  command: 'start' | 'stop' | 'reset' | 'configure';
  timestamp: Date;
  params?: Record<string, any>;
}

export interface BotMetrics {
  botId: string;
  uptime: number;
  messagesSent: number;
  messagesReceived: number;
  lastPing: Date;
  performance: {
    cpu: number;
    memory: number;
    latency: number;
  };
}
