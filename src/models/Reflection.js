// models/Reflection.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const ReflectionSchema = new Schema({
  reflectionText: {
    type: String,
    required: true
  },
  mood: {
    type: String
  },
  thought: {
    type: String
  },
  userId: {
    type: String
  },
  selectedFeeling: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now // Automatically saves the date
  }
});

module.exports = mongoose.model('Reflection', ReflectionSchema);