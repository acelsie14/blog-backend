import express from 'express';
import Post from '../models/Post.js';
import Category from '../models/Category.js';
import Tag from '../models/Tag.js';
import { protectRoute, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// ============ MIDDLEWARE: Check if user is the author or admin ============
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
    console.error('Error checking authorization:', error);
    res.status(500).json({ message: 'Error checking authorization' });
  }
};

// ============ CREATE POST ============
router.post('/', protectRoute, async (req, res) => {
  try {
    const {
      title,
      content,
      mediaType,
      mediaUrl,
      status,
      categories,
      tags,
      featuredImage,
      excerpt,
    } = req.body;

    // Check if user is editor or admin
    if (req.user.role !== 'editor' && req.user.role !== 'admin') {
      return res
        .status(403)
        .json({ message: 'Only editors and admins can create posts' });
    }

    // Validate required fields
    if (!title || !content) {
      return res
        .status(400)
        .json({ message: 'Title and content are required' });
    }

    // ===== PROCESS TAGS (Auto-create if they don't exist) =====
    const tagIds = [];
    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        let tag = await Tag.findOne({
          name: { $regex: new RegExp(`^${tagName}$`, 'i') },
        });

        if (!tag) {
          const slug = tagName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

          tag = new Tag({
            name: tagName,
            slug: slug,
          });
          await tag.save();
        }
        tagIds.push(tag._id);
      }
    }

    // ===== PROCESS CATEGORIES  =====
    let categoryIds = [];
    if (categories && categories.length > 0) {
      for (const categoryName of categories) {
        // Find category by name (case-insensitive)
        const category = await Category.findOne({
          name: { $regex: new RegExp(`^${categoryName}$`, 'i') },
        });

        if (!category) {
          return res.status(400).json({
            message: `Category '${categoryName}' does not exist. Please use an existing category.`,
          });
        }
        categoryIds.push(category._id);
      }
    }

    const post = new Post({
      title: title,
      content: content,
      mediaType: mediaType || 'text',
      mediaUrl: mediaUrl || '',
      author: req.user._id,
      publishedAt: status === 'published' ? Date.now() : null,
      status: status || 'draft',
      categories: categoryIds,
      tags: tagIds,
      featuredImage: featuredImage || '',
      excerpt: excerpt || '',
    });

    await post.save();

    // Populate the post before sending response
    const populatedPost = await Post.findById(post._id)
      .populate('author', 'username profileImage')
      .populate('categories', 'name slug')
      .populate('tags', 'name slug');

    return res.status(201).json({
      message: 'Post created successfully',
      post: populatedPost,
    });
  } catch (error) {
    console.error('Error creating post:', error);
    return res.status(500).json({ message: 'Error creating post' });
  }
});

// ============ GET ALL POSTS (with filters) ============
router.get('/', async (req, res) => {
  try {
    const { status, category, tag, author, search } = req.query;

    const filter = {};

    if (status) {
      filter.status = status;
    }
    if (author) {
      filter.author = author;
    }

    // ===== FILTER BY CATEGORY NAME =====
    if (category) {
      const categoryDoc = await Category.findOne({
        name: { $regex: new RegExp(`^${category}$`, 'i') },
      });
      if (categoryDoc) {
        filter.categories = categoryDoc._id;
      } else {
        return res
          .status(200)
          .json({ message: 'Category not found', data: [] });
      }
    }

    // ===== FILTER BY TAG NAME =====
    if (tag) {
      const tagDoc = await Tag.findOne({
        name: { $regex: new RegExp(`^${tag}$`, 'i') },
      });
      if (tagDoc) {
        filter.tags = tagDoc._id;
      } else {
        return res.status(200).json({ message: 'Tag not found', data: [] });
      }
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
      ];
    }

    const posts = await Post.find(filter)
      .sort({ publishedAt: -1 })
      .populate('author', 'username profileImage')
      .populate('categories', 'name slug')
      .populate('tags', 'name slug');

    return res.status(200).json({
      message: 'All posts retrieved successfully',
      success: true,
      count: posts.length,
      data: posts,
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return res.status(500).json({ message: 'Failed to fetch posts' });
  }
});

// ============ GET SINGLE POST ============
router.get('/:id', async (req, res) => {
  try {
    const postId = req.params.id;

    const post = await Post.findById(postId)
      .populate('author', 'username profileImage')
      .populate('categories', 'name slug')
      .populate('tags', 'name slug');

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    return res
      .status(200)
      .json({ message: 'Post found', post: post, success: true });
  } catch (error) {
    console.error('Error fetching post:', error);
    return res.status(500).json({ message: 'Error fetching post' });
  }
});

// ============ UPDATE POST ============
router.put('/:id', protectRoute, isAuthor, async (req, res) => {
  try {
    const {
      title,
      content,
      mediaType,
      mediaUrl,
      status,
      categories,
      tags,
      featuredImage,
      excerpt,
    } = req.body;

    // ===== PROCESS TAGS (Auto-create if they don't exist) =====
    const tagIds = [];
    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        let tag = await Tag.findOne({
          name: { $regex: new RegExp(`^${tagName}$`, 'i') },
        });

        if (!tag) {
          const slug = tagName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

          tag = new Tag({
            name: tagName,
            slug: slug,
          });
          await tag.save();
        }
        tagIds.push(tag._id);
      }
    }

    // ===== PROCESS CATEGORIES (Find by name, not ID) =====
    let categoryIds = [];
    if (categories && categories.length > 0) {
      for (const categoryName of categories) {
        const category = await Category.findOne({
          name: { $regex: new RegExp(`^${categoryName}$`, 'i') },
        });

        if (!category) {
          return res.status(400).json({
            message: `Category '${categoryName}' does not exist. Please use an existing category.`,
          });
        }
        categoryIds.push(category._id);
      }
    }

    // Update post fields
    req.post.title = title || req.post.title;
    req.post.content = content || req.post.content;
    req.post.mediaType = mediaType || req.post.mediaType;
    req.post.mediaUrl = mediaUrl || req.post.mediaUrl;
    req.post.status = status || req.post.status;
    req.post.categories =
      categoryIds.length > 0 ? categoryIds : req.post.categories;
    req.post.tags = tagIds.length > 0 ? tagIds : req.post.tags;
    req.post.featuredImage = featuredImage || req.post.featuredImage;
    req.post.excerpt = excerpt || req.post.excerpt;

    await req.post.save();

    // Populate the post before sending response
    const populatedPost = await Post.findById(req.post._id)
      .populate('author', 'username profileImage')
      .populate('categories', 'name slug')
      .populate('tags', 'name slug');

    return res.status(200).json({
      message: 'Post updated successfully',
      data: populatedPost,
    });
  } catch (error) {
    console.error('Error updating post:', error);
    return res.status(500).json({ message: 'Error updating post' });
  }
});

// ============ PUBLISH POST ============
router.post('/:id/publish', protectRoute, isAuthor, async (req, res) => {
  try {
    req.post.status = 'published';
    req.post.publishedAt = Date.now();

    await req.post.save();

    res.status(200).json({
      success: true,
      message: 'Post published successfully',
      post: req.post,
    });
  } catch (error) {
    console.error('Error publishing post:', error);
    return res.status(500).json({ message: 'Error publishing post' });
  }
});

// ============ UNPUBLISH POST ============
router.post('/:id/unpublish', protectRoute, isAuthor, async (req, res) => {
  try {
    req.post.status = 'draft';

    await req.post.save();

    res.status(200).json({
      success: true,
      message: 'Post unpublished successfully',
      post: req.post,
    });
  } catch (error) {
    console.error('Error unpublishing post:', error);
    return res.status(500).json({ message: 'Error unpublishing post' });
  }
});

// ============ SCHEDULE POST ============
router.put('/:id/schedule', protectRoute, isAuthor, async (req, res) => {
  try {
    const { scheduledDate } = req.body;

    if (!scheduledDate) {
      return res.status(400).json({ message: 'No date provided' });
    }

    req.post.scheduledPublish = new Date(scheduledDate);

    await req.post.save();

    return res.status(200).json({
      success: true,
      message: 'Post scheduled successfully',
      scheduledPublish: req.post.scheduledPublish,
      post: req.post,
    });
  } catch (error) {
    console.error('Error scheduling post:', error);
    return res.status(500).json({ message: 'Error scheduling post' });
  }
});

// ============ DELETE POST ============
router.delete('/:id', protectRoute, isAuthor, async (req, res) => {
  try {
    await req.post.deleteOne();
    return res.status(200).json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    return res.status(500).json({ message: 'Error deleting post' });
  }
});

router.post('/:id/like', protectRoute, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    if (post.likes.includes(req.user._id)) {
      return res
        .status(400)
        .json({ message: 'You have already liked this post' });
    }
    post.likes.push(req.user._id);
    await post.save();
    return res.status(200).json({ message: 'Post liked successfully' });
  } catch (error) {
    console.error('Error liking post:', error);
    return res.status(500).json({ message: 'Error liking post' });
  }
});

router.delete('/:id/unlike', protectRoute, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    if (!post.likes.includes(req.user._id)) {
      return res.status(400).json({ message: 'You have not liked this post' });
    }
    post.likes = post.likes.filter(
      (id) => id.toString() !== req.user._id.toString(),
    );
    await post.save();
    return res.status(200).json({ message: 'Post unliked successfully' });
  } catch (error) {
    console.error('Error unliking post:', error);
    return res.status(500).json({ message: 'Error unliking post' });
  }
});

router.get('/:id/likes', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const count = post.likes.length;

    return res
      .status(200)
      .json({ message: 'Post likes fetched successfully', count: count });
  } catch (error) {
    console.error('Error fetching post likes count:', error);
    return res.status(500).json({ message: 'Error fetching post likes count' });
  }
});
export default router;
