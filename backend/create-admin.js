require('dotenv').config();
const connectDB = require('./config/database');
const User = require('./models/User');
const jwt = require('jsonwebtoken');

const run = async () => {
  try {
    await connectDB();

    const email = process.env.ADMIN_EMAIL || 'admin@example.com';
    const password = process.env.ADMIN_PASSWORD || 'Admin123!';
    const name = process.env.ADMIN_NAME || 'Administrator';
    const phone = process.env.ADMIN_PHONE || '';
    const school = process.env.ADMIN_SCHOOL || 'ADMIN';

    // Check if an admin already exists
    const existing = await User.findOne({ role: 'admin' });
    if (existing) {
      console.log('An admin user already exists:', existing.email);
      process.exit(0);
    }

    const user = await User.create({
      name,
      email,
      password,
      phone,
      school,
      role: 'admin'
    });

    // Generate a token for convenience
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'changeme', {
      expiresIn: process.env.JWT_EXPIRE || '30d'
    });

    console.log('Admin user created successfully');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Use the following token to authenticate (optional):');
    console.log(token);

    process.exit(0);
  } catch (err) {
    console.error('Error creating admin:', err.message || err);
    process.exit(1);
  }
};

run();
