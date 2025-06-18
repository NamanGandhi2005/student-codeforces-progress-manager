// client/src/pages/StudentListPage.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Button,
  Snackbar,
  Switch // Added Switch import
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

import { getAllStudents, downloadStudentsCSV, addStudent, updateStudent, deleteStudent } from '../services/api';
import { format } from 'date-fns';

import StudentFormDialog from '../components/student/StudentFormDialog';
import ConfirmationDialog from '../components/common/ConfirmationDialog';

const StudentListPage = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const [openFormDialog, setOpenFormDialog] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [deletingStudentId, setDeletingStudentId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchStudents = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    setError(null);
    try {
      const data = await getAllStudents();
      setStudents(data || []);
    } catch (err) {
      setError(err.message || 'An unexpected error occurred while fetching students.');
      setStudents([]);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents(true);
  }, [fetchStudents]);

  const handleDownloadCSV = async () => { /* ... (keep existing) ... */
    setError(null); try { await downloadStudentsCSV(); setSuccessMessage('CSV download started.'); } catch (csvError) { setError(csvError.message || 'Failed to download CSV.'); }
  };
  const handleOpenAddDialog = () => { /* ... (keep existing) ... */
    setError(null); setEditingStudent(null); setOpenFormDialog(true);
  };
  const handleOpenEditDialog = (studentToEdit) => { /* ... (keep existing) ... */
    setError(null); setEditingStudent(studentToEdit); setOpenFormDialog(true);
  };
  const handleCloseFormDialog = () => { /* ... (keep existing) ... */
    setOpenFormDialog(false); setEditingStudent(null);
  };

  const handleSaveStudent = async (formData, studentId) => {
    setIsSaving(true);
    const dataToSave = { ...formData }; // formData from dialog now includes emailRemindersEnabled
    try {
      if (studentId) {
        const updated = await updateStudent(studentId, dataToSave);
        setStudents(prevStudents =>
          prevStudents.map(s => (s._id === studentId ? { ...s, ...updated } : s))
        );
        setSuccessMessage('Student updated successfully!');
      } else {
        await addStudent(dataToSave);
        await fetchStudents(); 
        setSuccessMessage('Student added successfully!');
      }
      handleCloseFormDialog();
    } catch (apiError) {
      console.error('Error saving student in Page:', apiError);
      throw apiError;
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenDeleteConfirm = (id) => { /* ... (keep existing) ... */
    setError(null); setDeletingStudentId(id);
  };
  const handleCloseDeleteConfirm = () => { /* ... (keep existing) ... */
    setDeletingStudentId(null);
  };
  const confirmDeleteStudent = async () => { /* ... (keep existing) ... */
    if (deletingStudentId) { setIsDeleting(true); setError(null); try { await deleteStudent(deletingStudentId); setSuccessMessage('Student deleted successfully!'); setStudents(prevStudents => prevStudents.filter(s => s._id !== deletingStudentId)); } catch (err) { setError(err.message || 'Failed to delete student.'); } finally { setIsDeleting(false); setDeletingStudentId(null); } }
  };
  const handleCloseSnackbar = (event, reason) => { /* ... (keep existing) ... */
    if (reason === 'clickaway') return; setSuccessMessage('');
  };

  // --- HANDLER FOR QUICK TOGGLE OF EMAIL REMINDERS ---
  const handleToggleEmailReminder = async (studentToToggle) => {
    const updatedStatus = !(studentToToggle.emailRemindersEnabled === undefined ? true : studentToToggle.emailRemindersEnabled);
    
    // Optimistic UI update
    setStudents(prevStudents =>
      prevStudents.map(s =>
        s._id === studentToToggle._id ? { ...s, emailRemindersEnabled: updatedStatus } : s
      )
    );
    setSuccessMessage('');
    setError(null);

    try {
      await updateStudent(studentToToggle._id, { emailRemindersEnabled: updatedStatus });
      setSuccessMessage(`Email reminders ${updatedStatus ? 'enabled' : 'disabled'} for ${studentToToggle.name}.`);
    } catch (err) {
      setError(`Failed to update email reminder for ${studentToToggle.name}.`);
      setStudents(prevStudents => // Revert on error
        prevStudents.map(s =>
          s._id === studentToToggle._id ? { ...s, emailRemindersEnabled: !updatedStatus } : s
        )
      );
    }
  };

  if (loading) { /* ... (loading display) ... */ }

  return (
    <Paper elevation={3} sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ mb: { xs: 2, md: 0 } }}>Student List</Typography>
        <Box sx={{ display: 'flex', gap: 1, mt: { xs: 1, md: 0 } }}>
            <Button variant="outlined" color="secondary" onClick={handleDownloadCSV} disabled={students.length === 0}>Download CSV</Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAddDialog}>Add Student</Button>
        </Box>
      </Box>

      {error && ( <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert> )}
      {!loading && students.length === 0 && !error && ( <Alert severity="info" sx={{mt: 2}}>No students found. Click "Add Student" to get started!</Alert> )}

      {students.length > 0 && (
        <TableContainer component={Paper} variant="outlined" sx={{mt: error || students.length === 0 ? 2 : 0 }}>
          {/* Increased minWidth to accommodate more columns */}
          <Table sx={{ minWidth: 1000 }} aria-label="students table"> 
            <TableHead sx={{ backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'grey.800' : 'grey.200' }}>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>CF Handle</TableCell>
                <TableCell align="right">Current Rating</TableCell>
                <TableCell align="right">Max Rating</TableCell>
                {/* --- NEW COLUMN FOR REMINDER COUNT --- */}
                <TableCell align="center" sx={{whiteSpace: 'nowrap'}}>Reminders Sent</TableCell>
                {/* --- NEW COLUMN FOR REMINDER TOGGLE --- */}
                <TableCell align="center" sx={{whiteSpace: 'nowrap'}}>Email Reminders</TableCell>
                <TableCell>Last Synced</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {students.map((student) => (
                <TableRow
                  key={student._id}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': { backgroundColor: 'action.hover' } }}
                >
                  <TableCell component="th" scope="row">{student.name}</TableCell>
                  <TableCell>{student.email}</TableCell>
                  <TableCell>{student.phone || 'N/A'}</TableCell>
                  <TableCell>
                    <a href={`https://codeforces.com/profile/${student.codeforcesHandle}`} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
                        {student.codeforcesHandle}
                    </a>
                  </TableCell>
                  <TableCell align="right">{student.currentRating || 0}</TableCell>
                  <TableCell align="right">{student.maxRating || 0}</TableCell>
                  {/* --- NEW CELL FOR REMINDER COUNT --- */}
                  <TableCell align="center">{student.reminderSentCount || 0}</TableCell>
                  {/* --- NEW CELL WITH SWITCH --- */}
                  <TableCell align="center" sx={{py:0}}> {/* Reduced padding y for switch cell */}
                    <Tooltip title={ (student.emailRemindersEnabled === undefined ? true : student.emailRemindersEnabled) ? "Disable Reminders" : "Enable Reminders"}>
                      <Switch
                        checked={student.emailRemindersEnabled === undefined ? true : student.emailRemindersEnabled}
                        onChange={() => handleToggleEmailReminder(student)}
                        size="small"
                        color="primary"
                        onClick={(e) => e.stopPropagation()} // Prevent row click if any
                      />
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    {student.lastSyncedAt ? format(new Date(student.lastSyncedAt), 'PPp') : 'Never'}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="View Details"><IconButton size="small" aria-label="view details" color="primary" component={RouterLink} to={`/student/${student._id}`}><VisibilityIcon fontSize="inherit" /></IconButton></Tooltip>
                    <Tooltip title="Edit Student"><IconButton size="small" aria-label="edit student" color="secondary" onClick={() => handleOpenEditDialog(student)}><EditIcon fontSize="inherit" /></IconButton></Tooltip>
                    <Tooltip title="Delete Student"><IconButton size="small" aria-label="delete student" color="error" onClick={() => handleOpenDeleteConfirm(student._id)}><DeleteIcon fontSize="inherit" /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <StudentFormDialog open={openFormDialog} onClose={handleCloseFormDialog} onSave={handleSaveStudent} student={editingStudent} isSaving={isSaving} />
      <ConfirmationDialog open={!!deletingStudentId} onClose={handleCloseDeleteConfirm} onConfirm={confirmDeleteStudent} title="Confirm Deletion" message={`Are you sure you want to delete this student? This action cannot be undone.`} confirmText="Delete" isPerformingAction={isDeleting} />
      <Snackbar open={!!successMessage} autoHideDuration={4000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}><Alert onClose={handleCloseSnackbar} severity="success" variant="filled" sx={{ width: '100%' }}>{successMessage}</Alert></Snackbar>
    </Paper>
  );
};

export default StudentListPage;