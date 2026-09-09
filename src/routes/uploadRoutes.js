import express from 'express';
import multer from 'multer';
import cloudinary from '../config/cloudinary.js';
import { protectRoute } from '../middleware/auth.js';

const router = express.Router();

//  Storage - Keep file in memory
const storage = multer.memoryStorage();

//  File Filter - Only accept images
const fileFilter = (req, file, cb) => {
  // Check if the file is an image
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only images are allowed'), false); // ❌ Reject
  }
};

//  Create the upload middleware
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

// POST /image - Upload a single image
router.post(
  '/image',
  protectRoute,
  upload.single('image'),
  async (req, res) => {
    try {
      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No image provided',
        });
      }

      // Upload to Cloudinary
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: 'blog-posts',
              resource_type: 'auto',
              transformation: [
                { width: 1200, crop: 'limit' }, // ✅ Limit width
                { quality: 'auto:low' }, // ✅ Lower quality for speed
                { fetch_format: 'auto' }, // ✅ Auto format
              ],
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            },
          )
          .end(req.file.buffer);
      });

      // Return the URL
      return res.status(200).json({
        success: true,
        url: result.secure_url,
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      return res.status(500).json({
        success: false,
        message: 'Error uploading image',
      });
    }
  },
);

export default router;
