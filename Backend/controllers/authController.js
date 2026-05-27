const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const signToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      name: user.name,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );
};

const ALLOWED_CREDENTIAL_PLATFORMS = ['linkedin', 'indeed', 'naukri', 'unstop', 'google', 'generic'];

const normalizeCredentials = (credentials = {}) => {
  if (!credentials || typeof credentials !== 'object' || Array.isArray(credentials)) {
    return null;
  }

  return ALLOWED_CREDENTIAL_PLATFORMS.reduce((normalized, platform) => {
    const value = credentials[platform] || {};
    const email = String(value.email || value.username || '').trim();
    const password = String(value.password || '');

    normalized[platform] = { email, password };
    return normalized;
  }, {});
};

const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await User.create({
      name: name || '',
      email: email.toLowerCase().trim(),
      password: hashedPassword,
    });

    const token = signToken(newUser);

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: newUser._id,
        email: newUser.email,
        name: newUser.name,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signToken(user);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header missing or invalid' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Token missing' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (error, decoded) => {
    if (error) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
    };
    next();
  });
};

const getCredentials = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json({ credentials: user.credentials || {} });
  } catch (error) {
    console.error('getCredentials error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const saveCredentials = async (req, res) => {
  try {
    const normalizedCredentials = normalizeCredentials(req.body?.credentials);
    if (!normalizedCredentials) {
      return res.status(400).json({ message: 'Credentials payload is invalid' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.credentials = { ...(user.credentials || {}), ...normalizedCredentials };
    user.markModified('credentials');
    await user.save();
    return res.json({ message: 'Credentials saved successfully', credentials: user.credentials });
  } catch (error) {
    console.error('saveCredentials error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  signup,
  login,
  verifyToken,
  getCredentials,
  saveCredentials,
};
