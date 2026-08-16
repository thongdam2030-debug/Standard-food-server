const { Server } = require('socket.io');
const { config } = require('../config/env');

let ioInstance = null;

function createRealtimeServer(httpServer) {
  ioInstance = new Server(httpServer, {
    cors: {
      origin(origin, callback) {
        if (!origin || config.corsOrigin === '*' || origin === config.corsOrigin || /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
          return callback(null, true);
        }

        return callback(new Error('Socket.IO CORS origin not allowed'));
      },
      credentials: true,
    },
  });

  ioInstance.on('connection', (socket) => {
    socket.emit('server:ready', { connected: true });
  });

  return ioInstance;
}

function emitRealtimeEvent(eventName, payload) {
  if (!ioInstance) return;
  ioInstance.emit(eventName, payload);
}

module.exports = { createRealtimeServer, emitRealtimeEvent };
