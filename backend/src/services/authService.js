import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { generateToken } from '../utils/generateToken.js';
import { USER_ROLES, USER_PLANS } from '../utils/constants.js';

const SALT_ROUNDS = 10;

// Registers a new user account with secure password hashing
export const registerUser = async ({ name, email, password, role = USER_ROLES.USER, plan = USER_PLANS.FREE }) => {
  if (!name || !email || !password) {
    const error = new Error('Name, email, and password are required');
    error.statusCode = 400;
    throw error;
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
  if (existingUser) {
    const error = new Error('An account with this email already exists');
    error.statusCode = 409;
    throw error;
  }

  // Hash password with salt
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Persist user record
  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    passwordHash,
    role,
    plan,
  });

  // Issue JWT token containing userId, role, and subscription plan
  const token = generateToken({
    userId: user._id,
    role: user.role,
    plan: user.plan,
  });

  return {
    user: user.toJSON(),
    token,
  };
};

// Validates user credentials and issues an authentication JWT
export const loginUser = async ({ email, password }) => {
  if (!email || !password) {
    const error = new Error('Email and password are required');
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    const error = new Error('Invalid email or password credentials');
    error.statusCode = 401;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    const error = new Error('Invalid email or password credentials');
    error.statusCode = 401;
    throw error;
  }

  const token = generateToken({
    userId: user._id,
    role: user.role,
    plan: user.plan,
  });

  return {
    user: user.toJSON(),
    token,
  };
};

// Retrieves user details by ID
export const getUserById = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }
  return user.toJSON();
};
