import express from 'express';
import { createServer, Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import cors from 'cors';

interface ServerConfig {
  port: number;
  corsOrigin: string | string[];
  enableLogging: boolean;
}

class SocketServer {
  private app: express.Application;
  private httpServer: HttpServer;
  private io: SocketIOServer;
  private config: ServerConfig;
  
  // Connected clients tracking
  private connectedClients = new Map<string, Socket>();
  private rooms = new Map<string, Set<string>>();
  
  constructor(config?: Partial<ServerConfig>) {
    this.config = {
      port: 8000,
      corsOrigin: ['http://localhost:5000', 'http://localhost:4200'],
      enableLogging: true,
      ...config
    };
    
    // Initialize Express app
    this.app = express();
    this.app.use(cors({
      origin: this.config.corsOrigin,
      methods: ['GET', 'POST'],
      credentials: true
    }));
    
    // Create HTTP server
    this.httpServer = createServer(this.app);
    
    // Initialize Socket.io
    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: this.config.corsOrigin,
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });
    
    this.setupRoutes();
    this.setupSocketHandlers();
  }

  /**
   * Set up Express routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        clients: this.connectedClients.size,
        rooms: this.rooms.size,
        uptime: process.uptime()
      });
    });
    
    // Socket.io stats endpoint
    this.app.get('/stats', (req, res) => {
      const roomStats = Array.from(this.rooms.entries()).map(([id, clients]) => ({
        id,
        clients: clients.size
      }));
      
      res.json({
        connectedClients: this.connectedClients.size,
        rooms: roomStats,
        serverTime: new Date().toISOString()
      });
    });
    
    this.log('Express routes configured');
  }

  /**
   * Set up Socket.io event handlers
   */
  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      this.handleConnection(socket);
    });
    
    this.log('Socket.io handlers configured');
  }

  /**
   * Handle new socket connection
   */
  private handleConnection(socket: Socket): void {
    const clientId = socket.id;
    this.connectedClients.set(clientId, socket);
    
    this.log(`Client connected: ${clientId} (Total: ${this.connectedClients.size})`);
    
    // Send welcome message
    socket.emit('connection_established', {
      clientId,
      serverTime: new Date().toISOString(),
      message: 'Welcome to ThreeGamificationUI Socket Server'
    });
    
    // Handle disconnection
    socket.on('disconnect', (reason) => {
      this.handleDisconnection(socket, reason);
    });
    
    // Handle channel-specific messages
    this.setupChannelHandlers(socket);
    
    // Handle room management
    this.setupRoomHandlers(socket);
    
    // Handle error events
    socket.on('error', (error) => {
      this.log(`Socket error from ${clientId}:`, error);
    });
  }

  /**
   * Set up channel-specific message handlers
   */
  private setupChannelHandlers(socket: Socket): void {
    const channels = ['sys', 'app', 'ui'];
    
    channels.forEach(channel => {
      socket.on(`${channel}_message`, (data) => {
        this.handleChannelMessage(socket, channel, data);
      });
    });
    
    // Generic message handler
    socket.on('message', (data) => {
      this.handleChannelMessage(socket, 'general', data);
    });
  }

  /**
   * Handle channel message
   */
  private handleChannelMessage(socket: Socket, channel: string, data: any): void {
    try {
      // Add server metadata
      const enrichedMessage = {
        ...data,
        serverId: process.pid,
        serverTime: new Date().toISOString(),
        clientId: socket.id
      };
      
      this.log(`[${channel.toUpperCase()}] Message from ${socket.id}:`, data.type || 'unknown');
      
      // Broadcast to all clients (including sender for demo purposes)
      socket.emit(`${channel}_message`, enrichedMessage);
      socket.broadcast.emit(`${channel}_message`, enrichedMessage);
      
      // Also emit generic message event
      socket.emit('message', enrichedMessage);
      socket.broadcast.emit('message', enrichedMessage);
      
      // Handle specific message types
      this.handleSpecificMessageTypes(socket, channel, enrichedMessage);
      
    } catch (error) {
      this.log(`Error handling ${channel} message:`, error);
      socket.emit('error', { 
        message: 'Failed to process message',
        originalMessage: data 
      });
    }
  }

  /**
   * Handle specific message types with server responses
   */
  private handleSpecificMessageTypes(socket: Socket, channel: string, message: any): void {
    switch (message.type) {
      case 'bot_command':
        // Simulate bot response
        setTimeout(() => {
          const response = {
            id: `response_${Date.now()}`,
            timestamp: Date.now(),
            channel: 'sys',
            type: 'bot_status',
            botId: message.botId,
            status: message.command === 'start' ? 'online' : 
                   message.command === 'stop' ? 'offline' : 'processing',
            position: message.position || this.generateBotPosition(message.botId)
          };
          
          socket.emit('sys_message', response);
          socket.broadcast.emit('sys_message', response);
        }, 500 + Math.random() * 1500); // Simulate processing delay
        break;
        
      case 'health_check':
        // Respond with current server health
        const healthResponse = {
          id: `health_${Date.now()}`,
          timestamp: Date.now(),
          channel: 'sys',
          type: 'health_check',
          systemHealth: {
            cpu: Math.random() * 30 + 10, // Simulate low CPU usage
            memory: Math.random() * 40 + 30, // Simulate moderate memory usage
            connections: this.connectedClients.size
          }
        };
        
        socket.emit('sys_message', healthResponse);
        break;
    }
  }

  /**
   * Set up room management handlers
   */
  private setupRoomHandlers(socket: Socket): void {
    socket.on('join_room', (roomId: string, callback) => {
      this.handleJoinRoom(socket, roomId, callback);
    });
    
    socket.on('leave_room', (roomId: string, callback) => {
      this.handleLeaveRoom(socket, roomId, callback);
    });
    
    socket.on('get_rooms', (callback) => {
      this.handleGetRooms(socket, callback);
    });
  }

  /**
   * Handle room join
   */
  private handleJoinRoom(socket: Socket, roomId: string, callback?: Function): void {
    try {
      socket.join(roomId);
      
      // Track room membership
      if (!this.rooms.has(roomId)) {
        this.rooms.set(roomId, new Set());
      }
      this.rooms.get(roomId)!.add(socket.id);
      
      this.log(`Client ${socket.id} joined room: ${roomId}`);
      
      // Notify room members
      socket.to(roomId).emit('user_joined', {
        userId: socket.id,
        roomId,
        timestamp: new Date().toISOString()
      });
      
      // Notify client about successful join
      socket.emit('room_joined', roomId);
      
      if (callback) callback(true);
      
    } catch (error) {
      this.log(`Error joining room ${roomId}:`, error);
      if (callback) callback(false);
    }
  }

  /**
   * Handle room leave
   */
  private handleLeaveRoom(socket: Socket, roomId: string, callback?: Function): void {
    try {
      socket.leave(roomId);
      
      // Update room tracking
      const room = this.rooms.get(roomId);
      if (room) {
        room.delete(socket.id);
        if (room.size === 0) {
          this.rooms.delete(roomId);
        }
      }
      
      this.log(`Client ${socket.id} left room: ${roomId}`);
      
      // Notify room members
      socket.to(roomId).emit('user_left', {
        userId: socket.id,
        roomId,
        timestamp: new Date().toISOString()
      });
      
      // Notify client about successful leave
      socket.emit('room_left', roomId);
      
      if (callback) callback(true);
      
    } catch (error) {
      this.log(`Error leaving room ${roomId}:`, error);
      if (callback) callback(false);
    }
  }

  /**
   * Handle get rooms request
   */
  private handleGetRooms(socket: Socket, callback?: Function): void {
    const roomList = Array.from(this.rooms.entries()).map(([id, clients]) => ({
      id,
      name: id,
      subscribers: clients.size
    }));
    
    if (callback) {
      callback(roomList);
    } else {
      socket.emit('rooms_list', roomList);
    }
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(socket: Socket, reason: string): void {
    const clientId = socket.id;
    
    // Remove from connected clients
    this.connectedClients.delete(clientId);
    
    // Remove from all rooms
    this.rooms.forEach((clients, roomId) => {
      if (clients.has(clientId)) {
        clients.delete(clientId);
        if (clients.size === 0) {
          this.rooms.delete(roomId);
        } else {
          // Notify remaining room members
          socket.to(roomId).emit('user_left', {
            userId: clientId,
            roomId,
            reason,
            timestamp: new Date().toISOString()
          });
        }
      }
    });
    
    this.log(`Client disconnected: ${clientId} (Reason: ${reason}, Remaining: ${this.connectedClients.size})`);
  }

  /**
   * Generate mock bot position
   */
  private generateBotPosition(botId: string): { x: number; y: number; z: number } {
    // Simple hash-based position for consistency
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
   * Simple hash function
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Start the server
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.httpServer.listen(this.config.port, '0.0.0.0', () => {
          this.log(`Socket.io server running on port ${this.config.port}`);
          this.log(`CORS origins: ${JSON.stringify(this.config.corsOrigin)}`);
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      // Disconnect all clients
      this.connectedClients.forEach((socket) => {
        socket.disconnect(true);
      });
      
      // Close server
      this.httpServer.close(() => {
        this.log('Socket.io server stopped');
        resolve();
      });
    });
  }

  /**
   * Logging utility
   */
  private log(...args: any[]): void {
    if (this.config.enableLogging) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [SocketServer]`, ...args);
    }
  }

  /**
   * Get server statistics
   */
  getStats() {
    return {
      connectedClients: this.connectedClients.size,
      rooms: this.rooms.size,
      uptime: process.uptime(),
      port: this.config.port
    };
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new SocketServer({
    port: parseInt(process.env.SOCKET_PORT || '8000'),
    corsOrigin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5000'],
    enableLogging: process.env.NODE_ENV !== 'production'
  });
  
  server.start().catch(error => {
    console.error('Failed to start Socket.io server:', error);
    process.exit(1);
  });
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down gracefully...');
    await server.stop();
    process.exit(0);
  });
}

export default SocketServer;
