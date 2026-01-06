import express from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db/connection.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  storeRefreshToken,
  revokeRefreshToken,
  isValidRefreshToken,
  authenticateToken,
} from '../middleware/auth.js';

const router = express.Router();

// Register new user
router.post('/register', async (req, res, next) => {
  try {
    // Disable registration in production
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ 
        error: 'Registration is disabled. Please contact an administrator to create an account.' 
      });
    }

    const { email, password, name } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id, email, name, created_at`,
      [email, passwordHash, name]
    );

    const user = result.rows[0];

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token
    await storeRefreshToken(user.id, refreshToken);

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', async (req, res, next) => {
  console.log('[Auth Route] POST /login received');
  console.log('[Auth Route] Request body:', { email: req.body?.email, hasPassword: !!req.body?.password });
  console.log('[Auth Route] Request headers:', req.headers);
  
  try {
    const { email, password } = req.body;
    console.log('[Auth Route] Extracted email:', email);
    console.log('[Auth Route] Extracted password:', !!password);

    // Validation
    if (!email || !password) {
      console.log('[Auth Route] Validation failed: missing email or password');
      return res.status(400).json({ error: 'Email and password are required' });
    }

    console.log('[Auth Route] Querying database for user...');
    // Find user
    const result = await query(
      'SELECT id, email, password_hash, name FROM users WHERE email = $1',
      [email]
    );

    console.log('[Auth Route] Database query result rows:', result.rows.length);
    if (result.rows.length === 0) {
      console.log('[Auth Route] User not found in database');
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    console.log('[Auth Route] User found:', { id: user.id, email: user.email, name: user.name });

    console.log('[Auth Route] Comparing password...');
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    console.log('[Auth Route] Password valid:', isValidPassword);
    if (!isValidPassword) {
      console.log('[Auth Route] Invalid password');
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log('[Auth Route] Generating tokens...');
    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    console.log('[Auth Route] Tokens generated:', { hasAccessToken: !!accessToken, hasRefreshToken: !!refreshToken });

    console.log('[Auth Route] Storing refresh token...');
    // Store refresh token
    await storeRefreshToken(user.id, refreshToken);
    console.log('[Auth Route] Refresh token stored');

    console.log('[Auth Route] Sending success response...');
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      accessToken,
      refreshToken,
    });
    console.log('[Auth Route] Response sent successfully');
  } catch (error) {
    console.error('[Auth Route] Login error:', error);
    console.error('[Auth Route] Error name:', error.name);
    console.error('[Auth Route] Error message:', error.message);
    console.error('[Auth Route] Error stack:', error.stack);
    next(error);
  }
});

// Refresh access token
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    // Verify token is valid in database
    const isValid = await isValidRefreshToken(refreshToken);
    if (!isValid) {
      return res.status(403).json({ error: 'Invalid or expired refresh token' });
    }

    // Verify token signature
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      return res.status(403).json({ error: 'Invalid refresh token' });
    }

    // Get user
    const result = await query('SELECT id, email, name FROM users WHERE id = $1', [decoded.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Generate new access token
    const accessToken = generateAccessToken(user);

    res.json({
      accessToken,
    });
  } catch (error) {
    next(error);
  }
});

// Logout (revoke refresh token)
router.post('/logout', authenticateToken, async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, email, name, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

export default router;

