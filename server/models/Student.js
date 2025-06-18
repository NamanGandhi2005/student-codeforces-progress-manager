// server/models/Student.js
const mongoose = require('mongoose');

// Sub-schema for individual submissions
const SubmissionSchema = new mongoose.Schema({
    // --- MODIFICATION: Removed unique:true from id in sub-schema to resolve E11000 on nulls ---
    // The global uniqueness of a submission ID is less important than a student's list of submissions.
    // If a specific submission ID needs to be unique across ALL students, that's a different indexing strategy.
    id: { type: Number, required: true }, // Submission ID from Codeforces
    contestId: Number,
    problemName: String,
    problemIndex: String,
    programmingLanguage: String,
    verdict: String,
    rating: Number, // Problem rating
    tags: [String],
    creationTimeSeconds: { type: Number, index: true }, // Timestamp of submission
}, { _id: false });

// Sub-schema for contest participation history
const ContestSchema = new mongoose.Schema({
    contestId: { type: Number, index: true },
    contestName: String,
    handle: String, // User's handle at the time of contest (CF API provides this)
    rank: Number,
    oldRating: Number,
    newRating: Number,
    ratingUpdatedAtSeconds: { type: Number, index: true },
    // --- NEW FIELDS TO STORE PROBLEM COUNT DETAILS ---
    problemsSolvedByUser: {
        type: Number,
        default: 0
    },
    totalProblemsInContest: {
        type: Number,
        default: 0
    },
    // Optional: Can be derived on the frontend: totalProblemsInContest - problemsSolvedByUser
    // unsolvedProblemsByUser: Number,
    contestDetailsSynced: { // Flag to indicate if problemsSolved/totalProblems have been fetched
        type: Boolean,
        default: false
    }
}, { _id: false });

const StudentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Student name is required.'],
        trim: true,
    },
    email: {
        type: String,
        required: [true, 'Student email is required.'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/\S+@\S+\.\S+/, 'Please use a valid email address.'],
    },
    phone: {
        type: String,
        trim: true,
    },
    codeforcesHandle: {
        type: String,
        required: [true, 'Codeforces handle is required.'],
        unique: true,
        trim: true,
    },
    currentRating: {
        type: Number,
        default: 0,
    },
    maxRating: {
        type: Number,
        default: 0,
    },
    codeforcesData: {
        contests: [ContestSchema], // Array of contest participation records
        submissions: [SubmissionSchema], // Array of submission records
    },
    lastSyncedAt: {
        type: Date,
    },
    emailRemindersEnabled: {
        type: Boolean,
        default: true,
    },
    reminderSentCount: {
        type: Number,
        default: 0,
    },
    lastSubmissionTimestampSeconds: {
        type: Number,
        index: true,
    },
    syncStatus: {
        type: String,
        enum: ['pending', 'success', 'failed', null],
        default: null,
    },
    syncErrorMessage: {
        type: String,
    }
}, {
    timestamps: true,
});

module.exports = mongoose.model('Student', StudentSchema);