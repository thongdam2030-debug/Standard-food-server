const dns = require('dns');
const mongoose = require('mongoose');
const { config } = require('./env');

async function connectDatabase() {
  try {
    if (config.mongodbUri.startsWith('mongodb+srv://') && config.mongodbDnsServers.length > 0) {
      dns.setServers(config.mongodbDnsServers);
    }

    await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`MongoDB connected: ${mongoose.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    throw error;
  }
}

module.exports = { connectDatabase };