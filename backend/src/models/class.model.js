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
  students: [
    {
      type: String,
      ref: 'User',
    }
  ],
  videoEnabled: {
    type: Boolean,
    default: false,
  },
  jitsiLink: {
    type: String,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  transcripts: [
    {
      text: { type: String, required: true },
      speaker: { type: String }, // e.g., 'teacher' or 'student'
      userId: {
        type: String,
        ref: 'User'
      },
      timestamp: { type: Date, default: Date.now }
    }
  ],
  handRaises: [
    {
      userId: {
        type: String,
        ref: 'User',
        required: true
      },
      userName: {
        type: String,
        required: true
      },
      requestType: {
        type: String,
        enum: ['video', 'text'],
        required: true
      },
      status: {
        type: String,
        enum: ['pending', 'accepted', 'declined'],
        default: 'pending'
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      respondedAt: {
        type: Date
      }
    }
  ],
  // Added feedback array to store student feedback
  feedback: [
    {
      studentId: {
        type: String,
        ref: 'User',
        required: true
      },
      understood: {
        type: Boolean,
        required: true
      },
      transcript: {
        type: String
      },
      conversionResult: {
        type: String
      },
      specificFeedback: {
        type: String
      },
      problematicWords: [String],
      timestamp: {
        type: Date,
        default: Date.now
      }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  endedAt: {
    type: Date,
  },
});
const ClassSession = mongoose.model('ClassSession', classSessionSchema);
export default ClassSession;
