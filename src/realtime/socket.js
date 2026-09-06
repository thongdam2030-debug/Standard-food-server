const { Server } = require('socket.io');
const { config } = require('../config/env');

let ioInstance = null;
const connectedClients = new Map();
const allowedRooms = new Set(['kitchen', 'orders']);

function getConnectedClientCount() {
  return connectedClients.size;
}

function createRealtimeServer(httpServer) {
  ioInstance = new Server(httpServer, {
    cors: {
      origin(origin, callback) {
        if (!origin || config.corsOrigins.includes('*') || config.corsOrigins.includes(origin) || /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
          return callback(null, true);
        }

        return callback(new Error('Socket.IO CORS origin not allowed'));
      },
      credentials: true,
    },
  });

  ioInstance.on('connection', (socket) => {
    connectedClients.set(socket.id, { connectedAt: new Date() });
    socket.emit('server:ready', { connected: true, socketId: socket.id });
    ioInstance.emit('server:clients', { count: getConnectedClientCount() });

    socket.on('realtime:join', (room) => {
      if (!allowedRooms.has(room)) return;
      socket.join(room);
      socket.emit('realtime:joined', { room });
    });

    socket.on('realtime:leave', (room) => {
      if (!allowedRooms.has(room)) return;
      socket.leave(room);
      socket.emit('realtime:left', { room });
    });

    socket.on('disconnect', () => {
      connectedClients.delete(socket.id);
      ioInstance.emit('server:clients', { count: getConnectedClientCount() });
    });
  });

  return ioInstance;
}

function emitRealtimeEvent(eventName, payload, options = {}) {
  if (!ioInstance) return;

  if (options.room) {
    ioInstance.to(options.room).emit(eventName, payload);
    return;
  }

  ioInstance.emit(eventName, payload);
}

function emitOrderEvent(eventName, payload) {
  emitRealtimeEvent(eventName, payload, { room: 'kitchen' });
  emitRealtimeEvent(eventName, payload, { room: 'orders' });
}

module.exports = { createRealtimeServer, emitOrderEvent, emitRealtimeEvent, getConnectedClientCount };
