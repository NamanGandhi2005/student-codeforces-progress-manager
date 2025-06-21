// client/src/pages/StudentProfilePage.js
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Grid,
  Divider,
  Button,
  Avatar,
  Chip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getStudentById } from '../services/api';
import { format } from 'date-fns';

import ContestHistory from '../components/student/ContestHistory';
import ProblemSolvingData from '../components/student/ProblemSolvingData';

const POLLING_INTERVAL = 15000; // Poll every 15 seconds

const StudentProfilePage = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true); // For initial page load
  const [error, setError] = useState(null);
  // isPolling state is implicitly managed by student.syncStatus === 'pending' for interval setup

  const fetchStudentData = useCallback(async (isInitialLoad = false) => {
    if (!studentId) return;

    if (isInitialLoad) { // Only set main loading for the very first fetch
        setLoading(true);
    }
    // For subsequent polls or refreshes, we might not want a full page loader,
    // the UI will just update with new data.
    setError(null); 

    try {
      const data = await getStudentById(studentId);
      setStudent(data); // This will re-render children with new student data
    } catch (err) {
      setError(err.message || `Failed to fetch student profile for ID: ${studentId}`);
      console.error("Fetch student data error:", err);
      // If fetching fails, we should probably stop polling for this student
      // (student.syncStatus won't be 'pending' if 'student' becomes null due to error)
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  }, [studentId]);

  // Initial data fetch on component mount or when studentId changes
  useEffect(() => {
    fetchStudentData(true); // true indicates it's the initial load
  }, [fetchStudentData, studentId]); // fetchStudentData is memoized, studentId ensures re-fetch if ID changes


  // Polling effect: Re-fetch student data if their overall sync is pending
  useEffect(() => {
    let intervalId = null;

    if (student?.syncStatus === 'pending') {
      console.log(`[StudentProfilePage] Sync is pending for ${student.name}. Starting polling.`);
      intervalId = setInterval(() => {
        console.log(`[StudentProfilePage] Polling for updates for ${student.name}...`);
        fetchStudentData(false); // Fetch without setting the main `loading` state
      }, POLLING_INTERVAL);
    } else {
      // If syncStatus is not 'pending' (e.g., 'success', 'failed', or student is null), clear interval
      if (intervalId) { // This check might be redundant if intervalId is always cleared correctly
        console.log(`[StudentProfilePage] Sync no longer pending for ${student?.name || studentId}. Stopping polling.`);
        clearInterval(intervalId);
      }
    }

    return () => { // Cleanup function for when component unmounts or dependencies change
      if (intervalId) {
        console.log(`[StudentProfilePage] Clearing polling interval on cleanup for ${student?.name || studentId}.`);
        clearInterval(intervalId);
      }
    };
  }, [student?.syncStatus, student?.name, studentId, fetchStudentData]); // Re-run if syncStatus or studentId changes


  // Initial loading state before any student data is fetched
  if (loading && !student) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
        <CircularProgress /> <Typography sx={{ ml: 2 }}>Loading student profile...</Typography>
      </Box>
    );
  }

  // Error state if initial fetch failed catastrophically
  if (error && !student) {
    return (
      <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => { setError(null); navigate('/'); }}> {/* Provide option to go back */}
          {error}
        </Alert>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/')}>
            Back to Student List
        </Button>
      </Paper>
    );
  }

  // If student data couldn't be fetched at all after loading (and no specific error was set, unlikely but defensive)
  if (!student && !loading) {
    return (
      <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6">Student data could not be loaded.</Typography>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/')} sx={{mt: 2}}>
            Back to Student List
        </Button>
      </Paper>
    );
  }
  
  // Render page with available student data, even if some fields are defaults
  return (
    <Paper elevation={3} sx={{ p: { xs: 2, md: 3 } }}>
      <Button
        variant="outlined"
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/')}
        sx={{ mb: 2 }}
      >
        Back to List
      </Button>

      {/* Display general page error if occurred after initial load (e.g. during poll) */}
      {error && student && (
         <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError(null)}>
            Could not refresh some data: {error}
         </Alert>
      )}

      {/* Display a subtle "Syncing details..." message if overall sync is pending */}
      {student?.syncStatus === 'pending' && (
        <Alert severity="info" icon={<CircularProgress size={20} />} sx={{ mb: 2, alignItems: 'center' }}>
          Student data is currently syncing with Codeforces. Details below will update automatically as they become available.
        </Alert>
      )}
      {student?.syncStatus === 'failed' && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Last full sync attempt failed: {student.syncErrorMessage || "An unknown error occurred."} 
          Some details might be outdated or missing.
        </Alert>
      )}
      
      {/* Render basic info immediately if student object exists */}
      {student && (
        <>
          <Grid container spacing={3} alignItems="center" sx={{ mb: 2 }}>
            <Grid item>
              <Avatar sx={{ bgcolor: 'primary.main', width: 64, height: 64, fontSize: '2rem' }}>
                {student.name ? student.name.charAt(0).toUpperCase() : '?'}
              </Avatar>
            </Grid>
            <Grid item xs>
              <Typography variant="h4" component="h1" gutterBottom>
                {student.name || 'Loading name...'}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                <a 
                  href={`https://codeforces.com/profile/${student.codeforcesHandle}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: 'inherit', textDecoration: 'none' }}
                >
                  @{student.codeforcesHandle}
                </a>
              </Typography>
            </Grid>
          </Grid>

          <Grid container spacing={1} sx={{ mb:3 }}>
            <Grid item xs={12} sm={6} md={4}><Typography variant="body1"><strong>Email:</strong> {student.email}</Typography></Grid>
            <Grid item xs={12} sm={6} md={4}><Typography variant="body1"><strong>Phone:</strong> {student.phone || 'N/A'}</Typography></Grid>
            <Grid item xs={12} sm={6} md={4}><Typography variant="body1"><strong>Rating:</strong> {student.currentRating || 0} (Max: {student.maxRating || 0})</Typography></Grid>
            <Grid item xs={12} sm={6} md={4}><Typography variant="body1"><strong>Last Synced:</strong> {student.lastSyncedAt ? format(new Date(student.lastSyncedAt), 'PPpp') : 'Never'}</Typography></Grid>
            <Grid item xs={12} sm={6} md={4}><Typography variant="body1"><strong>Sync Status:</strong> <Chip label={student.syncStatus || 'N/A'} color={student.syncStatus === 'success' ? 'success' : (student.syncStatus === 'failed' ? 'error' : (student.syncStatus === 'pending' ? 'info' : 'default'))} size="small" /></Typography></Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <ContestHistory 
            contests={student.codeforcesData?.contests || []} 
            studentOverallSyncStatus={student.syncStatus} 
          />

          <ProblemSolvingData submissions={student.codeforcesData?.submissions || []} />
        </>
      )}
    </Paper>
  );
};

export default StudentProfilePage;