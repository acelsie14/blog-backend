import express from 'express';
import Bookmark from '../models/Bookmark.js';
import { protectRoute } from '../middleware/auth.js';
import Post from '../models/Post.js';

const router = express.Router();

router.post('/posts/:postId/bookmark', protectRoute, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const existingBookmark = await Bookmark.findOne({
      user: userId,
      post: postId,
    });
    if (existingBookmark) {
      return res.status(400).json({ message: 'Bookmark already exists' });
    }

    const bookmark = new Bookmark({
      user: userId,
      post: postId,
    });

    await bookmark.save();
    res
      .status(201)
      .json({ success: true, message: 'Bookmark created successfully' });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'Error creating bookmark', error });
  }
});

router.delete('/posts/:postId/unbookmark', protectRoute, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const bookmark = await Bookmark.findOne({ user: userId, post: postId });
    if (!bookmark) {
      return res
        .status(404)
        .json({ success: false, message: 'Bookmark not found' });
    }

    await bookmark.deleteOne();
    res
      .status(200)
      .json({ success: true, message: 'Bookmark deleted successfully' });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'Error deleting bookmark', error });
  }
});

router.get('/users/me/bookmarks', protectRoute, async (req, res) => {
  try {
    const userId = req.user._id;
    const bookmarks = await Bookmark.find({ user: userId })
      .populate({
        path: 'post',
        select: 'title content excerpt featuredImage author publishedAt',
        populate: {
          path: 'author',
          select: 'username profileImage',
        },
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Bookmarks fetched successfully',
      count: bookmarks.length,
      data: bookmarks,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'Error fetching bookmarks', error });
  }
});

router.get('/posts/:postId/bookmarks', protectRoute, async (req, res) => {
  try {
    const { postId } = req.params;

    const bookmark = await Bookmark.findOne({
      user: req.user._id,
      post: postId,
    });

    const isBookmarked = bookmark ? true : false;
    res.status(200).json({
      success: true,
      message: 'Bookmarks fetched successfully',
      isBookmarked: isBookmarked,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'Error fetching bookmarks', error });
  }
});

export default router;
