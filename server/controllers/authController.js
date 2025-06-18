// server/controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator'); // For handling validation results

// @desc    Helper function to generate JWT and send response
// @access  Private (used internally by controller functions)
const sendTokenResponse = (user, statusCode, res) => {
    // Create token
    const token = jwt.sign(
        { id: user._id, role: user.role, username: user.username }, // Payload
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );

    const cookieOptions = {
        expires: new Date(Date.now() + (parseInt(process.env.JWT_COOKIE_EXPIRE_DAYS || 30) * 24 * 60 * 60 * 1000)),
        httpOnly: true, // Cookie cannot be accessed by client-side JavaScript
        // sameSite: 'strict', // Recommended for CSRF protection
    };

    if (process.env.NODE_ENV === 'production') {
        cookieOptions.secure = true; // Only send cookie over HTTPS in production
    }

    // Prepare user object to send in response (without password)
    const userResponse = {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
    };

    res.status(statusCode)
        .cookie('token', token, cookieOptions) // Optional: Store token in an HTTPOnly cookie
        .json({
            success: true,
            token, // Also send token in body for flexibility (e.g., mobile apps)
            user: userResponse
        });
};


// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.registerUser = async (req, res, next) => {
    // Handle validation errors from express-validator middleware (if used in routes)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { username, email, password, role } = req.body; // Role can be optional

    try {
        // Check if user already exists (by username or email)
        let user = await User.findOne({ $or: [{ email }, { username }] });
        if (user) {
            let field = user.email === email ? 'Email' : 'Username';
            return res.status(400).json({ success: false, message: `${field} already exists` });
        }

        // Create user
        user = await User.create({
            username,
            email,
            password,
            role: role || 'student' // Default to 'student' if role is not provided
        });

        // Don't send token immediately on register, or do - depends on UX preference
        // For now, just send success message. User can then login.
        // Or, send token response to auto-login:
        // sendTokenResponse(user, 201, res);

        res.status(201).json({
            success: true,
            message: 'User registered successfully. Please login.',
            // data: { id: user._id, username: user.username, email: user.email, role: user.role } // Optionally return user data
        });

    } catch (error) {
        console.error('Error during user registration:', error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages.join(' ') });
        }
        res.status(500).json({ success: false, message: 'Server Error during registration' });
        // next(error); // Or pass to global error handler
    }
};


// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.loginUser = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { loginIdentifier, password } = req.body; // loginIdentifier can be username or email

    if (!loginIdentifier || !password) {
        return res.status(400).json({ success: false, message: 'Please provide username/email and password' });
    }

    try {
        // Find user by email or username and explicitly select the password field
        const user = await User.findOne({
            $or: [{ email: loginIdentifier.toLowerCase() }, { username: loginIdentifier }]
        }).select('+password');

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Check if password matches
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Password matches, send token response
        sendTokenResponse(user, 200, res);

    } catch (error) {
        console.error('Error during user login:', error);
        res.status(500).json({ success: false, message: 'Server Error during login' });
        // next(error);
    }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private (requires token)
exports.getMe = async (req, res, next) => {
    // req.user is set by the 'protect' middleware
    try {
        // req.user should contain the user document (without password)
        // If you only stored ID in req.user, fetch again:
        // const user = await User.findById(req.user.id);
        // if (!user) {
        //    return res.status(404).json({ success: false, message: 'User not found' });
        // }
        
        // Assuming req.user already has the necessary fields (id, username, email, role)
        // as populated by the protect middleware when it fetched the user.
        if (!req.user) { // Should not happen if protect middleware is working
             return res.status(401).json({ success: false, message: 'Not authorized, user data unavailable.' });
        }

        res.status(200).json({
            success: true,
            data: { // Send only necessary, non-sensitive user data
                _id: req.user._id,
                username: req.user.username,
                email: req.user.email,
                role: req.user.role
            }
        });
    } catch (error) {
        console.error('Error in getMe:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};


// @desc    Log user out / clear cookie
// @route   GET /api/auth/logout
// @access  Private (or Public if just clearing client-side token)
exports.logoutUser = async (req, res, next) => {
    // If using cookies for token storage, clear the cookie
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000), // Expire in 10 seconds
        httpOnly: true
    });

    res.status(200).json({
        success: true,
        data: {},
        message: 'User logged out successfully'
    });
};