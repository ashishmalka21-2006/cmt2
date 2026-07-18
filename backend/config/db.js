const mongoose = require('mongoose');

let mongoServer;

const seedDefaultUsers = async () => {
  const User = require('../models/User');
  try {
    const defaultEmails = ['user@test.com', 'agent@test.com', 'admin@test.com'];
    await User.deleteMany({ email: { $in: defaultEmails } });
    
    await User.create({
      name: 'User Test',
      email: 'user@test.com',
      password: 'password123',
      role: 'User',
      isVerified: true
    });
    
    await User.create({
      name: 'Agent Test',
      email: 'agent@test.com',
      password: 'password123',
      role: 'Agent',
      isVerified: true
    });

    await User.create({
      name: 'Admin Test',
      email: 'admin@test.com',
      password: 'password123',
      role: 'Admin',
      isVerified: true
    });
    
    console.log('Default test users seeded successfully.');
  } catch (err) {
    console.error('Error seeding default users:', err.message);
  }
};

const connectDB = async () => {
  try {
    let dbUrl = process.env.MONGODB_URI;

    try {
      console.log('Attempting to connect to MongoDB configured URI...');
      const conn = await mongoose.connect(dbUrl, {
        serverSelectionTimeoutMS: 3000 // Try for 3 seconds
      });
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      await seedDefaultUsers();
    } catch (err) {
      console.warn('Failed to connect to configured MongoDB URI. Falling back to MongoDB Memory Server...');
      
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoServer = await MongoMemoryServer.create();
      dbUrl = mongoServer.getUri();
      
      const conn = await mongoose.connect(dbUrl);
      console.log(`In-Memory MongoDB Connected: ${conn.connection.host}`);
      await seedDefaultUsers();
    }
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
