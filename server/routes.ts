import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";

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

  // Socket.io connection handling
  io.on('connection', (socket) => {
    console.log(`Bot connected: ${socket.id}`);
    
    // Handle bot control commands
    socket.on('bot:control', (data) => {
      console.log(`Bot control: ${data.botId} - ${data.action}`);
      // Echo back to all clients
      io.emit('bot:status', {
        botId: data.botId,
        status: data.status,
        timestamp: new Date().toISOString()
      });
    });

    // Handle message broadcasting
    socket.on('message', (data) => {
      console.log(`Message from ${data.botId}: ${data.message}`);
      // Broadcast to all connected clients
      io.emit('message', {
        ...data,
        timestamp: new Date().toISOString(),
        channel: data.channel || 'app'
      });
    });

    // Handle bot joining/leaving rooms
    socket.on('bot:join', (data) => {
      socket.join(data.room || 'main');
      console.log(`Bot ${data.botId} joined room: ${data.room || 'main'}`);
    });

    socket.on('disconnect', () => {
      console.log(`Bot disconnected: ${socket.id}`);
    });
  });

  // API endpoint for Socket.io stats
  app.get('/api/socket/stats', (req, res) => {
    res.json({
      connectedClients: io.engine.clientsCount,
      timestamp: new Date().toISOString()
    });
  });

  return httpServer;
}
