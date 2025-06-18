// server/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // For password hashing

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Please provide a username'],
        unique: true, // Ensure usernames are unique
        trim: true,
        minlength: [3, 'Username must be at least 3 characters long']
    },
    email: {
        type: String,
        required: [true, 'Please provide an email address'],
        unique: true, // Ensure emails are unique
        trim: true,
        lowercase: true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'Please provide a valid email address'
        ]
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: [6, 'Password must be at least 6 characters long'],
        select: false // By default, do not return password when querying users
    },
    role: {
        type: String,
        enum: ['student', 'admin'], // Define allowed roles
        default: 'student'         // Default role for new users
    },
    // Optional: Link to a Student document if users are directly tied to student profiles
    // studentProfileId: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'Student',
    //     required: function() { return this.role === 'student'; } // Only required if role is student
    // },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Mongoose Middleware: Hash password before saving a new user
UserSchema.pre('save', async function(next) {
    // Only run this function if password was actually modified (or is new)
    if (!this.isModified('password')) {
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(10); // Generate salt
        this.password = await bcrypt.hash(this.password, salt); // Hash password
        next();
    } catch (error) {
        next(error); // Pass error to next middleware/error handler
    }
});

// Mongoose Method: Compare entered password with the hashed password in the database
UserSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// We will generate JWTs in the controller, not directly as a model method for now.
// UserSchema.methods.getSignedJwtToken = function() { ... };

module.exports = mongoose.model('User', UserSchema);