import express from 'express';
import { protectRoute } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

router.get('/profile', protectRoute, async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      message: 'User profile fetched successfully',
      data: user,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/profile', protectRoute, async (req, res) => {
  try {
    const { username, email, bio, profileImage } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    user.username = username;
    user.email = email;
    user.bio = bio;
    user.profileImage = profileImage;
    await user.save();
    return res.status(200).json({
      message: 'User profile updated successfully',
      data: user,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/profile/password', protectRoute, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/profile', protectRoute, async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await user.remove();

    return res
      .status(200)
      .json({ message: 'User profile deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
