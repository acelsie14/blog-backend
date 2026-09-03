import express from 'express';
import Tag from '../models/Tag.js';
import { protectRoute, isAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const tags = await Tag.find().sort({ name: 1 });

    if (!tags) {
      return res.status(400).json({ message: 'No tags found' });
    }

    return res.status(200).json({
      message: 'All tags gotten',
      success: true,
      count: tags.length,
      data: tags,
    });
  } catch (error) {
    console.log('Error getting tags: ', error);
    return res.status(500).json({ message: 'Error getting tags' });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const tag = await Tag.findOne({ slug: slug });

    if (!tag) {
      return res.status(404).json({ message: 'Tag not found' });
    }

    return res.status(200).json({
      message: 'Tag found',
      success: true,
      data: tag,
    });
  } catch (error) {
    console.log('Error getting tags: ', error);
    return res.status(500).json({ message: 'Error getting tags' });
  }
});

router.put('/:id', protectRoute, isAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    const tag = await Tag.findById(req.params.id);

    if (!tag) {
      return res.status(404).json({ message: 'Tag not found' });
    }
    tag.name = name || req.tag.name;

    if (name) {
      tag.slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    await tag.save();
    return res.status(200).json({
      message: 'Tag updated successfully',
      data: tag,
    });
  } catch (error) {
    console.log('Error updating tag: ', error);
    return res.status(500).json({ message: 'Error updating category' });
  }
});

router.delete('/:id', protectRoute, isAdmin, async (req, res) => {
  try {
    const tag = await Tag.findById(req.params.id);

    if (!tag) {
      return res.status(404).json({ message: 'Tag not found' });
    }

    await tag.deleteOne();

    return res.status(200).json({
      message: 'Tag deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting tag:', error);
    return res.status(500).json({ message: 'Error deleting tag' });
  }
});

export default router;
