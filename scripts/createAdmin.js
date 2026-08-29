import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../src/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const adminExists = await User.findOne({ role: 'admin' });
    if (adminExists) {
      console.log('✅ Admin already exists');
      console.log('📧 Email:', adminExists.email);
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash('admin123', 10);

    const admin = new User({
      username: 'admin',
      email: 'admin@blog.com',
      phoneNumber: '+0987654321',
      password: hashedPassword,
      role: 'admin',
      isVerified: true,
      bio: 'Super Admin',
    });

    await admin.save();
    console.log('✅ Admin created successfully');
    console.log('📧 Email: admin@blog.com');
    console.log('🔑 Password: admin123');
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
};

createAdmin();
