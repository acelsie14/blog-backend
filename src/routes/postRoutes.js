import express from 'express';
import Post from '../models/Post.js';
// import User from '../models/User';
import { protectRoute, isAdmin } from '../middleware/auth.js';

const router = express.Router();

const isAuthor = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (
      post.author.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res
        .status(403)
        .json({ message: 'You are not authorized to modify this post' });
    }

    req.post = post;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Error checking authorization' });
  }
};

router.post('/', protectRoute, async (req, res) => {
  try {
    const { title, content, mediaType, mediaUrl } = req.body;

    if (req.user.role !== 'editor' && req.user.role !== 'admin') {
      return res
        .status(403)
        .json({ message: 'Only editors and admins can create posts' });
    }

    if (!title || !content) {
      return res
        .status(400)
        .json({ message: 'Title and content are required' });
    }

    const post = new Post({
      title: title,
      content: content,
      mediaType: mediaType || 'text',
      mediaUrl: mediaUrl || '',
      author: req.user._id,
      publishedAt: Date.now(),
    });

    await post.save();

    return res.status(201).json({
      message: 'Post created successfully',
      post: post,
    });
  } catch (error) {
    console.error('Error creating post:', error);
    return res.status(500).json({ message: 'Error creating post' });
  }
});

router.get('/', async (req, res) => {
  try {
    const posts = await Post.find({})
      .sort({ publishedAt: -1 })
      .populate('author', 'username profileImage');
    const postCount = posts.length;

    return res.status(200).json({
      message: 'All posts retrieved successfully',
      sucess: true,
      count: postCount,
      data: posts,
    });
  } catch (error) {
    return res.status(500).json('message:Failed to fetch posts');
  }
});

router.get('/:id', async (req, res) => {
  try {
    const postId = req.params.id;

    const post = await Post.findById(postId).populate(
      'author',
      'username profileImage',
    );

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    return res
      .status(200)
      .json({ message: 'Post found', post: post, sucess: true });
  } catch (error) {
    console.log('Error fetching posts ', error);
    return res.status(500).json({ message: 'Error fetching posts' });
  }
});

router.put('/:id', protectRoute, isAuthor, async (req, res) => {
  try {
    const { title, content, mediaType, mediaUrl } = req.body;

    req.post.title = title || req.post.title;
    req.post.content = content || req.post.content;
    req.post.mediaType = mediaType || req.post.mediaType;
    req.post.mediaUrl = mediaUrl || req.post.mediaUrl;

    await req.post.save();

    return res.status(200).json({
      message: 'Post updated successfully',
      data: req.post,
    });
  } catch (error) {
    console.error('Error updating post:', error);
    return res.status(500).json({ message: 'Error updating post' });
  }
});

router.delete('/:id', protectRoute, isAuthor, async (req, res) => {
  try {
    await req.post.deleteOne();
    return res.status(200).json({ message: 'Post deleted successfuly' });
  } catch (error) {
    console.error('Error deleting post:', error);
    return res.status(500).json({ message: 'Error deleting post' });
  }
});
export default router;
