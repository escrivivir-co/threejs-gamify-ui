export interface Message {
  id: string;
  timestamp: Date;
  channel: string;
  type: string;
  content: string;
  source?: string;
  target?: string;
}

export interface MessageFilter {
  channels: string[];
  types: string[];
  timeRange?: {
    start: Date;
    end: Date;
  };
}

export interface MessageStats {
  total: number;
  byChannel: Record<string, number>;
  byType: Record<string, number>;
}
