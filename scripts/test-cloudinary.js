import { v2 as cloudinary } from 'cloudinary';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.resolve(__dirname, '../.env') });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const test = async () => {
  try {
    console.log('📤 Uploading local file...');
    console.log('Cloud:', process.env.CLOUDINARY_CLOUD_NAME);
    console.log('Key:', process.env.CLOUDINARY_API_KEY);
    console.log('Secret:', process.env.CLOUDINARY_API_SECRET);
    // Upload a local file
    const result = await cloudinary.uploader.upload(
      path.resolve(__dirname, 'test.png'), // Create a small test.png file
      { folder: 'test' },
    );

    console.log('✅ Cloudinary works!');
    console.log('📸 URL:', result.secure_url);
  } catch (error) {
    console.error('❌ Cloudinary failed:', error.message);
    console.error('❌ Cloudinary failed:', error);
    console.error('Full error JSON:', JSON.stringify(error, null, 2));
  }
};

test();
