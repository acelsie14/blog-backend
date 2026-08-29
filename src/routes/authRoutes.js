import express from 'express';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import VerificationToken from '../models/VerificationToken.js';

const router = express.Router();

router.post('/apply', async (req, res) => {
  try {
    const { username, email, phoneNumber, password, bio } = req.body;

    if (!username || !email || !phoneNumber || !password || !bio) {
      console.log('All fields required');
      return res.status(400).json({ message: 'All fields required' });
    }

    const existingUser = await User.findOne({
      $or: [
        { email: email },
        { username: username },
        { phoneNumber: phoneNumber },
      ],
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res
          .status(400)
          .json({ message: 'User already exists with this email' });
      }
      if (existingUser.username === username) {
        return res
          .status(400)
          .json({ message: 'User already exists with this username' });
      }
      if (existingUser.phoneNumber === phoneNumber) {
        return res
          .status(400)
          .json({ message: 'User already exists with this Phonenumber' });
      }
    }

    const user = new User({
      username: username,
      email: email,
      phoneNumber: phoneNumber,
      password: password,
      bio: bio,
      role: 'pending',
    });
    await user.save();

    return res.status(201).json({ message: 'Application sent successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res
        .status(400)
        .json({ message: 'Please provide identifier and password' });
    }

    const user = await User.findOne({
      $or: [
        { email: identifier },
        { username: identifier },
        { phoneNumber: identifier },
      ],
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      return res
        .status(403)
        .json({ message: 'Please verify your email before logging in' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
    );

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in' });
  }
});

router.get('/verify-email/:token', async (req, res) => {
  try {
    const token = req.params.token;
    const tokenExistsinDB = await VerificationToken.findOne({ token });

    if (!tokenExistsinDB) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    if (tokenExistsinDB.expiresAt < Date.now()) {
      return res.status(400).json({ message: 'Expired token' });
    }

    const user = await User.findById(tokenExistsinDB.userId);
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    user.isVerified = true;
    await user.save();

    await VerificationToken.deleteOne({ userId: tokenExistsinDB.userId });
    console.log('Email Verified successfully');
    return res
      .status(200)
      .json({ message: 'Email verified successfully. You can now log in.' });
  } catch (error) {
    console.log('Error verifying user', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
