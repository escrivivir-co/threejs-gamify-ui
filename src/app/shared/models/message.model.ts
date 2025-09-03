import { ChannelType, MessageType, SocketMessage } from '@lib/core/bridge/interfaces';

export interface Message {
  id: string;
  timestamp: Date;
  channel: ChannelType;
  type: MessageType;
  content: string;
  source?: string;
  target?: string;
  data?: SocketMessage; // Original socket message data
}

export interface MessageFilter {
  channels: ChannelType[];
  types: MessageType[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  searchQuery?: string;
}

export interface MessageStats {
  total: number;
  byChannel: Record<ChannelType, number>;
  byType: Record<MessageType, number>;
  avgPerMinute: number;
  peak: {
    count: number;
    timestamp: Date;
  };
}
