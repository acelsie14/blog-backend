import express from 'express';
import { protectRoute } from '../middleware/auth.js';
import Post from '../models/Post.js';
import Comment from '../models/Comment.js';
import User from '../models/User.js';

const router = express.Router();

// ============ CREATE COMMENT ============
router.post('/posts/:postId/comments', protectRoute, async (req, res) => {
  try {
    const { content } = req.body;
    const { postId } = req.params;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Content is required',
      });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    const comment = new Comment({
      content: content,
      post: postId,
      author: req.user._id,
    });

    await comment.save();

    const populatedComment = await Comment.findById(comment._id).populate(
      'author',
      'username profileImage',
    );

    return res.status(201).json({
      success: true,
      message: 'Comment created successfully',
      data: populatedComment,
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating comment',
    });
  }
});

// ============ GET COMMENTS ============
router.get('/posts/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;

    const comments = await Comment.find({ post: postId })
      .sort({ createdAt: -1 })
      .populate('author', 'username profileImage');

    return res.status(200).json({
      success: true,
      message: 'Comments fetched successfully',
      count: comments.length,
      data: comments,
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching comments',
    });
  }
});

// ============ UPDATE COMMENT ============
router.put('/comments/:id', protectRoute, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Content is required',
      });
    }

    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found',
      });
    }

    // Check if user is author or admin
    if (
      comment.author.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to edit this comment',
      });
    }

    comment.content = content;
    comment.isEdited = true;
    await comment.save();

    const populatedComment = await Comment.findById(comment._id).populate(
      'author',
      'username profileImage',
    );

    return res.status(200).json({
      success: true,
      message: 'Comment updated successfully',
      data: populatedComment,
    });
  } catch (error) {
    console.error('Error updating comment:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating comment',
    });
  }
});

// ============ DELETE COMMENT ============
router.delete('/comments/:id', protectRoute, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found',
      });
    }

    // Check if user is author or admin
    if (
      comment.author.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this comment',
      });
    }

    await comment.deleteOne(); // ← Fixed: changed from .remove()

    return res.status(200).json({
      success: true,
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting comment',
    });
  }
});

// ============ LIKE COMMENT ============
router.post('/comments/:id/like', protectRoute, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found',
      });
    }

    if (comment.likes.includes(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: 'You have already liked this comment',
      });
    }

    comment.likes.push(req.user._id);
    await comment.save();

    return res.status(200).json({
      success: true,
      message: 'Comment liked successfully',
      likes: comment.likes.length,
    });
  } catch (error) {
    console.error('Error liking comment:', error);
    return res.status(500).json({
      success: false,
      message: 'Error liking comment',
    });
  }
});

// ============ UNLIKE COMMENT ============
router.delete('/comments/:id/unlike', protectRoute, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found',
      });
    }

    if (!comment.likes.includes(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: 'You have not liked this comment',
      });
    }

    comment.likes = comment.likes.filter(
      (id) => id.toString() !== req.user._id.toString(),
    );
    await comment.save();

    return res.status(200).json({
      success: true,
      message: 'Comment unliked successfully',
      likes: comment.likes.length,
    });
  } catch (error) {
    console.error('Error unliking comment:', error);
    return res.status(500).json({
      success: false,
      message: 'Error unliking comment',
    });
  }
});

export default router;
