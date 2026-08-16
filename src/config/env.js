const dotenv = require('dotenv');

dotenv.config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 4000,
  mongodbUri: (process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/standarfood_pos').trim(),
  mongodbDnsServers: (process.env.MONGODB_DNS_SERVERS || '1.1.1.1,8.8.8.8')
    .split(',')
    .map((server) => server.trim())
    .filter(Boolean),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'standarfood-dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  defaultOwnerName: process.env.DEFAULT_OWNER_NAME || 'Store Owner',
  defaultOwnerUsername: process.env.DEFAULT_OWNER_USERNAME || 'owner',
  defaultOwnerPassword: process.env.DEFAULT_OWNER_PASSWORD || 'owner12345',
};

module.exports = { config };
