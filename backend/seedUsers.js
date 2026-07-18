require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const seedUsers = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database.');

    // Clear existing test users if any
    await User.deleteMany({ email: { $in: ['user@test.com', 'agent@test.com', 'admin@test.com'] } });
    console.log('Cleaned up old test users.');

    // Seed User
    const user = await User.create({
      name: 'User Test',
      email: 'user@test.com',
      password: 'password123',
      role: 'User',
      isVerified: true
    });
    console.log('Seeded User:', user.email);

    // Seed Agent
    const agent = await User.create({
      name: 'Agent Test',
      email: 'agent@test.com',
      password: 'password123',
      role: 'Agent',
      isVerified: true
    });
    console.log('Seeded Agent:', agent.email);

    // Seed Admin
    const admin = await User.create({
      name: 'Admin Test',
      email: 'admin@test.com',
      password: 'password123',
      role: 'Admin',
      isVerified: true
    });
    console.log('Seeded Admin:', admin.email);

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding users:', error);
    process.exit(1);
  }
};

seedUsers();
