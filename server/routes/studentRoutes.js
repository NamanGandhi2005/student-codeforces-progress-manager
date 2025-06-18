// server/routes/studentRoutes.js
const express = require('express');
const router = express.Router();

const {
    getAllStudents,
    getStudentById,
    addStudent,
    updateStudent,
    deleteStudent,
    downloadStudentsCSV
} = require('../controllers/studentController');

// --- IMPORT AUTH MIDDLEWARE ---
const { protect, authorize } = require('../middleware/authMiddleware');

// Define routes

// --- Routes accessible by any authenticated user (student or admin) ---
router.route('/')
    .get(protect, getAllStudents) // All authenticated users can get student list
    .post(protect, authorize('admin'), addStudent); // Only admins can add students

router.route('/csv')
    .get(protect, downloadStudentsCSV); // All authenticated users can download CSV

router.route('/:id')
    .get(protect, getStudentById) // All authenticated users can get a specific student
    .put(protect, authorize('admin'), updateStudent) // Only admins can update students
    .delete(protect, authorize('admin'), deleteStudent); // Only admins can delete students

module.exports = router;