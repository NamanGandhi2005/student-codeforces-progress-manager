// server/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { check, body } = require('express-validator'); // For input validation

// Import controller functions
const {
    registerUser,
    loginUser,
    getMe,
    logoutUser
} = require('../controllers/authController');

// Import middleware
const { protect } = require('../middleware/authMiddleware'); // We only need 'protect' for '/me' and '/logout' here

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post(
    '/register',
    [
        // Validation rules using express-validator
        check('username', 'Username is required and must be at least 3 characters')
            .not().isEmpty().trim().isLength({ min: 3 }),
        check('email', 'Please include a valid email')
            .isEmail().normalizeEmail(),
        check('password', 'Password must be at least 6 characters')
            .isLength({ min: 6 }),
        // Optional: Validate role if provided
        body('role').optional().isIn(['student', 'admin']).withMessage('Invalid role specified')
    ],
    registerUser
);

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
    '/login',
    [
        check('loginIdentifier', 'Please provide your username or email').not().isEmpty(),
        check('password', 'Password is required').exists() // Just check if password field exists
    ],
    loginUser
);

// @route   GET /api/auth/me
// @desc    Get current logged-in user's details
// @access  Private (requires token)
router.get('/me', protect, getMe); // 'protect' middleware runs first

// @route   GET /api/auth/logout
// @desc    Log user out / clear cookie
// @access  Private (or public depending on how you want to handle client-side token clearing)
//          Making it protected ensures only an authenticated user can "log out" from the server session/cookie.
router.get('/logout', protect, logoutUser);


module.exports = router;