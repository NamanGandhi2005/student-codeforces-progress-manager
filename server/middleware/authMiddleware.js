// server/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // To fetch user details from DB

// Protect routes: Verify token and attach user to req object
exports.protect = async (req, res, next) => {
    let token;

    // Check for token in Authorization header (Bearer token)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    // Else, check for token in cookies (if you chose to use cookies primarily)
    // else if (req.cookies && req.cookies.token) {
    //     token = req.cookies.token;
    // }

    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Fetch user from DB using ID from token, excluding password
        // req.user will be available in subsequent protected routes
        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
            // This case handles if a token is valid but the user has been deleted
            return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
        }

        next(); // Proceed to the next middleware or route handler
    } catch (error) {
        console.error('Token verification error:', error.message);
        // Handle specific JWT errors
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ success: false, message: 'Not authorized, token invalid' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Not authorized, token expired' });
        }
        // For other errors
        return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
};


// Grant access to specific roles
// Example usage: authorize('admin') or authorize('admin', 'publisher')
exports.authorize = (...roles) => { // Takes a list of allowed roles
    return (req, res, next) => {
        // req.user should be set by the 'protect' middleware
        if (!req.user || !req.user.role) {
            // This should ideally be caught by 'protect' first if user is not authenticated
            return res.status(401).json({ success: false, message: 'User role not available, authorization check failed.' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ // 403 Forbidden
                success: false,
                message: `User role '${req.user.role}' is not authorized to access this route`
            });
        }
        next(); // Role is authorized, proceed
    };
};