import mongoose from 'mongoose';

const postSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    mediaType: {
      type: String,
      enum: ['text', 'image', 'audio'],
      default: 'text',
    },
    mediaUrl: {
      type: String,
    },
    wordCount: {
      type: Number,
    },
    maxWords: {
      type: Number,
      default: 500,
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    publishedAt: {
      type: Date,
    },
    updatedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

postSchema.pre('save', function (next) {
  if (this.mediaType === 'text' && this.content) {
    const words = this.content.trim().split(/\s+/).length;
    this.wordCount = words;

    if (words > this.maxWords) {
      throw new Error(`Text exceeds maximum ${this.maxWords} words`);
    }
  }
  //   next();
});

const Post = mongoose.model('Post', postSchema);

export default Post;
