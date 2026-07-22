const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { asyncHandler } = require('../middleware/errorHandler');
const { sendWelcomeEmail } = require('../services/emailService');

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const validatePassword = (password) => {
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  if (password.length > 128) {
    return 'Password cannot exceed 128 characters';
  }
  if (/\s/.test(password)) {
    return 'Password cannot contain spaces';
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must include upper & lowercase letters and a number';
  }
  return null;
};

const register = asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = normalizeEmail(req.body.email);
  const { password } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Please provide name, email, and password');
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    res.status(400);
    throw new Error('Please provide a valid email');
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    res.status(400);
    throw new Error(passwordError);
  }

  const exists = await User.findOne({ email });
  if (exists) {
    res.status(400);
    throw new Error('User already exists with this email');
  }

  const user = await User.create({ name, email, password });

  // Welcome mail goes only to this account's email (await so we can report status)
  const mailResult = await sendWelcomeEmail({ name: user.name, email: user.email }).catch(
    (err) => ({ sent: false, reason: err.message })
  );

  res.status(201).json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      preferences: user.preferences,
      token: generateToken(user._id),
      emailSent: Boolean(mailResult?.sent),
      emailSkipReason: mailResult?.sent ? undefined : mailResult?.reason,
    },
  });
});

const login = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const { password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Please provide email and password');
  }

  // Login is always by email — data stays bound to that account
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  res.json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      preferences: user.preferences,
      token: generateToken(user._id),
    },
  });
});

const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user });
});

const updateProfile = asyncHandler(async (req, res) => {
  const { name, preferences } = req.body;
  const user = await User.findById(req.user._id);

  // Email cannot be changed here — keeps all data permanently tied to signup email
  if (name) user.name = String(name).trim();
  if (preferences?.theme) user.preferences.theme = preferences.theme;

  await user.save();

  res.json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      preferences: user.preferences,
      avatar: user.avatar,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  });
});

module.exports = { register, login, getMe, updateProfile };
