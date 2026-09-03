import express from 'express';
import 'dotenv/config';
import mongoose from 'mongoose';
import { sendVerificationEmail } from './services/emailService.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import postRoutes from './routes/postRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import tagRoutes from './routes/tagRoutes.js';
import userRoutes from './routes/userRoutes.js';
import commentRoutes from './routes/commentRoutes.js';
import bookmarkRoutes from './routes/bookmarkRoutes.js';

const app = express();

app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/users', userRoutes);
app.use('/api', commentRoutes);
app.use('/api', bookmarkRoutes);
// Temporary test route
// app.get('/test-email', async (req, res) => {
//   await sendVerificationEmail(process.env.EMAIL_FROM, 'test-token');
//   res.send('Email sent!');
// })
const PORT = process.env.PORT || 5000;

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Databse connected');
  } catch (error) {
    console.error('Datbase connection error: ', error.message);
  }
};

connectDB();
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
