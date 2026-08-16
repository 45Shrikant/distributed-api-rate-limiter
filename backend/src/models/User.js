import mongoose from 'mongoose';
import { USER_ROLES, USER_PLANS } from '../utils/constants.js';

// User Schema represents authenticated clients of our APIs.
// Their subscription plan (free / premium) and role (user / admin)
// dictate their baseline rate-limiting quota in the Redis counter layer.
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'User name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
    },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.USER,
    },
    plan: {
      type: String,
      enum: Object.values(USER_PLANS),
      default: USER_PLANS.FREE,
    },
  },
  {
    timestamps: true,
  }
);

// Strip password hash from JSON responses to prevent credential leaks
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.passwordHash;
  return user;
};

const User = mongoose.model('User', userSchema);

export default User;
