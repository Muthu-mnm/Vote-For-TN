const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true,
    unique: true
  },
  party: {
    type: String,
    required: true,
    enum: ['tvk', 'ntk', 'dmk', 'admk', 'nota']
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Vote', voteSchema);
