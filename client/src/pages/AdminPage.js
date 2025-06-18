// client/src/pages/AdminPage.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, TextField, Button,
  CircularProgress, Alert, Grid, Snackbar
} from '@mui/material';
import { getCronSettings, updateCronSettings } from '../services/api';

const getDefaultSettings = () => ({ 
  cronSchedule: '', 
  cronTimezone: '' 
});

const AdminPage = () => {
  const [currentSettings, setCurrentSettings] = useState(getDefaultSettings());
  const [formSettings, setFormSettings] = useState(getDefaultSettings());

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [formErrors, setFormErrors] = useState({}); // For individual field errors

  const fetchSettings = useCallback(async () => {
    // ... (fetchSettings logic remains the same as your correct version)
    setLoading(true); setError(null); setFormErrors({});
    try {
      const data = await getCronSettings();
      if (data && typeof data === 'object' && data.cronSchedule !== undefined && data.cronTimezone !== undefined) {
        setCurrentSettings(data); setFormSettings(data);
      } else {
        console.warn('AdminPage: Received invalid or null data from getCronSettings:', data);
        setError('Could not load settings properly. Data might be missing or malformed.');
        setCurrentSettings(getDefaultSettings()); setFormSettings(getDefaultSettings());
      }
    } catch (err) {
      console.error("AdminPage fetchSettings error:", err);
      let errorMessage = 'Failed to fetch cron settings.';
      if (err && err.message) { errorMessage = err.message; } else if (typeof err === 'string') { errorMessage = err; }
      setError(errorMessage + " Please ensure you are logged in as an admin.");
      setCurrentSettings(getDefaultSettings()); setFormSettings(getDefaultSettings());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormSettings(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) { // Clear error for this field when user types
        setFormErrors(prev => ({...prev, [name]: null}));
    }
    setError(null); // Clear general API error when user types
  };

  // --- IMPLEMENTED validateForm ---
  const validateForm = () => {
    const newErrors = {};
    if (!formSettings.cronSchedule.trim()) {
        newErrors.cronSchedule = "Cron schedule pattern is required.";
    } else {
        // Basic client-side check for cron format (5 or 6 space-separated parts)
        const parts = formSettings.cronSchedule.trim().split(/\s+/);
        if (parts.length < 5 || parts.length > 6) {
            newErrors.cronSchedule = "Invalid cron pattern format (e.g., '0 2 * * *' or '* * * * * *').";
        }
        // More robust validation is handled by node-cron on the backend
    }
    if (!formSettings.cronTimezone.trim()) {
        newErrors.cronTimezone = "Timezone is required.";
    }
    // A more robust timezone validation could use a library like moment-timezone,
    // but for now, we rely on backend validation for specific IANA names.

    setFormErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    console.log("AdminPage: validateForm() called. Is valid?", isValid, "Errors:", newErrors); // Debug log
    return isValid;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    console.log("AdminPage: handleSubmit called"); // Debug log

    if (!validateForm()) {
      console.log("AdminPage: Form validation failed"); // Debug log
      return; 
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage('');
    try {
      const dataToSubmit = {
        cronSchedule: formSettings.cronSchedule.trim(),
        cronTimezone: formSettings.cronTimezone.trim(),
      };
      // Only send fields if they have values, to let backend potentially use defaults if fields are cleared
      // However, our text fields are marked "required" in this form, so they should have values if validateForm passes.
      // If you make them optional, this logic might be useful:
      // if (!dataToSubmit.cronSchedule) delete dataToSubmit.cronSchedule;
      // if (!dataToSubmit.cronTimezone) delete dataToSubmit.cronTimezone;

      console.log("AdminPage: Submitting data to updateCronSettings:", dataToSubmit); // Debug log
      const responseData = await updateCronSettings(dataToSubmit);
      console.log("AdminPage: Response from updateCronSettings API:", responseData); // Debug log

      setSuccessMessage(responseData.message || 'Cron settings updated successfully!');
      if (responseData.data && typeof responseData.data === 'object') {
        setCurrentSettings(responseData.data);
        setFormSettings(responseData.data); // Reset form to newly saved values
      } else {
        console.warn("AdminPage: updateCronSettings response did not contain expected data field. Re-fetching settings.");
        fetchSettings(); // Re-fetch if backend doesn't return the full updated object in 'data'
      }
    } catch (err) {
      console.error("AdminPage: Error in handleSubmit during API call:", err); // Debug log
      setError(err.message || 'Failed to update cron settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') return;
    setSuccessMessage('');
  };

  if (loading) { /* ... (loading UI) ... */ }

  return (
    <Paper elevation={3} sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Admin Settings - Cron Job Configuration
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      
      <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6">Current Settings</Typography>
            <Typography>Schedule: <strong>{currentSettings.cronSchedule || 'N/A'}</strong></Typography>
            <Typography>Timezone: <strong>{currentSettings.cronTimezone || 'N/A'}</strong></Typography>
          </Grid>
          <Grid item xs={12}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="cronSchedule"
              label="Cron Schedule Pattern (e.g., '0 2 * * *')"
              name="cronSchedule"
              value={formSettings.cronSchedule}
              onChange={handleChange}
              error={!!formErrors.cronSchedule} // Show error state if formErrors.cronSchedule exists
              helperText={formErrors.cronSchedule || "Standard cron format. Seconds are optional."}
              disabled={isSaving}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="cronTimezone"
              label="Timezone (e.g., 'America/New_York', 'Etc/UTC')"
              name="cronTimezone"
              value={formSettings.cronTimezone}
              onChange={handleChange}
              error={!!formErrors.cronTimezone} // Show error state if formErrors.cronTimezone exists
              helperText={formErrors.cronTimezone || "Valid IANA timezone name."}
              disabled={isSaving}
            />
          </Grid>
          <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="submit" variant="contained" disabled={isSaving} sx={{ position: 'relative' }}>
              Update Settings
              {isSaving && ( <CircularProgress size={24} sx={{color: 'primary.contrastText', position: 'absolute',top: '50%',left: '50%',marginTop: '-12px',marginLeft: '-12px',}}/> )}
            </Button>
          </Grid>
        </Grid>
      </Box>
      <Snackbar open={!!successMessage} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleCloseSnackbar} severity="success" variant="filled" sx={{ width: '100%' }}>{successMessage}</Alert>
      </Snackbar>
    </Paper>
  );
};

export default AdminPage;