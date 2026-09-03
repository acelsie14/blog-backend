import express from 'express';
import Category from '../models/Category.js';
import { protectRoute, isAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protectRoute, async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });

    if (!categories) {
      return res.status(400).json({ message: 'No categories found' });
    }

    return res.status(200).json({
      message: 'All categories gotten',
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    console.log('Error getting categories: ', error);
    return res.status(500).json({ message: 'Error getting categories' });
  }
});

router.get('/:slug', protectRoute, async (req, res) => {
  try {
    const { slug } = req.params.slug;
    const category = await Category.findOne({ slug: slug });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    return res.status(200).json({
      message: 'Category found',
      success: true,
      data: category,
    });
  } catch (error) {
    console.log('Error getting category: ', error);
    return res.status(500).json({ message: 'Error getting category' });
  }
});

router.post('/', protectRoute, isAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      console.log(name);
      return res.status(400).json({ message: 'Category name is required' });
    }

    const existingCategory = await Category.findOne({ name: name });

    if (existingCategory) {
      return res.status(400).json({ message: 'Category already exists' });
    }
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const category = new Category({
      name: name,
      slug: slug,
      description: description || '',
      createdBy: req.user._id,
    });

    await category.save();

    return res
      .status(201)
      .json({ message: 'Category created successfully', data: category });
  } catch (error) {
    console.log('Error creating category: ', error);
    return res.status(500).json({ message: 'Error creating category' });
  }
});

router.put('/:id', protectRoute, isAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    category.name = name || req.category.name;
    if (name) {
      category.slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    category.description = description || req.category.description;

    await category.save();
    return res.status(200).json({
      message: 'Category updated successfully',
      data: category,
    });
  } catch (error) {
    console.log('Error updating category: ', error);
    return res.status(500).json({ message: 'Error updating category' });
  }
});

router.delete('/:id', protectRoute, isAdmin, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    await category.deleteOne();
    return res.status(200).json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    return res.status(500).json({ message: 'Error deleting category' });
  }
});

export default router;
