// server/controllers/studentController.js
const Student = require('../models/Student');
// --- IMPORT fetchUserInfo from codeforcesAPIService ---
const { fetchAndSaveStudentCFData, fetchUserInfo } = require('../services/codeforcesAPIService');
const { Parser } = require('json2csv');

/**
 * @desc    Get all students
 * @route   GET /api/students
 * @access  Protected (to be updated in routes file)
 */
exports.getAllStudents = async (req, res) => {
    try {
        const students = await Student.find({})
            .sort({ name: 1 })
            .select('-codeforcesData.submissions');

        res.json({
            success: true,
            count: students.length,
            data: students,
        });
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ success: false, message: 'Server Error: Could not fetch students' });
    }
};

/**
 * @desc    Get a single student by ID
 * @route   GET /api/students/:id
 * @access  Protected (to be updated in routes file)
 */
exports.getStudentById = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }
        res.json({ success: true, data: student });
    } catch (error) {
        console.error(`Error fetching student ${req.params.id}:`, error);
        if (error.kind === 'ObjectId') {
             return res.status(400).json({ success: false, message: 'Invalid student ID format' });
        }
        res.status(500).json({ success: false, message: 'Server Error: Could not fetch student' });
    }
};

/**
 * @desc    Add a new student
 * @route   POST /api/students
 * @access  Admin (to be updated in routes file)
 */
exports.addStudent = async (req, res, next) => {
    try {
        const { name, email, phone, codeforcesHandle, emailRemindersEnabled } = req.body; // Added emailRemindersEnabled

        if (!name || !email || !codeforcesHandle) {
            return res.status(400).json({ success: false, message: 'Name, Email, and Codeforces Handle are required.' });
        }

        const trimmedCodeforcesHandle = codeforcesHandle.trim();

        // --- VALIDATE CODEFORCES HANDLE BEFORE CREATING STUDENT ---
        let cfUserInfo;
        try {
            console.log(`[StudentCtrl] Validating CF Handle: ${trimmedCodeforcesHandle}`);
            cfUserInfo = await fetchUserInfo(trimmedCodeforcesHandle);
            console.log(`[StudentCtrl] CF Handle '${trimmedCodeforcesHandle}' validated. User found: ${cfUserInfo.handle}`);
        } catch (cfError) {
            console.error(`[StudentCtrl] CF Handle validation error for '${trimmedCodeforcesHandle}':`, cfError.message);
            let userMessage = `Codeforces handle '${trimmedCodeforcesHandle}' is invalid or an issue occurred while verifying with Codeforces.`;
            if (cfError.message && (cfError.message.includes("User info not found") || cfError.message.includes("not found or API error"))) {
                 userMessage = `Codeforces user '${trimmedCodeforcesHandle}' not found. Please check the handle.`;
            }
            return res.status(400).json({ success: false, message: userMessage });
        }

        const validatedCfHandle = cfUserInfo.handle; // Use the canonical handle from CF

        // Check if email or (validated) handle already exists in DB
        let existingStudent = await Student.findOne({ 
            $or: [
                { email: email.toLowerCase() }, 
                { codeforcesHandle: validatedCfHandle }
            ] 
        });
        if (existingStudent) {
            let field = existingStudent.email.toLowerCase() === email.toLowerCase() ? 'Email' : 'Codeforces Handle';
            return res.status(400).json({ success: false, message: `${field} already exists.` });
        }

        const newStudent = new Student({
            name,
            email: email.toLowerCase(),
            phone,
            codeforcesHandle: validatedCfHandle,
            currentRating: cfUserInfo.rating || 0,
            maxRating: cfUserInfo.maxRating || 0,
            emailRemindersEnabled: typeof emailRemindersEnabled === 'boolean' ? emailRemindersEnabled : true, // Handle incoming value
            syncStatus: 'pending'
        });

        const savedStudent = await newStudent.save();

        fetchAndSaveStudentCFData(savedStudent.codeforcesHandle)
            .then(syncedStudent => {
                if (syncedStudent) {
                    console.log(`[StudentCtrl] Full CF data sync initiated for ${savedStudent.codeforcesHandle}`);
                }
            })
            .catch(err => {
                console.error(`[StudentCtrl] Background CF data sync error for ${savedStudent.codeforcesHandle} (ID: ${savedStudent._id}):`, err.message);
            });

        res.status(201).json({ 
            success: true, 
            data: savedStudent, 
            message: `Student '${savedStudent.name}' added. Full Codeforces data sync initiated.` 
        });

    } catch (error) {
        console.error('[StudentCtrl] Error adding student:', error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'A student with this email or Codeforces handle already exists.' });
        }
        res.status(500).json({ success: false, message: 'Server Error: Could not add student' });
    }
};

/**
 * @desc    Update an existing student
 * @route   PUT /api/students/:id
 * @access  Admin (to be updated in routes file)
 */
exports.updateStudent = async (req, res, next) => {
    try {
        const studentId = req.params.id;
        const updates = req.body;

        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        const oldHandle = student.codeforcesHandle;
        let handleChanged = false;
        let validatedCfHandleOnUpdate = student.codeforcesHandle;

        // --- IF CODEFORCES HANDLE IS BEING UPDATED, VALIDATE IT ---
        if (updates.codeforcesHandle && updates.codeforcesHandle.trim() !== student.codeforcesHandle) {
            const newTrimmedHandle = updates.codeforcesHandle.trim();
            try {
                console.log(`[StudentCtrl] Validating new CF Handle for update: ${newTrimmedHandle}`);
                const cfUserInfo = await fetchUserInfo(newTrimmedHandle);
                console.log(`[StudentCtrl] New CF Handle '${newTrimmedHandle}' validated. Canonical: ${cfUserInfo.handle}`);
                validatedCfHandleOnUpdate = cfUserInfo.handle;

                const existingStudentWithNewHandle = await Student.findOne({ 
                    codeforcesHandle: validatedCfHandleOnUpdate, 
                    _id: { $ne: studentId } 
                });
                if (existingStudentWithNewHandle) {
                    return res.status(400).json({ success: false, message: `Codeforces Handle '${validatedCfHandleOnUpdate}' is already in use by another student.` });
                }
                // Apply validated handle to student object if all checks pass
                student.codeforcesHandle = validatedCfHandleOnUpdate;
                // Also pre-fill rating from this check if handle changed
                student.currentRating = cfUserInfo.rating || student.currentRating; // Keep old if new is 0/undefined
                student.maxRating = Math.max(student.maxRating || 0, cfUserInfo.maxRating || 0); // Update maxRating
                handleChanged = true;
            } catch (cfError) {
                console.error(`[StudentCtrl] New CF Handle validation error for '${newTrimmedHandle}':`, cfError.message);
                let userMessage = `New Codeforces handle '${newTrimmedHandle}' is invalid or an issue occurred during verification.`;
                if (cfError.message && (cfError.message.includes("User info not found") || cfError.message.includes("not found or API error"))) {
                    userMessage = `Codeforces user '${newTrimmedHandle}' not found. Please check the handle.`;
                }
                return res.status(400).json({ success: false, message: userMessage });
            }
        }

        if (updates.name) student.name = updates.name;
        if (updates.email) {
            const newEmail = updates.email.toLowerCase();
            if (newEmail !== student.email.toLowerCase()) {
                const existing = await Student.findOne({ email: newEmail, _id: { $ne: studentId } });
                if (existing) {
                    return res.status(400).json({ success: false, message: 'Email already in use by another student.' });
                }
                student.email = newEmail;
            }
        }
        if (updates.phone) student.phone = updates.phone;
        if (typeof updates.emailRemindersEnabled === 'boolean') {
            student.emailRemindersEnabled = updates.emailRemindersEnabled;
        }
        // currentRating and maxRating primarily updated via sync, but pre-filled if handle changes and validated

        const updatedStudentDoc = await student.save();
        let message = 'Student updated successfully.';

        if (handleChanged) {
            console.log(`[StudentCtrl] Codeforces handle changed for ${updatedStudentDoc.name} to ${updatedStudentDoc.codeforcesHandle}. Triggering re-sync.`);
            // The student document already has the new handle and potentially updated ratings from the fetchUserInfo check.
            // Mark for full sync to get contests/submissions.
             await Student.updateOne({ _id: updatedStudentDoc._id }, { syncStatus: 'pending' });


            fetchAndSaveStudentCFData(updatedStudentDoc.codeforcesHandle)
                .then(syncedStudent => {
                    if (syncedStudent) console.log(`[StudentCtrl] CF data re-sync initiated for new handle ${updatedStudentDoc.codeforcesHandle}`);
                })
                .catch(err => {
                    console.error(`[StudentCtrl] Background CF data re-sync error for ${updatedStudentDoc.codeforcesHandle}:`, err.message);
                });
            message = 'Student updated. CF data re-sync for new handle initiated.';
        }
        
        res.json({ success: true, data: updatedStudentDoc, message });

    } catch (error) {
        console.error(`[StudentCtrl] Error updating student ${req.params.id}:`, error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Update failed: Email or Codeforces Handle would become a duplicate.' });
        }
        if (error.kind === 'ObjectId') {
             return res.status(400).json({ success: false, message: 'Invalid student ID format' });
        }
        res.status(500).json({ success: false, message: 'Server Error: Could not update student' });
    }
};

/**
 * @desc    Delete a student
 * @route   DELETE /api/students/:id
 * @access  Admin (to be updated in routes file)
 */
exports.deleteStudent = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }
        await student.deleteOne();
        res.json({ success: true, message: 'Student deleted successfully' });
    } catch (error) {
        console.error(`Error deleting student ${req.params.id}:`, error);
         if (error.kind === 'ObjectId') {
             return res.status(400).json({ success: false, message: 'Invalid student ID format' });
        }
        res.status(500).json({ success: false, message: 'Server Error: Could not delete student' });
    }
};

/**
 * @desc    Download all student data as CSV
 * @route   GET /api/students/csv
 * @access  Protected (to be updated in routes file)
 */
exports.downloadStudentsCSV = async (req, res) => {
    try {
        const students = await Student.find({})
            .select('name email phone codeforcesHandle currentRating maxRating lastSyncedAt reminderSentCount emailRemindersEnabled createdAt updatedAt')
            .lean();

        if (students.length === 0) {
            return res.status(404).json({ success: false, message: 'No students found to export.' });
        }
        const fields = [
            { label: 'Name', value: 'name'}, { label: 'Email', value: 'email'},
            { label: 'Phone Number', value: 'phone'}, { label: 'Codeforces Handle', value: 'codeforcesHandle'},
            { label: 'Current Rating', value: 'currentRating'}, { label: 'Max Rating', value: 'maxRating'},
            { label: 'Last Synced At', value: (row) => row.lastSyncedAt ? new Date(row.lastSyncedAt).toLocaleString() : 'N/A'},
            { label: 'Reminders Sent', value: 'reminderSentCount'},
            { label: 'Email Reminders Enabled', value: 'emailRemindersEnabled'},
            { label: 'Enrolled At', value: (row) => row.createdAt ? new Date(row.createdAt).toLocaleDateString() : 'N/A' },
        ];
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(students);
        res.header('Content-Type', 'text/csv');
        res.attachment('students_data.csv');
        res.status(200).send(csv);
    } catch (error) {
        console.error('Error exporting students CSV:', error);
        res.status(500).json({ success: false, message: 'Server Error: Could not export CSV' });
    }
};