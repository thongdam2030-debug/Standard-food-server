const mongoose = require('mongoose');
const { config } = require('../config/env');
const { sendSuccess } = require('../utils/response');

const databaseStates = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

function getHealth(req, res) {
  const databaseState = mongoose.connection.readyState;

  return sendSuccess(res, {
    database: {
      host: mongoose.connection.host || null,
      state: databaseStates[databaseState] || 'unknown',
    },
    environment: config.env,
    service: 'standarfood-pos-server',
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
  });
}

module.exports = { getHealth };