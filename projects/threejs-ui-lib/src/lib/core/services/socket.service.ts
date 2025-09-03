import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { RxjsSocketBridge } from '../bridge/rxjs-socket-bridge';
import { 
  SocketMessage, 
  ChannelType, 
  MessageType, 
  BotStatusMessage,
  BotCommandMessage,
  ConnectionConfig 
} from '../bridge/interfaces';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  
  constructor(private bridge: RxjsSocketBridge) {
    console.log('SocketService initialized');
  }

  // Connection management
  connect(config?: ConnectionConfig): void {
    this.bridge.connect(config);
  }

  disconnect(): void {
    this.bridge.disconnect();
  }

  // Observable streams
  get connectionStatus$(): Observable<string> {
    return this.bridge.connectionStatus;
  }

  get messages$(): Observable<SocketMessage> {
    return this.bridge.messages;
  }

  get sysMessages$(): Observable<SocketMessage> {
    return this.bridge.sysMessages;
  }

  get appMessages$(): Observable<SocketMessage> {
    return this.bridge.appMessages;
  }

  get uiMessages$(): Observable<SocketMessage> {
    return this.bridge.uiMessages;
  }

  get errors$(): Observable<Error> {
    return this.bridge.errors;
  }

  get isReconnecting$(): Observable<boolean> {
    return this.bridge.isReconnecting;
  }

  // Message emission helpers
  sendBotCommand(botId: string, command: 'start' | 'stop' | 'reset' | 'configure', params?: Record<string, any>): void {
    const message: BotCommandMessage = {
      id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      channel: ChannelType.APP,
      type: MessageType.BOT_COMMAND,
      botId,
      command,
      params
    };

    this.bridge.emit(ChannelType.APP, message);
  }

  sendUserAction(action: string, data?: Record<string, any>): void {
    const message: SocketMessage = {
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      channel: ChannelType.UI,
      type: MessageType.USER_ACTION,
      action,
      data
    };

    this.bridge.emit(ChannelType.UI, message);
  }

  // Room management
  async joinRoom(roomId: string): Promise<boolean> {
    return this.bridge.join(roomId);
  }

  async leaveRoom(roomId: string): Promise<boolean> {
    return this.bridge.leave(roomId);
  }

  // Utility methods
  isConnected(): boolean {
    // Simple check - in a real app you might want more sophisticated logic
    return this.bridge.connectionStatus !== undefined;
  }

  getConnectionAttempts(): number {
    return this.bridge.getAttempts();
  }
}
