const User = require('../models/User');
const { config } = require('../config/env');

async function ensureDefaultOwner() {
  const existingOwner = await User.findOne({ role: 'owner' }).lean();

  if (existingOwner) {
    return;
  }

  const passwordHash = await User.hashPassword(config.defaultOwnerPassword);
  await User.create({
    name: config.defaultOwnerName,
    username: config.defaultOwnerUsername,
    passwordHash,
    role: 'owner',
    isActive: true,
  });

  console.log(`Default owner user created: ${config.defaultOwnerUsername}`);
}

module.exports = { ensureDefaultOwner };
