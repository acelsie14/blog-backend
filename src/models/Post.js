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
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
    },
    featuredImage: {
      type: String,
    },
    readingTime: {
      type: Number,
    },
    schduledPublish: {
      type: Date,
    },
    slug: {
      type: String,
    },
    excerpt: {
      type: String,
    },
    viewCount: {
      type: Number,
    },
    likes: {
      type: Number,
    },
    commentCount: {
      type: Number,
    },
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],
    tags: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tag',
      },
    ],
    likes: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
      default: [],
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
