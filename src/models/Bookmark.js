// models/Bookmark.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const BookmarkSchema = new Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['verse', 'chapter', 'bible'],
    required: true,
    default: 'verse'
  },
  // Common fields
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  // Bible-specific fields
  bibleId: {
    type: String,
    required: true
  },
  bibleName: {
    type: String,
    required: function() {
      return this.type === 'bible'; // Required for bible bookmarks
    }
  },

  // Book-specific fields (for chapter bookmarks)
  bookId: {
    type: String,
    required: function() {
      return this.type === 'chapter'; // Required for chapter bookmarks
    }
  },
  bookName: {
    type: String,
    required: function() {
      return this.type === 'chapter';
    }
  },
  // Chapter-specific fields
  chapterId: {
    type: String,
    required: function() {
      return this.type === 'chapter';
    }
  },
  chapterNumber: {
    type: Number,
    required: function() {
      return this.type === 'chapter';
    }
  },
  // Verse-specific fields
  verseId: {
    type: String,
    required: function() {
      return this.type === 'verse';
    }
  },
  verseNumber: {
    type: Number,
    required: function() {
      return this.type === 'verse';
    }
  },
  verseText: {
    type: String,
    required: function() {
      return this.type === 'verse';
    }
  },
  reference: {
    type: String,
    required: true
  },
  note: {
    type: String,
    default: ''
  },
  tags: [{
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for efficient queries
BookmarkSchema.index({ userId: 1, type: 1, createdAt: -1 });
BookmarkSchema.index({ userId: 1, bibleId: 1, type: 1 }, { unique: false });

module.exports = mongoose.model('Bookmark', BookmarkSchema);