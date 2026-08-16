const http = require('http');
const app = require('./app');
const { config } = require('./config/env');
const { connectDatabase } = require('./config/database');
const { createRealtimeServer } = require('./realtime/socket');
const { ensureDefaultOwner } = require('./services/bootstrapService');

function listen(httpServer, port) {
  return new Promise((resolve, reject) => {
    httpServer.listen(port, () => resolve(httpServer));
    httpServer.on('error', reject);
  });
}

async function startServer() {
  try {
    await connectDatabase();
    await ensureDefaultOwner();

    const httpServer = http.createServer(app);
    createRealtimeServer(httpServer);
    await listen(httpServer, config.port);
    console.log(`StandarFood POS API running on port ${config.port}`);
  } catch (error) {
    console.error('Server startup failed:', error.message);
    process.exit(1);
  }
}

startServer();
