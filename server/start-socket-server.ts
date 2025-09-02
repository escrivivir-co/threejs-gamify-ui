import SocketServer from './socket-server';

// Configuration from environment variables
const config = {
  port: parseInt(process.env.SOCKET_PORT || '8000'),
  corsOrigin: process.env.CORS_ORIGIN?.split(',') || [
    'http://localhost:5000',
    'http://localhost:4200',
    'http://127.0.0.1:5000',
    'http://127.0.0.1:4200'
  ],
  enableLogging: process.env.NODE_ENV !== 'production'
};

console.log('Starting Socket.io server with configuration:', config);

// Create and start the server
const server = new SocketServer(config);

async function startServer() {
  try {
    await server.start();
    console.log(`✅ Socket.io server running successfully`);
    console.log(`📡 Server URL: http://localhost:${config.port}`);
    console.log(`🔗 CORS Origins: ${config.corsOrigin.join(', ')}`);
    console.log(`📊 Health check: http://localhost:${config.port}/health`);
    console.log(`📈 Stats endpoint: http://localhost:${config.port}/stats`);
    
    // Display server statistics every 30 seconds
    setInterval(() => {
      const stats = server.getStats();
      console.log(`[Stats] Clients: ${stats.connectedClients}, Rooms: ${stats.rooms}, Uptime: ${Math.floor(stats.uptime)}s`);
    }, 30000);
    
  } catch (error) {
    console.error('❌ Failed to start Socket.io server:', error);
    process.exit(1);
  }
}

// Graceful shutdown handlers
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  await server.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  await server.stop();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();
