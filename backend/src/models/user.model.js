import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  uid: { 
    type: String, 
    required: true, 
    unique: true 
  },
  name: { 
    type: String,
    required: true 
  },
  email: { 
    type: String, 
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: { 
    type: String, 
    enum: ['student', 'teacher', 'admin'], 
    default: 'student' 
  },
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
  },
  isActive: {
    type: Boolean,
    default: true
  },
  classSessions: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassSession'
    }
  ],
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
  },
  lastLogin: {
    type: Date
  }
}, { timestamps: true });

userSchema.methods.updateLastLogin = function() {
  this.lastLogin = Date.now();
  return this.save();
};
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', userSchema);