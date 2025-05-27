const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fetch = require('node-fetch');
const validator = require('validator');
const rateLimit = require('express-rate-limit');

// Login Rate Limiter
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per windowMs
  message: 'Too many login attempts, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
});

// Helper function for country detection
const getClientIP = req => {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 
         req.socket?.remoteAddress || 
         req.connection?.remoteAddress || 
         '8.8.8.8'; // Fallback IP
};

const detectCountry = async (req) => {
  try {
    const ip = getClientIP(req);
    console.log('Detected IP:', ip);
    
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,countryCode`);
    const data = await response.json();
    
    console.log('IP API Response:', data);
    
    if (data.status === 'success') {
      return data.countryCode.toUpperCase();
    }
    return 'US';
  } catch (error) {
    console.error('Country detection error:', error);
    return 'US';
  }
};

// GET Registration Page
router.get('/register', async (req, res) => {
  try {
    const [countries, autoCountry] = await Promise.all([
      fetch('https://restcountries.com/v3.1/all')
        .then(res => res.json())
        .then(data => data.map(c => ({
          name: c.name.common,
          code: c.cca2
        })).sort((a, b) => a.name.localeCompare(b.name))),
      detectCountry(req)
    ]);

    res.render('register', { 
      countries,
      autoCountry: countries.some(c => c.code === autoCountry) ? autoCountry : 'US'
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('register', {
      error: 'Failed to load registration page',
      countries: [],
      autoCountry: 'US'
    });
  }
});

// POST Registration
router.post('/register', async (req, res) => {
  try {
    const { displayName, username, email, age, password, country } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const [existingUser, countries] = await Promise.all([
      User.findOne({
        where: {
          [Op.or]: [
            { username: username.toLowerCase() },
            { email: normalizedEmail }
          ]
        }
      }),
      fetch('https://restcountries.com/v3.1/all')
        .then(res => res.json())
        .then(data => data.map(c => ({
          name: c.name.common,
          code: c.cca2
        })).sort((a, b) => a.name.localeCompare(b.name)))
    ]);

    if (existingUser) {
      return res.render('register', {
        error: 'Username or email already exists',
        countries,
        autoCountry: country
      });
    }

    if (!validator.isEmail(email)) {
      return res.render('register', {
        error: 'Invalid email address',
        countries,
        autoCountry: country
      });
    }
    
    await User.create({
      displayName,
      username: username.toLowerCase(),
      email: normalizedEmail,
      age,
      password,
      country
    });

    res.redirect('/auth/login');
  } catch (err) {
    console.error(err);
    res.render('register', {
      error: 'Registration failed. Please try again.',
      countries: [],
      autoCountry: req.body.country
    });
  }
});

// Single Check Username Route
router.get('/check-username', async (req, res) => {
  try {
    const username = req.query.username.toLowerCase();
    const user = await User.findOne({
      where: { username: { [Op.like]: username } }
  });
    res.json({ available: !user });
  } catch (error) {
    res.status(500).json({ available: false });
  }
});

// Email Availability Check
router.get('/check-email', async (req, res) => {
  try {
    const email = req.query.email.toLowerCase();
    const user = await User.findOne({
      where: { email: { [Op.like]: email } }
  });
    res.json({ available: !user });
  } catch (error) {
    res.status(500).json({ available: false });
  }
});

// Handle Login
router.get('/login', (req, res) => {
  res.render('login');
});

// Login route
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const lowerIdentifier = identifier.toLowerCase().trim();
    
    console.log('\n=== Login Attempt ===');
    console.log('Received identifier:', identifier);
    console.log('Normalized identifier:', lowerIdentifier);

    // Find user by email or username
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: { [Op.eq]: lowerIdentifier } },
          { username: { [Op.eq]: lowerIdentifier } }
        ]
      }
    });

    console.log('User search result:', user ? `Found user ID ${user.id}` : 'No user found');

    // Check user existence and password
    if (!user?.password) {
      console.log('Login failed: User not found or missing password');
      return res.render('login', { error: 'Invalid credentials' });
    }

    console.log('Stored password hash:', user.password);
    
    // Compare passwords
    console.log('Comparing passwords...');
    const validPassword = await bcrypt.compare(password, user.password);
    console.log('Password match result:', validPassword);

    if (!validPassword) {
      console.log('Login failed: Password mismatch');
      return res.render('login', { error: 'Invalid credentials' });
    }

    // Session handling
    console.log('Initiating session regeneration...');
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error:', err);
        return res.render('login', { error: 'Login failed. Please try again.' });
      }

      console.log('Storing user in session:', {
        id: user.id,
        username: user.username,
        email: user.email
      });

      req.session.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName
      };

      req.session.save(err => {
        if (err) {
          console.error('Session save error:', err);
          return res.render('login', { error: 'Login failed. Please try again.' });
        }
        console.log('Login successful, redirecting...\n');
        res.redirect('/');
      });
    });

  } catch (err) {
    console.error('\n!!! Login Error !!!:', err);
    res.render('login', { 
      error: 'Login failed. Please try again.' 
    });
  }
});

// Password Reset Page
router.get('/reset-password', (req, res) => {
  res.render('reset-password');
});

// Handle Password Reset
router.post('/reset-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });

    if (user) {
      user.passwordResetToken = crypto.randomBytes(20).toString('hex');
      user.passwordResetTokenExpires = Date.now() + 3600000; // 1 hour
      await user.save();
    }

    res.render('reset-password', {
      message: 'If an account exists, a reset email has been sent'
    });
  } catch (err) {
    console.error(err);
    res.render('reset-password', { 
      error: 'Password reset failed' 
    });
  }
});

// Handle Logout
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) console.error('Session destruction error:', err);
    res.redirect('/auth/login');
  });
});

module.exports = router;