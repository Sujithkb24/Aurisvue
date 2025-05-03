import mongoose from 'mongoose';
import crypto from 'crypto';

const schoolSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },

  teacherCode: {
    type: String,
    required: true,
    unique: true,
    default: () => crypto.randomBytes(4).toString('hex').toUpperCase()
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

const School = mongoose.model('School', schoolSchema);
export default School;
