import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";

// Enhanced bot management with cardinal points and rooms
interface Bot {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'connecting' | 'error';
  cardinal: 'north' | 'south' | 'east' | 'west';
  room: string;
  spiralIndex: number;
  messageActivity: number;
  position: { x: number; y: number; z: number };
  lastSeen: number;
  socketId: string;
}

interface Room {
  id: string;
  name: string;
  bots: string[];
  totalMessages: number;
  lastActivity: number;
  cardinal?: string;
}

// Global bot and room state management
const connectedBots = new Map<string, Bot>();
const activeRooms = new Map<string, Room>();
const messageCounters = new Map<string, number>();
const cardinalAssignments = new Map<string, string>();

export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  const httpServer = createServer(app);
  
  // Initialize Socket.io on the same server
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: ["http://localhost:5000", "http://0.0.0.0:5000"],
      methods: ["GET", "POST"],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Enhanced Socket.io connection handling with bot management
  io.on('connection', (socket) => {
    console.log(`Bot connected: ${socket.id}`);
    
    // Auto-register bot with cardinal assignment
    const botId = socket.id;
    const cardinal = assignCardinalToBot(botId);
    const room = `${cardinal}-room`;
    const spiralIndex = getNextSpiralIndex(cardinal);
    
    const newBot: Bot = {
      id: botId,
      name: `Bot-${cardinal}-${spiralIndex}`,
      status: 'connecting',
      cardinal: cardinal as any,
      room: room,
      spiralIndex: spiralIndex,
      messageActivity: 0,
      position: getDefaultPosition(cardinal, spiralIndex),
      lastSeen: Date.now(),
      socketId: socket.id
    };
    
    connectedBots.set(botId, newBot);
    messageCounters.set(botId, 0);
    
    // Join bot to appropriate room
    socket.join(room);
    updateRoomState(room, botId, 'join');
    
    // Send initial bot configuration to all clients
    setTimeout(() => {
      newBot.status = 'active';
      io.emit('bot:status', {
        botId: botId,
        status: 'active',
        cardinal: cardinal,
        room: room,
        timestamp: new Date().toISOString()
      });
    }, 1000);
    
    // Handle bot control commands
    socket.on('bot:control', (data) => {
      console.log(`Bot control: ${data.botId} - ${data.action}`);
      
      if (connectedBots.has(data.botId)) {
        const bot = connectedBots.get(data.botId)!;
        bot.status = data.status;
        bot.lastSeen = Date.now();
        
        // Echo back to all clients with enhanced data
        io.emit('bot:status', {
          botId: data.botId,
          status: data.status,
          cardinal: bot.cardinal,
          room: bot.room,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Enhanced message handling with spiral trajectory support
    socket.on('message', (data) => {
      console.log(`Message from ${data.botId}: ${data.message}`);
      
      // Update message activity counter
      const currentCount = messageCounters.get(data.botId) || 0;
      messageCounters.set(data.botId, currentCount + 1);
      
      if (connectedBots.has(data.botId)) {
        const bot = connectedBots.get(data.botId)!;
        bot.messageActivity = currentCount + 1;
        bot.lastSeen = Date.now();
        
        // Update room activity
        updateRoomState(bot.room, data.botId, 'message');
        
        // Handle spiral trajectory messages
        if (data.trajectory === 'spiral' && data.to) {
          const targetBot = Array.from(connectedBots.values()).find(b => b.id === data.to);
          if (targetBot) {
            io.emit('message', {
              ...data,
              from: data.botId,
              to: data.to,
              from_cardinal: bot.cardinal,
              to_cardinal: targetBot.cardinal,
              trajectory: 'spiral',
              timestamp: new Date().toISOString(),
              channel: data.channel || 'app'
            });
          }
        } else {
          // Standard message broadcast
          io.emit('message', {
            ...data,
            botId: data.botId,
            cardinal: bot.cardinal,
            room: bot.room,
            timestamp: new Date().toISOString(),
            channel: data.channel || 'app'
          });
        }
      }
    });

    // Handle enhanced bot joining/leaving rooms
    socket.on('bot:join', (data) => {
      const room = data.room || 'main';
      socket.join(room);
      
      if (connectedBots.has(data.botId)) {
        const bot = connectedBots.get(data.botId)!;
        // Leave previous room
        updateRoomState(bot.room, data.botId, 'leave');
        // Join new room
        bot.room = room;
        updateRoomState(room, data.botId, 'join');
      }
      
      console.log(`Bot ${data.botId} joined room: ${room}`);
    });
    
    // Handle bot configuration requests from client
    socket.on('request_bot_configuration', (data) => {
      console.log('Bot configuration requested:', data);
      
      const botList = Array.from(connectedBots.values()).map(bot => ({
        id: bot.id,
        name: bot.name,
        status: bot.status,
        cardinal: bot.cardinal,
        room: bot.room,
        spiralIndex: bot.spiralIndex,
        messageActivity: bot.messageActivity,
        position: bot.position,
        lastSeen: bot.lastSeen
      }));
      
      socket.emit('bot_configuration', {
        bots: botList,
        totalBots: botList.length,
        activeRooms: activeRooms.size,
        timestamp: Date.now()
      });
    });
    
    // Handle remote bot sync requests
    socket.on('sync_remote_bots', (data) => {
      console.log('Remote bot sync requested:', data);
      
      // Reorder bots by message activity within each cardinal
      reorderBotsByActivity();
      
      const syncData = {
        success: true,
        botCount: connectedBots.size,
        roomCount: activeRooms.size,
        activityData: Array.from(connectedBots.values()).map(bot => ({
          botId: bot.id,
          messageCount: bot.messageActivity,
          cardinal: bot.cardinal,
          room: bot.room
        })),
        bots: Array.from(connectedBots.values())
      };
      
      socket.emit('sync_remote_bots_response', syncData);
    });

    // Handle bot disconnection
    socket.on('disconnect', () => {
      console.log(`Bot disconnected: ${socket.id}`);
      
      if (connectedBots.has(socket.id)) {
        const bot = connectedBots.get(socket.id)!;
        updateRoomState(bot.room, socket.id, 'leave');
        connectedBots.delete(socket.id);
        messageCounters.delete(socket.id);
        
        // Notify all clients about bot disconnection
        io.emit('bot:status', {
          botId: socket.id,
          status: 'inactive',
          timestamp: new Date().toISOString()
        });
      }
    });
  });

  // Enhanced API endpoints for bot and room management
  app.get('/api/socket/stats', (req, res) => {
    res.json({
      connectedClients: io.engine.clientsCount,
      connectedBots: connectedBots.size,
      activeRooms: activeRooms.size,
      totalMessages: Array.from(messageCounters.values()).reduce((sum, count) => sum + count, 0),
      timestamp: new Date().toISOString()
    });
  });
  
  app.get('/api/bots', (req, res) => {
    const botsList = Array.from(connectedBots.values());
    res.json({
      bots: botsList,
      count: botsList.length,
      timestamp: new Date().toISOString()
    });
  });
  
  app.get('/api/rooms', (req, res) => {
    const roomsList = Array.from(activeRooms.values());
    res.json({
      rooms: roomsList,
      count: roomsList.length,
      timestamp: new Date().toISOString()
    });
  });
  
  app.get('/api/activity', (req, res) => {
    const activity = Array.from(connectedBots.values()).map(bot => ({
      botId: bot.id,
      cardinal: bot.cardinal,
      room: bot.room,
      messageCount: messageCounters.get(bot.id) || 0,
      lastSeen: bot.lastSeen
    }));
    
    res.json({
      activity,
      totalMessages: Array.from(messageCounters.values()).reduce((sum, count) => sum + count, 0),
      timestamp: new Date().toISOString()
    });
  });
  
  // Helper functions for bot management
  function assignCardinalToBot(botId: string): string {
    const cardinals = ['north', 'south', 'east', 'west'];
    
    // Extract cardinal from bot ID if it contains directional hints
    if (botId.includes('-n')) return 'north';
    if (botId.includes('-s')) return 'south';
    if (botId.includes('-e')) return 'east';
    if (botId.includes('-w')) return 'west';
    
    // Hash-based assignment for even distribution
    const hash = botId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const assigned = cardinals[Math.abs(hash) % cardinals.length];
    cardinalAssignments.set(botId, assigned);
    return assigned;
  }
  
  function getNextSpiralIndex(cardinal: string): number {
    const botsInCardinal = Array.from(connectedBots.values()).filter(bot => bot.cardinal === cardinal);
    return botsInCardinal.length;
  }
  
  function getDefaultPosition(cardinal: string, spiralIndex: number) {
    const baseDistance = 8;
    const spiralOffset = spiralIndex * 1.5;
    const angle = spiralIndex * 0.4;
    
    switch (cardinal.toLowerCase()) {
      case 'north':
        return {
          x: Math.sin(angle) * spiralOffset,
          y: 0,
          z: -(baseDistance + spiralOffset)
        };
      case 'south':
        return {
          x: Math.sin(angle) * spiralOffset,
          y: 0,
          z: baseDistance + spiralOffset
        };
      case 'east':
        return {
          x: baseDistance + spiralOffset,
          y: 0,
          z: Math.sin(angle) * spiralOffset
        };
      case 'west':
        return {
          x: -(baseDistance + spiralOffset),
          y: 0,
          z: Math.sin(angle) * spiralOffset
        };
      default:
        return { x: baseDistance, y: 0, z: 0 };
    }
  }
  
  function updateRoomState(roomId: string, botId: string, action: 'join' | 'leave' | 'message') {
    if (!activeRooms.has(roomId)) {
      activeRooms.set(roomId, {
        id: roomId,
        name: roomId,
        bots: [],
        totalMessages: 0,
        lastActivity: Date.now()
      });
    }
    
    const room = activeRooms.get(roomId)!;
    
    switch (action) {
      case 'join':
        if (!room.bots.includes(botId)) {
          room.bots.push(botId);
        }
        break;
      case 'leave':
        room.bots = room.bots.filter(id => id !== botId);
        break;
      case 'message':
        room.totalMessages++;
        break;
    }
    
    room.lastActivity = Date.now();
    
    // Remove empty rooms
    if (room.bots.length === 0 && action === 'leave') {
      activeRooms.delete(roomId);
    }
  }
  
  function reorderBotsByActivity() {
    const cardinals = ['north', 'south', 'east', 'west'];
    
    cardinals.forEach(cardinal => {
      const cardinalBots = Array.from(connectedBots.values()).filter(bot => bot.cardinal === cardinal);
      
      // Sort by message activity (most active gets spiralIndex 0)
      cardinalBots.sort((a, b) => b.messageActivity - a.messageActivity);
      
      // Update spiral indices
      cardinalBots.forEach((bot, index) => {
        bot.spiralIndex = index;
        bot.position = getDefaultPosition(cardinal, index);
      });
    });
  }

  // Periodic cleanup and activity tracking
  setInterval(() => {
    const now = Date.now();
    const timeout = 60000; // 1 minute timeout
    
    // Clean up inactive bots
    Array.from(connectedBots.entries()).forEach(([botId, bot]) => {
      if (now - bot.lastSeen > timeout) {
        console.log(`Cleaning up inactive bot: ${botId}`);
        updateRoomState(bot.room, botId, 'leave');
        connectedBots.delete(botId);
        messageCounters.delete(botId);
      }
    });
    
    // Update bot activity and reorder by activity
    if (connectedBots.size > 0) {
      reorderBotsByActivity();
    }
  }, 30000); // Run every 30 seconds
  
  return httpServer;
}
