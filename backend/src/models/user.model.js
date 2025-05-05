import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  name: { type: String},
  email: { type: String, required: true },
  role: { type: String, enum: ['student', 'teacher'], default: 'student' },

  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
  },

  useFaceAuth: {
    type: Boolean,
    default: false
  },

  faceDescriptor: {
    type: [Number],
    default: null,
    validate: {
      validator: function (arr) {
        return !arr || arr.length === 0 || arr.length === 128;
      },
      message: 'Face descriptor must be a 128-dimensional array'
    }
  }
}, { timestamps: true });

userSchema.methods.updateLastLogin = function() {
  this.lastLogin = Date.now();
  return this.save();
};

export default mongoose.model('User', userSchema);