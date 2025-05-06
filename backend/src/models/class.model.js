import mongoose from 'mongoose';

const classSessionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,
  code: {
    type: String,
    required: true,
    unique: true,
  },
  createdBy: {
    type: String,
    ref: 'User',
    required: true,
  },
  videoEnabled: {
    type: Boolean,
    default: false
  },
  jitsiLink: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const ClassSession = mongoose.model('ClassSession', classSessionSchema);
export default ClassSession;
