import express from 'express';
import User from '../models/User.js';
import { sendVerificationEmail } from '../services/emailService.js';
import { protectRoute, isAdmin } from '../middleware/auth.js';
import crypto from 'crypto';
import VerificationToken from '../models/VerificationToken.js';

const router = express.Router();

router.post('/create-editor', protectRoute, isAdmin, async (req, res) => {
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
        return res.status(400).json({
          message: 'User already exists with this Phonenumber',
          error: error.message,
        });
      }
    }
    const user = new User({
      username: username,
      email: email,
      phoneNumber: phoneNumber,
      password: password,
      bio: bio,
      role: 'editor',
      isVerified: false,
    });
    await user.save();
    console.log('1. User saved');

    const verificationToken = crypto.randomBytes(32).toString('hex');
    console.log('2. Token generated:', verificationToken);

    try {
      await sendVerificationEmail(user.email, verificationToken);
      console.log('✅ Email sent');
    } catch (emailError) {
      console.log('⚠️ Email failed, but user was created:', emailError.message);
    }
    // Save the verification token in the database
    const newVerificationToken = new VerificationToken({
      userId: user._id,
      token: verificationToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    await newVerificationToken.save();
    console.log('4. Verification token saved');

    return res.status(201).json({
      message: 'Editor created sucessfullly. Verification email sent ',
    });
  } catch (error) {
    console.log('error creating editor: ', error);
    return res.status(500).json({ message: 'Error creating editor' });
  }
});

router.get('/pending', protectRoute, isAdmin, async (req, res) => {
  try {
    const pendingUsers = await User.find({ role: 'pending' }).select(
      'username email phoneNumber bio createdAt',
    );

    return res.status(200).json({
      message: 'Pending users fetched successfuly',
      success: true,
      count: pendingUsers.length,
      data: pendingUsers,
    });
  } catch (error) {
    console.log('Error fetching pending users', error);
    return res.status(500).json({ message: 'Error fetching pending users' });
  }
});

router.post('/approve/:id', protectRoute, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'pending') {
      return res.status(400).json({ message: 'User is not pending approval' });
    }

    user.role = 'editor';
    await user.save();

    const verificationToken = crypto.randomBytes(32).toString('hex');
    console.log('2. Token generated:', verificationToken);

    await sendVerificationEmail(user.email, verificationToken);

    // Save the verification token in the database
    const newVerificationToken = new VerificationToken({
      userId: user._id,
      token: verificationToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    await newVerificationToken.save();
    console.log('4. Verification token saved');

    return res.status(201).json({
      message: 'Editor approved sucessfullly. Verification email sent ',
    });
  } catch (error) {
    console.log('error approving editor: ', error);
    return res.status(500).json({ message: 'Error approving editor' });
  }
});

router.delete('/reject/:id', protectRoute, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'pending') {
      return res.status(400).json({ message: 'User is not pending approval' });
    }

    await user.deleteOne();
    await VerificationToken.deleteMany({ userId: user._id });

    return res
      .status(200)
      .json({ message: 'User deleted successfully', success: true });
  } catch (error) {
    console.error('Error deleting user ', error);
    return res.status(500).json({ message: 'Error deleting user' });
  }
});

router.get('/users', protectRoute, isAdmin, async (req, res) => {
  try {
    const { role, isActive, isVerified } = req.query;

    const filter = {};
    if (role) {
      filter.role = role;
    }
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    if (isVerified !== undefined) {
      filter.isVerified = isVerified === 'true';
    }

    const users = await User.find(filter).select('-password').sort({
      createdAt: -1,
    });

    return res.status(200).json({
      message: 'All users retrieved successfully',
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ message: 'Failed to fetch users' });
  }
});

router.get('/users/:id', protectRoute, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ message: 'User found', data: user });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching user' });
  }
});

router.put('/users/:id', protectRoute, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, role, bio } = req.body;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.username = username || user.username;
    user.email = email || user.email;
    user.role = role || user.role;
    user.bio = bio || user.bio;

    await user.save();

    return res.status(200).json({ message: 'user updated', data: user });
  } catch (error) {
    return res.status(500).json({ message: 'Error updating user' });
  }
});

router.delete('/users/:id', protectRoute, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    await user.deleteOne();
    return res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ message: 'Error deleting user' });
  }
});

router.post(
  '/users/:id/deactivate',
  protectRoute,
  isAdmin,
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (user.isActive === false) {
        return res.status(400).json({ message: 'User is not active' });
      }

      user.isActive = false;

      await user.save();
      return res.status(200).json({ message: 'User deactivated successfully' });
    } catch (error) {
      return res.status(500).json({ message: 'Error deactivating user' });
    }
  },
);

router.post('/users/:id/activate', protectRoute, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isActive === true) {
      return res.status(400).json({ message: 'User is  active' });
    }

    user.isActive = true;

    await user.save();
    return res.status(200).json({ message: 'User activated successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Error activating user' });
  }
});
export default router;
