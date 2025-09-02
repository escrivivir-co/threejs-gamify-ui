// Core interfaces for the RxJS-Socket.io bridge

export enum ChannelType {
  SYS = 'sys',
  APP = 'app',
  UI = 'ui'
}

export enum MessageType {
  BOT_STATUS = 'bot_status',
  BOT_COMMAND = 'bot_command',
  HEALTH_CHECK = 'health_check',
  USER_ACTION = 'user_action',
  SYSTEM_EVENT = 'system_event'
}

export interface BaseMessage {
  id: string;
  timestamp: number;
  channel: ChannelType;
  type: MessageType;
  source?: string;
  target?: string;
}

export interface BotStatusMessage extends BaseMessage {
  type: MessageType.BOT_STATUS;
  botId: string;
  status: 'online' | 'offline' | 'processing';
  position?: {
    x: number;
    y: number;
    z: number;
  };
}

export interface BotCommandMessage extends BaseMessage {
  type: MessageType.BOT_COMMAND;
  botId: string;
  command: 'start' | 'stop' | 'reset' | 'configure';
  params?: Record<string, any>;
}

export interface HealthCheckMessage extends BaseMessage {
  type: MessageType.HEALTH_CHECK;
  systemHealth: {
    cpu: number;
    memory: number;
    connections: number;
  };
}

export interface UserActionMessage extends BaseMessage {
  type: MessageType.USER_ACTION;
  action: string;
  data?: Record<string, any>;
}

export interface SystemEventMessage extends BaseMessage {
  type: MessageType.SYSTEM_EVENT;
  event: string;
  severity: 'info' | 'warning' | 'error';
  data?: Record<string, any>;
}

export type SocketMessage = 
  | BotStatusMessage 
  | BotCommandMessage 
  | HealthCheckMessage 
  | UserActionMessage 
  | SystemEventMessage;

export interface Room {
  id: string;
  name: string;
  subscribers: number;
}

export interface ConnectionConfig {
  url: string;
  options?: {
    autoConnect?: boolean;
    timeout?: number;
    reconnection?: boolean;
    reconnectionAttempts?: number;
    reconnectionDelay?: number;
    maxReconnectionDelay?: number;
    reconnectionDelayMax?: number;
    randomizationFactor?: number;
  };
}

export interface BridgeEvent {
  type: 'connection' | 'disconnection' | 'message' | 'error';
  data?: any;
  timestamp: number;
}

export interface ChannelManager {
  subscribe(channel: ChannelType, callback: (message: SocketMessage) => void): void;
  unsubscribe(channel: ChannelType, callback?: (message: SocketMessage) => void): void;
  emit(channel: ChannelType, message: SocketMessage): void;
  getActiveChannels(): ChannelType[];
}

export interface RoomManager {
  join(roomId: string): Promise<boolean>;
  leave(roomId: string): Promise<boolean>;
  getRooms(): Room[];
  isInRoom(roomId: string): boolean;
}

export interface ReconnectionHandler {
  start(): void;
  stop(): void;
  getAttempts(): number;
  isReconnecting(): boolean;
}
