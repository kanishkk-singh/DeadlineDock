/**
 * AUTH CONTROLLER
 * Handles user registration and login with bcrypt + JWT.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('crypto');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'deadlinedock_secret_key_change_in_production';
const JWT_EXPIRES = '7d';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function makeToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

const AuthController = {
  async register(req, res) {
    try {
      const { name, email, password } = req.body;

      // Validation
      if (!name || !email || !password) {
        return res.status(400).json({ success: false, error: 'All fields are required' });
      }
      if (password.length < 6) {
        return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
      }
      const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRx.test(email)) {
        return res.status(400).json({ success: false, error: 'Invalid email address' });
      }

      // Check duplicate
      if (db.users.findByEmail(email)) {
        return res.status(409).json({ success: false, error: 'Email already registered' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);
      const avatar = name.trim().slice(0, 2).toUpperCase();

      const user = db.users.create({
        id: generateId(),
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        avatar,
        createdAt: new Date().toISOString()
      });

      // Create default stats
      db.stats.upsert(user.id, { points: 0, level: 1, badges: [] });

      const token = makeToken(user);
      const { password: _, ...safeUser } = user;

      res.status(201).json({ success: true, token, user: safeUser });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ success: false, error: 'Server error during registration' });
    }
  },

  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password required' });
      }

      const user = db.users.findByEmail(email.toLowerCase().trim());
      if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid email or password' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, error: 'Invalid email or password' });
      }

      const token = makeToken(user);
      const { password: _, ...safeUser } = user;

      res.json({ success: true, token, user: safeUser });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ success: false, error: 'Server error during login' });
    }
  },

  async getMe(req, res) {
    try {
      const user = db.users.findById(req.user.id);
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });
      const { password: _, ...safeUser } = user;
      res.json({ success: true, user: safeUser });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Server error' });
    }
  }
};

module.exports = AuthController;
