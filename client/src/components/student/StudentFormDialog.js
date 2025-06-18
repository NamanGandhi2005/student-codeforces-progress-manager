// client/src/components/student/StudentFormDialog.js
import React, { useState, useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Grid,
  CircularProgress,
  Alert
} from '@mui/material';

const StudentFormDialog = ({ open, onClose, onSave, student, isSaving }) => {
  const initialFormState = {
    name: '',
    email: '',
    phone: '',
    codeforcesHandle: '',
  };

  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({}); // For field-specific validation errors
  const [formError, setFormError] = useState(''); // For general form submission errors

  // If a student object is passed (for editing), populate the form
  useEffect(() => {
    if (student) {
      setFormData({
        name: student.name || '',
        email: student.email || '',
        phone: student.phone || '',
        codeforcesHandle: student.codeforcesHandle || '',
      });
      setErrors({}); // Clear previous errors when editing a new student
      setFormError('');
    } else {
      setFormData(initialFormState); // Reset for adding a new student
      setErrors({});
      setFormError('');
    }
  }, [student, open]); // Re-populate form when 'student' or 'open' state changes

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
    // Clear specific field error on change
    if (errors[name]) {
      setErrors(prevErrors => ({ ...prevErrors, [name]: null }));
    }
    setFormError(''); // Clear general form error on any change
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!formData.codeforcesHandle.trim()) {
      newErrors.codeforcesHandle = 'Codeforces Handle is required';
    }
    // Phone is optional, add validation if needed (e.g., format)
    // if (formData.phone.trim() && !/^\d{10}$/.test(formData.phone)) {
    //   newErrors.phone = 'Phone number must be 10 digits';
    // }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0; // Return true if no errors
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(''); // Clear previous general error
    if (!validateForm()) {
      return;
    }
    try {
      await onSave(formData, student?._id); // Pass student ID if editing
      // onClose(); // Let the parent component handle closing on success
    } catch (error) {
        // The error object thrown by api.js should have a message
        setFormError(error.message || 'An error occurred. Please try again.');
        console.error("Form submission error:", error);
    }
  };

  const handleDialogClose = () => {
    if (isSaving) return; // Prevent closing while saving
    onClose();
    // No need to reset form here if useEffect handles it based on 'open' and 'student'
  };

  return (
    <Dialog open={open} onClose={handleDialogClose} maxWidth="sm" fullWidth>
      <DialogTitle>{student ? 'Edit Student' : 'Add New Student'}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                autoFocus
                margin="dense"
                name="name"
                label="Full Name"
                type="text"
                fullWidth
                variant="outlined"
                value={formData.name}
                onChange={handleChange}
                error={!!errors.name}
                helperText={errors.name}
                disabled={isSaving}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                name="email"
                label="Email Address"
                type="email"
                fullWidth
                variant="outlined"
                value={formData.email}
                onChange={handleChange}
                error={!!errors.email}
                helperText={errors.email}
                disabled={isSaving}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                name="phone"
                label="Phone Number (Optional)"
                type="tel"
                fullWidth
                variant="outlined"
                value={formData.phone}
                onChange={handleChange}
                error={!!errors.phone}
                helperText={errors.phone}
                disabled={isSaving}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                margin="dense"
                name="codeforcesHandle"
                label="Codeforces Handle"
                type="text"
                fullWidth
                variant="outlined"
                value={formData.codeforcesHandle}
                onChange={handleChange}
                error={!!errors.codeforcesHandle}
                helperText={errors.codeforcesHandle}
                disabled={isSaving}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: '16px 24px' }}>
          <Button onClick={handleDialogClose} color="inherit" disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" color="primary" disabled={isSaving}>
            {isSaving ? <CircularProgress size={24} color="inherit" /> : (student ? 'Save Changes' : 'Add Student')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default StudentFormDialog;